import test from 'node:test'
import assert from 'node:assert/strict'
import { processJob } from '../src/worker/app'
import type { WorkerDeps } from '../src/worker/app'
import { DEFAULT_LIMITS } from '../src/shared/limits'
import { createMemoryStore } from '../src/shared/memory-store'
import { createStubEngine } from '../src/engine/stub'
import { loadSettings } from '../src/core/settings'
import { bandFor, JD_MAX_CHARS } from '../../../src/lib/matching/config'
import type { Engine, JdMatchResult } from '../src/core/types'
import { TerminalError } from '../src/core/errors'

const T0 = 1_000_000
const POOL = ['p1', 'p2', 'p3']

test.beforeEach(() => { console.log = () => {} })

async function setup(opts: { input?: boolean; engine?: Engine; now?: number } = {}) {
  const store = createMemoryStore()
  if (opts.input !== false) {
    await store.putObject('inputs/j1.json', JSON.stringify({ jobDescriptionId: 'jd1', requirements: [], poolIds: POOL }))
  }
  await store.createJob({
    jobId: 'j1', state: 'QUEUED', createdAt: T0, inputKey: 'inputs/j1.json', settings: loadSettings({}),
    progress: { done: 0, total: POOL.length }, fallbacks: [], record: [], expiresAt: T0 + 1000000,
  })
  const deps: WorkerDeps = {
    store, engine: opts.engine ?? createStubEngine(), limits: DEFAULT_LIMITS,
    now: () => opts.now ?? T0 + 5000, workerId: 'w1',
  }
  return { store, deps }
}

test('unknown job is skipped', async () => {
  const { deps } = await setup()
  assert.equal(await processJob('nope', 1, deps), 'skipped')
})

test('terminal job is skipped', async () => {
  const { store, deps } = await setup()
  await store.finishJob('j1', { state: 'DONE', finishedAt: T0 })
  assert.equal(await processJob('j1', 1, deps), 'skipped')
})

test('job leased by another worker is skipped', async () => {
  const { store, deps } = await setup()
  await store.acquireLease('j1', 'other', T0 + 5000, 200000)
  assert.equal(await processJob('j1', 1, deps), 'skipped')
})

test('missing input fails the job without throwing', async () => {
  const { store, deps } = await setup({ input: false })
  assert.equal(await processJob('j1', 1, deps), 'failed')
  const j = await store.getJob('j1')
  assert.equal(j?.state, 'FAILED')
  assert.equal(j?.errorCode, 'input_missing')
  assert.equal(j?.endToEndMs, 5000)
})

test('normal run writes result file and finishes DONE', async () => {
  const { store, deps } = await setup()
  assert.equal(await processJob('j1', 1, deps), 'done')
  const j = await store.getJob('j1')
  assert.equal(j?.state, 'DONE')
  assert.equal(j?.endToEndMs, 5000)
  assert.deepEqual(j?.modelIds, { fit: 'stub', text: 'stub' })
  assert.equal(j?.promptVersion, 'stub-1')
  assert.equal(j?.progress.done, POOL.length)
  assert.equal(j?.resultKey, 'results/j1.json')
  const out = JSON.parse((await store.getObject('results/j1.json')) as string)
  assert.equal(out.jobId, 'j1')
  assert.equal(out.state, 'DONE')
  assert.equal(out.results.length, POOL.length)
  assert.equal(out.promptVersion, 'stub-1')
  assert.deepEqual(out.modelIds, { fit: 'stub', text: 'stub' })
  assert.equal(out.threshold, j?.settings.threshold)
  assert.equal(out.endToEndMs, 5000)
})

test('failureRate 1 finishes PARTIAL with one fallback per profile', async () => {
  const { store, deps } = await setup({ engine: createStubEngine({ failureRate: 1 }) })
  assert.equal(await processJob('j1', 1, deps), 'done')
  const j = await store.getJob('j1')
  assert.equal(j?.state, 'PARTIAL')
  assert.equal(j?.fallbacks.length, POOL.length)
})

test('a resumed job does not hand checkpointed profiles to the engine again', async () => {
  const { store, deps } = await setup()
  const cp: JdMatchResult = {
    profile_id: 'p1', rank: 0, fit_score: 50, total_score: 50, band: bandFor(50),
    adjustments: [], scoring: { weight: 0, earned: 0, possible: 0 }, must_haves_passed: [], narrative: 'n',
  }
  await store.saveCheckpoint('j1', cp)
  await store.acquireLease('j1', 'dead', T0, 100) // expired by now
  const seen: string[] = []
  const inner = createStubEngine()
  const engine: Engine = {
    ...inner,
    async rank(job, ctx) {
      const wrapped = { ...ctx, async checkpoint(r: JdMatchResult) { seen.push(r.profile_id); await ctx.checkpoint(r) } }
      await inner.rank(job, wrapped)
    },
  }
  assert.equal(await processJob('j1', 2, { ...deps, engine }), 'done')
  assert.deepEqual(seen.sort(), ['p2', 'p3'])
  const j = await store.getJob('j1')
  assert.equal(j?.progress.done, POOL.length)
})

test('engine crash below maxAttempts throws and leaves RUNNING', async () => {
  const { store, deps } = await setup({ engine: createStubEngine({ crash: true }) })
  await assert.rejects(processJob('j1', 1, deps), /stub crash/)
  assert.equal((await store.getJob('j1'))?.state, 'RUNNING')
})

test('engine crash at maxAttempts finishes FAILED and throws', async () => {
  const { store, deps } = await setup({ engine: createStubEngine({ crash: true }) })
  await assert.rejects(processJob('j1', DEFAULT_LIMITS.maxAttempts, deps), /stub crash/)
  const j = await store.getJob('j1')
  assert.equal(j?.state, 'FAILED')
  assert.equal(j?.errorCode, 'engine_error')
  assert.equal(j?.endToEndMs, 5000)
})

const LAST = DEFAULT_LIMITS.maxAttempts

test('malformed input JSON at maxAttempts finishes FAILED input_invalid and throws', async () => {
  const { store, deps } = await setup()
  await store.putObject('inputs/j1.json', '{not json')
  await assert.rejects(processJob('j1', LAST, deps), SyntaxError)
  const j = await store.getJob('j1')
  assert.equal(j?.state, 'FAILED')
  assert.equal(j?.errorCode, 'input_invalid')
})

test('store getObject error at maxAttempts finishes FAILED engine_error and throws', async () => {
  const { store, deps } = await setup()
  const bad = { ...store, getObject: async () => { throw new Error('s3 down') } }
  await assert.rejects(processJob('j1', LAST, { ...deps, store: bad }), /s3 down/)
  const j = await store.getJob('j1')
  assert.equal(j?.state, 'FAILED')
  assert.equal(j?.errorCode, 'engine_error')
})

test('result putObject failure at maxAttempts finishes FAILED', async () => {
  const { store, deps } = await setup()
  const bad = {
    ...store,
    putObject: async (k: string, v: string) => {
      if (k.startsWith('results/')) throw new Error('put failed')
      return store.putObject(k, v)
    },
  }
  await assert.rejects(processJob('j1', LAST, { ...deps, store: bad }), /put failed/)
  assert.equal((await store.getJob('j1'))?.state, 'FAILED')
})

test('storage and input failures below maxAttempts leave RUNNING and throw', async () => {
  const { store, deps } = await setup()
  const bad = { ...store, getObject: async () => { throw new Error('s3 down') } }
  await assert.rejects(processJob('j1', 1, { ...deps, store: bad }), /s3 down/)
  assert.equal((await store.getJob('j1'))?.state, 'RUNNING')
  const s2 = await setup()
  await s2.store.putObject('inputs/j1.json', '{not json')
  await assert.rejects(processJob('j1', 1, s2.deps), SyntaxError)
  assert.equal((await s2.store.getJob('j1'))?.state, 'RUNNING')
})

test('when finishJob throws inside fail the original error propagates', async () => {
  const { store, deps } = await setup()
  const bad = {
    ...store,
    getObject: async () => { throw new Error('original') },
    finishJob: async () => { throw new Error('ddb down') },
  }
  await assert.rejects(processJob('j1', LAST, { ...deps, store: bad }), /original/)
})

test('a TerminalError fails the job at once and does not rethrow', async () => {
  const engine: Engine = {
    modelIds: { embed: 'x' }, promptVersion: 'none',
    async rank() { throw new TerminalError('jd_text_required') },
  }
  const { store, deps } = await setup({ engine })
  assert.equal(await processJob('j1', 1, deps), 'failed')
  const j = await store.getJob('j1')
  assert.equal(j?.state, 'FAILED')
  assert.equal(j?.errorCode, 'jd_text_required')
})

test('a caught retryable error releases the lease, asks for a quick retry and rethrows', async () => {
  const { store, deps } = await setup({ engine: createStubEngine({ crash: true }) })
  let retries = 0
  await assert.rejects(processJob('j1', 1, { ...deps, retrySoon: async () => { retries++ } }), /stub crash/)
  assert.equal(retries, 1)
  const j = await store.getJob('j1')
  assert.equal(j?.state, 'RUNNING')
  assert.equal(await store.acquireLease('j1', 'w2', T0 + 6000, DEFAULT_LIMITS.leaseMs), true)
})

test('no quick retry at maxAttempts, the job fails instead', async () => {
  const { store, deps } = await setup({ engine: createStubEngine({ crash: true }) })
  let retries = 0
  await assert.rejects(
    processJob('j1', DEFAULT_LIMITS.maxAttempts, { ...deps, retrySoon: async () => { retries++ } }),
    /stub crash/,
  )
  assert.equal(retries, 0)
  assert.equal((await store.getJob('j1'))?.state, 'FAILED')
})

test('no quick retry when the lease cannot be released, so the message is not skipped and lost', async () => {
  const { store, deps } = await setup({ engine: createStubEngine({ crash: true }) })
  let retries = 0
  const bad = { ...store, releaseLease: async () => { throw new Error('ddb down') } }
  await assert.rejects(
    processJob('j1', 1, { ...deps, store: bad, retrySoon: async () => { retries++ } }),
    /stub crash/,
  )
  assert.equal(retries, 0)
})

test('a failing quick retry request still rethrows the original error', async () => {
  const { deps } = await setup({ engine: createStubEngine({ crash: true }) })
  await assert.rejects(
    processJob('j1', 1, { ...deps, retrySoon: async () => { throw new Error('sqs down') } }),
    /stub crash/,
  )
})

test('a TerminalError does not ask for a quick retry', async () => {
  const engine: Engine = {
    modelIds: { embed: 'x' }, promptVersion: 'none',
    async rank() { throw new TerminalError('jd_text_required') },
  }
  const { deps } = await setup({ engine })
  let retries = 0
  assert.equal(await processJob('j1', 1, { ...deps, retrySoon: async () => { retries++ } }), 'failed')
  assert.equal(retries, 0)
})

async function withJdSetup(requestText?: string) {
  const r = await setup()
  await r.store.putObject(
    'inputs/j1.json',
    JSON.stringify({ jobDescriptionId: 'jd1', requirements: [], poolIds: POOL, jdText: requestText }),
  )
  return r
}

function spyEngine(seen: (string | undefined)[]): Engine {
  return {
    modelIds: { embed: 'x' }, promptVersion: 'none',
    async rank(job, ctx) {
      seen.push(job.jdText)
      for (const id of job.poolIds) await ctx.fallback(id, 'not_indexed')
    },
  }
}

function captureLogs(): { lines: string[]; restore(): void } {
  const lines: string[] = []
  const prev = console.log
  console.log = (l: string) => { lines.push(l) }
  return { lines, restore: () => { console.log = prev } }
}

test('jobText fills a missing jdText and the engine sees it', async () => {
  const seen: (string | undefined)[] = []
  const { deps } = await withJdSetup()
  const asked: string[] = []
  await processJob('j1', 1, {
    ...deps, engine: spyEngine(seen), jobText: async (id) => { asked.push(id); return 'Looked up text' },
  })
  assert.deepEqual(seen, ['Looked up text'])
  assert.deepEqual(asked, ['jd1'])
})

test('a blank request jdText triggers the lookup', async () => {
  const seen: (string | undefined)[] = []
  const { deps } = await withJdSetup('   ')
  await processJob('j1', 1, { ...deps, engine: spyEngine(seen), jobText: async () => 'Looked up text' })
  assert.deepEqual(seen, ['Looked up text'])
})

test('a request jdText is kept and the lookup is not called', async () => {
  const seen: (string | undefined)[] = []
  const { deps } = await withJdSetup('From request')
  let calls = 0
  await processJob('j1', 1, { ...deps, engine: spyEngine(seen), jobText: async () => { calls++; return 'x' } })
  assert.deepEqual(seen, ['From request'])
  assert.equal(calls, 0)
})

test('a null or blank lookup leaves jdText unset', async () => {
  for (const found of [null, '  ']) {
    const seen: (string | undefined)[] = []
    const { deps } = await withJdSetup()
    await processJob('j1', 1, { ...deps, engine: spyEngine(seen), jobText: async () => found })
    assert.deepEqual(seen, [undefined])
  }
})

test('a lookup error below maxAttempts releases the lease and rethrows', async () => {
  const { store, deps } = await withJdSetup()
  let retries = 0
  await assert.rejects(
    processJob('j1', 1, {
      ...deps, retrySoon: async () => { retries++ }, jobText: async () => { throw new Error('supabase down') },
    }),
    /supabase down/,
  )
  assert.equal(retries, 1)
  assert.equal((await store.getJob('j1'))?.state, 'RUNNING')
  assert.equal(await store.acquireLease('j1', 'w2', T0 + 5000, 200000), true)
})

test('a looked-up text over JD_MAX_CHARS fails the job as jd_text_too_long and does not rethrow', async () => {
  const { store, deps } = await withJdSetup()
  assert.equal(
    await processJob('j1', 1, { ...deps, jobText: async () => 'x'.repeat(JD_MAX_CHARS + 1) }),
    'failed',
  )
  const j = await store.getJob('j1')
  assert.equal(j?.state, 'FAILED')
  assert.equal(j?.errorCode, 'jd_text_too_long')
})

test('job_jd_resolved logs the source once and never the text', async () => {
  const cases: [string | undefined, boolean, string][] = [
    ['From request', true, 'request'],
    [undefined, true, 'lookup'],
    [undefined, false, 'none'],
  ]
  for (const [text, hasLookup, source] of cases) {
    const { deps } = await withJdSetup(text)
    const cap = captureLogs()
    try {
      await processJob('j1', 1, {
        ...deps, engine: spyEngine([]), ...(hasLookup ? { jobText: async () => 'Secret looked up text' } : {}),
      })
    } finally { cap.restore() }
    const events = cap.lines.map((l) => JSON.parse(l)).filter((l) => l.event === 'job_jd_resolved')
    assert.equal(events.length, 1)
    assert.equal(events[0].jdSource, source)
    assert.equal(events[0].jobId, 'j1')
    assert.ok(!cap.lines.join('\n').includes('Secret'))
    assert.ok(!cap.lines.join('\n').includes('From request'))
  }
})

test('job_jd_resolved is not logged when the lookup throws', async () => {
  const { deps } = await withJdSetup()
  const cap = captureLogs()
  try {
    await assert.rejects(processJob('j1', 1, { ...deps, jobText: async () => { throw new Error('boom') } }), /boom/)
  } finally { cap.restore() }
  assert.ok(!cap.lines.some((l) => l.includes('job_jd_resolved')))
})
