import test from 'node:test'
import assert from 'node:assert/strict'
import { processJob } from '../src/worker/app'
import type { WorkerDeps } from '../src/worker/app'
import { DEFAULT_LIMITS } from '../src/shared/limits'
import { createMemoryStore } from '../src/shared/memory-store'
import { createStubEngine } from '../src/engine/stub'
import { loadSettings } from '../src/core/settings'
import { bandFor } from '../../../src/lib/matching/config'
import type { Engine, JdMatchResult } from '../src/core/types'

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
