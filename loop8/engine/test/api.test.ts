import test from 'node:test'
import assert from 'node:assert/strict'
import { handleApi } from '../src/api/app'
import type { ApiDeps, ApiRequest } from '../src/api/app'
import { DEFAULT_LIMITS } from '../src/shared/limits'
import { createMemoryQueue, createMemoryStore } from '../src/shared/memory-store'
import { loadSettings } from '../src/core/settings'

function setup() {
  const store = createMemoryStore()
  const queue = createMemoryQueue()
  let n = 0
  const deps: ApiDeps = {
    store, queue, settings: loadSettings({}), limits: DEFAULT_LIMITS,
    now: () => Date.parse('2026-11-16T10:00:00Z'), newId: () => `job-${++n}`,
  }
  return { store, queue, deps }
}

const post = (body: unknown, key: string | null = 'k1'): ApiRequest => ({
  method: 'POST', path: '/jobs', headers: key === null ? {} : { 'idempotency-key': key },
  body: typeof body === 'string' || body === null ? body : JSON.stringify(body),
})
const get = (path: string): ApiRequest => ({ method: 'GET', path, headers: {}, body: null })
const valid = { jobDescriptionId: 'jd1', requirements: [], poolIds: ['p2', 'p1'] }

test('POST without idempotency-key gives 400', async () => {
  const { deps } = setup()
  const r = await handleApi(post(valid, null), deps)
  assert.equal(r.status, 400)
  assert.equal((r.body as { error: string }).error, 'missing_idempotency_key')
})

test('invalid body gives 400 and oversized gives 413', async () => {
  const { deps } = setup()
  assert.equal((await handleApi(post('nope'), deps)).status, 400)
  const big = await handleApi(post(valid), { ...deps, limits: { ...DEFAULT_LIMITS, maxBodyBytes: 5 } })
  assert.equal(big.status, 413)
  assert.equal((big.body as { error: string }).error, 'body_too_large')
})

test('valid POST queues the job, stores input and sends once', async () => {
  const { deps, store, queue } = setup()
  const r = await handleApi(post(valid), deps)
  assert.equal(r.status, 202)
  assert.deepEqual(r.body, { jobId: 'job-1', state: 'QUEUED' })
  const stored = JSON.parse(store.objects.get('inputs/job-1.json')!)
  assert.deepEqual(stored.poolIds, ['p1', 'p2'])
  const job = await store.getJob('job-1')
  assert.equal(job?.state, 'QUEUED')
  assert.equal(job?.inputKey, 'inputs/job-1.json')
  assert.deepEqual(job?.settings, deps.settings)
  assert.deepEqual(job?.progress, { done: 0, total: 2 })
  assert.equal(job?.expiresAt, deps.now() + 604800000)
  assert.deepEqual(queue.sent, ['job-1'])
})

test('same key again returns the same job id and creates no second job', async () => {
  const { deps, queue, store } = setup()
  await handleApi(post(valid), deps)
  const r = await handleApi(post(valid), deps)
  assert.equal(r.status, 202)
  assert.deepEqual(r.body, { jobId: 'job-1', state: 'QUEUED' })
  assert.ok(queue.sent.every((id) => id === 'job-1'))
  assert.equal(store.objects.size, 1)
})

test('same pool in a different order stores identical poolIds', async () => {
  const { deps, store } = setup()
  await handleApi(post({ ...valid, poolIds: ['c', 'a', 'b', 'a'] }, 'ka'), deps)
  await handleApi(post({ ...valid, poolIds: ['b', 'c', 'a'] }, 'kb'), deps)
  const a = JSON.parse(store.objects.get('inputs/job-1.json')!).poolIds
  const b = JSON.parse(store.objects.get('inputs/job-2.json')!).poolIds
  assert.deepEqual(a, ['a', 'b', 'c'])
  assert.deepEqual(a, b)
})

test('losing the idempotency race returns the owner and does not send', async () => {
  const { deps, store, queue } = setup()
  await store.createJob({
    jobId: 'other', state: 'RUNNING', createdAt: 1, inputKey: 'i', settings: deps.settings,
    progress: { done: 0, total: 1 }, fallbacks: [], record: [], expiresAt: 9,
  })
  const racing = { ...store, findIdempotent: async () => null, claimIdempotency: async () => 'other' }
  const r = await handleApi(post(valid), { ...deps, store: racing })
  assert.deepEqual(r.body, { jobId: 'other', state: 'RUNNING' })
  assert.deepEqual(queue.sent, [])
})

test('the 101st job of a day gives 429 daily_cap', async () => {
  const { deps } = setup()
  for (let i = 0; i < 100; i++) assert.equal((await handleApi(post(valid, `k${i}`), deps)).status, 202)
  const r = await handleApi(post(valid, 'k100'), deps)
  assert.equal(r.status, 429)
  assert.equal((r.body as { error: string }).error, 'daily_cap')
})

test('GET unknown id gives 404; other routes give 404', async () => {
  const { deps } = setup()
  const g = await handleApi(get('/jobs/nope'), deps)
  assert.equal(g.status, 404)
  assert.equal((g.body as { error: string }).error, 'not_found')
  for (const [method, path] of [['GET', '/'], ['DELETE', '/jobs/x'], ['GET', '/jobs'], ['POST', '/jobs/x']]) {
    assert.equal((await handleApi({ method, path, headers: {}, body: null }, deps)).status, 404, `${method} ${path}`)
  }
})

test('GET returns status, and resultUrl only for finished jobs', async () => {
  const { deps, store } = setup()
  await handleApi(post(valid), deps)
  const q = await handleApi(get('/jobs/job-1/'), deps)
  assert.equal(q.status, 200)
  assert.equal((q.body as { resultUrl?: string }).resultUrl, undefined)
  assert.equal((q.body as { state: string }).state, 'QUEUED')
  await store.finishJob('job-1', {
    state: 'PARTIAL', finishedAt: 5, resultKey: 'results/job-1.json', endToEndMs: 42,
    fallbacks: [{ profileId: 'p1', reason: 'x' }],
  })
  const r = await handleApi(get('/jobs/job-1'), deps)
  assert.deepEqual(r.body, {
    jobId: 'job-1', state: 'PARTIAL', progress: { done: 0, total: 2 }, fallbackCount: 1,
    errorCode: undefined, endToEndMs: 42, resultUrl: 'memory://results/job-1.json',
  })
})

test('a failed putObject after the claim is repaired by a retry with the same key', async () => {
  const { deps, store, queue } = setup()
  let failed = false
  const flaky = {
    ...store,
    putObject: async (k: string, b: string) => {
      if (!failed) { failed = true; throw new Error('boom') }
      return store.putObject(k, b)
    },
  }
  await assert.rejects(handleApi(post(valid), { ...deps, store: flaky }))
  const r = await handleApi(post(valid), { ...deps, store: flaky })
  assert.equal(r.status, 202)
  assert.deepEqual(r.body, { jobId: 'job-1', state: 'QUEUED' })
  assert.deepEqual(queue.sent, ['job-1'])
  assert.ok(store.objects.has('inputs/job-1.json'))
  const g = await handleApi(get('/jobs/job-1'), deps)
  assert.equal(g.status, 200)
})

test('a failed createJob after the claim is repaired by a retry', async () => {
  const { deps, store, queue } = setup()
  let failed = false
  const flaky = {
    ...store,
    createJob: async (j: Parameters<typeof store.createJob>[0]) => {
      if (!failed) { failed = true; throw new Error('boom') }
      return store.createJob(j)
    },
  }
  await assert.rejects(handleApi(post(valid), { ...deps, store: flaky }))
  const r = await handleApi(post(valid), { ...deps, store: flaky })
  assert.deepEqual(r.body, { jobId: 'job-1', state: 'QUEUED' })
  assert.deepEqual(queue.sent, ['job-1'])
  assert.equal((await handleApi(get('/jobs/job-1'), deps)).status, 200)
})

test('a failed queue.send is repaired by a retry that re-sends', async () => {
  const { deps, queue } = setup()
  let failed = false
  const flaky = {
    send: async (id: string) => {
      if (!failed) { failed = true; throw new Error('boom') }
      return queue.send(id)
    },
  }
  await assert.rejects(handleApi(post(valid), { ...deps, queue: flaky }))
  assert.deepEqual(queue.sent, [])
  const r = await handleApi(post(valid), { ...deps, queue: flaky })
  assert.deepEqual(r.body, { jobId: 'job-1', state: 'QUEUED' })
  assert.deepEqual(queue.sent, ['job-1'])
})

test('replaying a RUNNING or DONE job does not send', async () => {
  const { deps, store, queue } = setup()
  await handleApi(post(valid, 'r1'), deps)
  await store.acquireLease('job-1', 'w', deps.now(), 1000)
  const running = await handleApi(post(valid, 'r1'), deps)
  assert.deepEqual(running.body, { jobId: 'job-1', state: 'RUNNING' })
  await store.finishJob('job-1', { state: 'DONE', finishedAt: 2 })
  const done = await handleApi(post(valid, 'r1'), deps)
  assert.deepEqual(done.body, { jobId: 'job-1', state: 'DONE' })
  assert.deepEqual(queue.sent, ['job-1'])
})

test('oversized or invalid body without a key gives 413 or 400 invalid_input', async () => {
  const { deps } = setup()
  const big = await handleApi(post(valid, null), { ...deps, limits: { ...DEFAULT_LIMITS, maxBodyBytes: 5 } })
  assert.equal(big.status, 413)
  const bad = await handleApi(post('nope', null), deps)
  assert.equal(bad.status, 400)
  assert.equal((bad.body as { error: string }).error, 'invalid_input')
})

test('the idempotency header is matched case-insensitively', async () => {
  const { deps } = setup()
  const r = await handleApi({ ...post(valid), headers: { 'Idempotency-Key': 'K' } }, deps)
  assert.equal(r.status, 202)
})

test('idempotency key that is too long or has odd characters gives 400', async () => {
  const { deps } = setup()
  for (const key of ['k'.repeat(129), 'has space', 'bad/key', 'café']) {
    const r = await handleApi(post(valid, key), deps)
    assert.equal(r.status, 400)
    assert.equal((r.body as { error: string }).error, 'invalid_idempotency_key')
  }
  assert.equal((await handleApi(post(valid, 'a'.repeat(128)), deps)).status, 202)
  assert.equal((await handleApi(post(valid, 'A-b_c.d:1'.replace('_', '.')), deps)).status, 202)
})

test('POST /extract is not a route of the api, which calls no model', async () => {
  const { deps } = setup()
  const r = await handleApi({ method: 'POST', path: '/extract', headers: {}, body: '{}' }, deps)
  assert.equal(r.status, 404)
  assert.equal((r.body as { error: string }).error, 'not_found')
})
