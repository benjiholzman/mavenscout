import test from 'node:test'
import assert from 'node:assert/strict'
import { createBedrockTextModel, RequestTimeoutError } from '../src/models/text-model'
import { DEFAULT_MAX_DELAY_MS, DEFAULT_RETRIES, isRetryable, isThrottling, REQUEST_TIMEOUT_MS, withRetry } from '../src/stage2/retry'
import { createLimiter, inPool } from '../src/stage2/run-stage2'
import { runEngine } from '../src/core/run'
import { loadSettings } from '../src/core/settings'
import type { Engine, EngineContext } from '../src/core/types'
import { processJob } from '../src/worker/app'
import type { WorkerDeps } from '../src/worker/app'
import { DEFAULT_LIMITS } from '../src/shared/limits'
import { createMemoryStore } from '../src/shared/memory-store'

const req = { modelId: 'm', system: 's', user: 'u', maxTokens: 1 }

// The request timeout.

test('the text model passes an abort signal to the call and clears its timer when the call succeeds', async () => {
  let signal: AbortSignal | undefined
  const client = {
    async send(_cmd: unknown, options?: { abortSignal?: AbortSignal }) {
      signal = options?.abortSignal
      return { output: { message: { content: [{ text: 'ok' }] } }, usage: { inputTokens: 1, outputTokens: 1 } }
    },
  }
  const model = createBedrockTextModel({ client, requestTimeoutMs: 20 })
  assert.equal((await model(req)).text, 'ok')
  assert.ok(signal instanceof AbortSignal)
  // Past the timeout the signal must still be quiet, because the timer was cleared.
  await new Promise((r) => setTimeout(r, 40))
  assert.equal(signal?.aborted, false)
})

test('a call that hangs fails with RequestTimeout, which is retryable and carries no text', async () => {
  const client = {
    send: (_cmd: unknown, options?: { abortSignal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        options?.abortSignal?.addEventListener('abort', () => reject(Object.assign(new Error('SECRET-REQUEST-TEXT'), { name: 'AbortError' })))
      }),
  }
  const model = createBedrockTextModel({ client, requestTimeoutMs: 20 })
  await assert.rejects(model(req), (e: unknown) => {
    assert.ok(e instanceof RequestTimeoutError)
    assert.equal((e as Error).name, 'RequestTimeout')
    assert.equal((e as Error).message, 'request_timeout')
    assert.equal(isRetryable(e), true)
    assert.equal(isThrottling(e), false)
    return true
  })
})

test('withRetry retries a request timeout and returns the next reply', async () => {
  let calls = 0
  const client = {
    send: (_cmd: unknown, options?: { abortSignal?: AbortSignal }) => {
      calls++
      if (calls > 1) return Promise.resolve({ output: { message: { content: [{ text: 'late ok' }] } } })
      return new Promise((_resolve, reject) => {
        options?.abortSignal?.addEventListener('abort', () => reject(new Error('aborted')))
      })
    },
  }
  const model = createBedrockTextModel({ client, requestTimeoutMs: 20 })
  const out = await withRetry(() => model(req), { sleep: async () => {} })
  assert.equal(out.text, 'late ok')
  assert.equal(calls, 2)
})

test('the request timeout default is 25 seconds', () => {
  assert.equal(REQUEST_TIMEOUT_MS, 25_000)
})

// What a retry can fix.

test('isRetryable covers throttling, the transient model errors and the request timeout', () => {
  for (const e of [
    { name: 'ThrottlingException' },
    { name: 'ServiceUnavailableException' },
    { name: 'ModelTimeoutException' },
    { name: 'ModelErrorException' },
    { name: 'RequestTimeout' },
    { $metadata: { httpStatusCode: 408 } },
    { $metadata: { httpStatusCode: 424 } },
    { $metadata: { httpStatusCode: 429 } },
    { $metadata: { httpStatusCode: 503 } },
  ]) assert.equal(isRetryable(e), true, JSON.stringify(e))
  for (const e of [
    { name: 'AccessDeniedException' },
    { name: 'ValidationException' },
    { name: 'ResourceNotFoundException' },
    { $metadata: { httpStatusCode: 400 } },
    { $metadata: { httpStatusCode: 403 } },
    new Error('boom'),
    null,
    'x',
  ]) assert.equal(isRetryable(e), false, String(e))
})

test('isThrottling keeps its meaning: the timeout errors are retryable but are not throttling', () => {
  assert.equal(isThrottling({ name: 'ModelTimeoutException' }), false)
  assert.equal(isThrottling({ $metadata: { httpStatusCode: 408 } }), false)
  assert.equal(isThrottling({ $metadata: { httpStatusCode: 424 } }), false)
})

test('withRetry retries 408 and 424 and does not retry a configuration error', async () => {
  let n = 0
  assert.equal(await withRetry(async () => { if (++n < 3) throw { $metadata: { httpStatusCode: n === 1 ? 408 : 424 } }; return 'ok' }, { sleep: async () => {} }), 'ok')
  assert.equal(n, 3)
  let calls = 0
  await assert.rejects(withRetry(async () => { calls++; throw { name: 'AccessDeniedException' } }, { sleep: async () => {} }))
  assert.equal(calls, 1)
})

// The longer retry.

test('withRetry defaults to 5 retries with each wait capped at 8 seconds', async () => {
  assert.equal(DEFAULT_RETRIES, 5)
  assert.equal(DEFAULT_MAX_DELAY_MS, 8000)
  const waits: number[] = []
  let calls = 0
  await assert.rejects(withRetry(async () => { calls++; throw { name: 'ThrottlingException' } }, { random: () => 1, sleep: async (ms) => { waits.push(ms) } }))
  assert.equal(calls, 6)
  assert.deepEqual(waits, [500, 1000, 2000, 4000, 8000])
})

test('a wait never exceeds maxDelayMs and still takes the jitter', async () => {
  const waits: number[] = []
  await assert.rejects(withRetry(async () => { throw { name: 'ThrottlingException' } }, { retries: 6, baseMs: 500, maxDelayMs: 1500, random: () => 1, sleep: async (ms) => { waits.push(ms) } }))
  assert.deepEqual(waits, [500, 1000, 1500, 1500, 1500, 1500])
  const jittered: number[] = []
  await assert.rejects(withRetry(async () => { throw { name: 'ThrottlingException' } }, { retries: 4, baseMs: 500, maxDelayMs: 1500, random: () => 0.5, sleep: async (ms) => { jittered.push(ms) } }))
  assert.deepEqual(jittered, [250, 500, 750, 750])
})

// Fewer calls in flight after a throttle.

test('the limiter halves the limit after a throttle, at most once every 2 seconds, down to 2', () => {
  let t = 10_000
  const { limit, cut } = createLimiter(16, () => t)
  assert.equal(limit.value, 16)
  cut()
  assert.equal(limit.value, 8)
  cut()
  t += 1999
  cut()
  assert.equal(limit.value, 8)
  t += 1
  cut()
  assert.equal(limit.value, 4)
  t += 2000
  cut()
  assert.equal(limit.value, 2)
  t += 2000
  cut()
  assert.equal(limit.value, 2)
})

test('the limiter never goes under the setting when the setting is below 2, and 0 means 1', () => {
  let t = 0
  const one = createLimiter(1, () => t)
  one.cut()
  assert.equal(one.limit.value, 1)
  const zero = createLimiter(0, () => t)
  assert.equal(zero.limit.value, 1)
  t += 5000
  const three = createLimiter(3, () => t)
  three.cut()
  assert.equal(three.limit.value, 2)
})

test('the pool finishes every item when the limit is cut while it runs', async () => {
  const limit = { value: 4 }
  const done: number[] = []
  let inFlight = 0
  let max = 0
  const items = Array.from({ length: 12 }, (_, i) => i)
  await inPool(items, limit, async (i) => {
    inFlight++
    max = Math.max(max, inFlight)
    if (i === 1) limit.value = 1
    await new Promise((r) => setTimeout(r, 2))
    done.push(i)
    inFlight--
  })
  assert.deepEqual([...done].sort((a, b) => a - b), items)
  assert.ok(max <= 4)
})

test('a slot above the limit takes no new item, and the pool still finishes with a limit of 1', async () => {
  const limit = { value: 3 }
  let inFlight = 0
  let max = 0
  const seen: number[] = []
  await inPool([0, 1, 2, 3, 4, 5], limit, async (i) => {
    // The first item cuts the limit before the other two workers have looked at it.
    if (i === 0) limit.value = 1
    inFlight++
    max = Math.max(max, inFlight)
    await new Promise((r) => setTimeout(r, 2))
    seen.push(i)
    inFlight--
  })
  assert.equal(seen.length, 6)
  assert.equal(max, 1)
})

// The deadline reaches the engine.

test('runEngine passes the deadline to the engine context', async () => {
  let got: number | undefined | 'unset' = 'unset'
  const engine: Engine = {
    modelIds: {},
    promptVersion: 'x',
    async rank(_job, ctx: EngineContext) { got = ctx.deadlineAt },
  }
  const io = { settings: loadSettings({}), existing: [], saveCheckpoint: async () => {}, saveFallback: async () => {} }
  const job = { jobId: 'j', jobDescriptionId: 'jd', requirements: [], poolIds: [] }
  await runEngine(job, engine, { ...io, deadlineAt: 123456 })
  assert.equal(got, 123456)
  await runEngine(job, engine, io)
  assert.equal(got, undefined)
})

test('processJob passes the worker deadline to the engine', async () => {
  const T0 = 1_000_000
  const store = createMemoryStore()
  await store.putObject('inputs/j1.json', JSON.stringify({ jobDescriptionId: 'jd1', requirements: [], poolIds: ['p1'] }))
  await store.createJob({
    jobId: 'j1', state: 'QUEUED', createdAt: T0, inputKey: 'inputs/j1.json', settings: loadSettings({}),
    progress: { done: 0, total: 1 }, fallbacks: [], record: [], expiresAt: T0 + 1000000,
  })
  let got: number | undefined
  const engine: Engine = {
    modelIds: {},
    promptVersion: 'x',
    async rank(_job, ctx: EngineContext) { got = ctx.deadlineAt },
  }
  const log = console.log
  console.log = () => {}
  try {
    const deps: WorkerDeps = { store, engine, limits: DEFAULT_LIMITS, now: () => T0 + 5000, workerId: 'w1', deadlineAt: T0 + 180_000 }
    assert.equal(await processJob('j1', 1, deps), 'done')
  } finally {
    console.log = log
  }
  assert.equal(got, T0 + 180_000)
})
