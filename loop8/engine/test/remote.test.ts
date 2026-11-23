import test from 'node:test'
import assert from 'node:assert/strict'
import { createRemoteExtract, createRemoteRankPool } from '../../../src/lib/matching/remote'
import type { Profile } from '../../../src/types/db'
import type { ExtractedRequirements, ExtractionContext, Requirement } from '../../../src/lib/matching/types'

const pool = [{ id: 'p2' }, { id: 'p1' }, { id: 'p2' }] as unknown as Profile[]
const reqs = [] as Requirement[]
const resultBody = { results: [{ profile_id: 'p1', rank: 1 }] }

interface Call { url: string; method: string; headers: Record<string, string>; body: string | null }
type Handler = (c: Call, n: number) => { status: number; body?: unknown } | Error

function setup(handler: Handler, store = new Map<string, string>()) {
  const calls: Call[] = []
  let clock = 0
  const sleeps: number[] = []
  const fetchFn = (async (url: string, init?: RequestInit) => {
    const c: Call = {
      url, method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: (init?.body as string | undefined) ?? null,
    }
    calls.push(c)
    const r = handler(c, calls.length)
    if (r instanceof Error) throw r
    return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => r.body }
  }) as unknown as typeof fetch
  let id = 0
  const rank = createRemoteRankPool({
    baseUrl: 'http://engine',
    fetch: fetchFn,
    storage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => void store.set(k, v),
      removeItem: (k) => void store.delete(k),
    },
    sleep: async (ms) => { sleeps.push(ms); clock += ms },
    now: () => clock,
    newId: () => `req-${++id}`,
  })
  return { calls, store, rank, sleeps }
}

const happy: Handler = (c) => {
  if (c.method === 'POST') return { status: 202, body: { jobId: 'j1', state: 'QUEUED' } }
  if (c.url.endsWith('/jobs/j1')) return { status: 200, body: { jobId: 'j1', state: 'DONE', resultUrl: 'http://res/j1' } }
  return { status: 200, body: resultBody }
}

const running: Handler = (c) => {
  if (c.method === 'POST') return { status: 202, body: { jobId: 'j1', state: 'QUEUED' } }
  return { status: 200, body: { jobId: 'j1', state: 'RUNNING' } }
}

test('returns [] for an empty pool without calling fetch', async () => {
  const { rank, calls } = setup(happy)
  assert.deepEqual(await rank('jd1', reqs, []), [])
  assert.equal(calls.length, 0)
})

test('posts once with sorted ids and an idempotency key, polls to DONE and returns the results', async () => {
  const { rank, calls, store } = setup(happy)
  const out = await rank('jd1', reqs, pool)
  assert.deepEqual(out, resultBody.results)
  const posts = calls.filter((c) => c.method === 'POST')
  assert.equal(posts.length, 1)
  assert.equal(posts[0].url, 'http://engine/jobs')
  assert.equal(posts[0].headers['idempotency-key'], 'req-1')
  assert.deepEqual(JSON.parse(posts[0].body!), { jobDescriptionId: 'jd1', requirements: [], poolIds: ['p1', 'p2'] })
  assert.equal(store.size, 0)
})

test('a network error during polling is retried', async () => {
  let polls = 0
  const { rank } = setup((c, n) => {
    if (c.method === 'POST') return { status: 202, body: { jobId: 'j1', state: 'QUEUED' } }
    if (c.url.endsWith('/jobs/j1') && polls++ === 0) return new Error('network down')
    return happy(c, n)
  })
  assert.deepEqual(await rank('jd1', reqs, pool), resultBody.results)
})

test('a POST retried after a network error reuses the same idempotency key', async () => {
  let posts = 0
  const { rank, calls } = setup((c, n) => {
    if (c.method === 'POST' && posts++ === 0) return new Error('network down')
    return happy(c, n)
  })
  await rank('jd1', reqs, pool)
  const keys = calls.filter((c) => c.method === 'POST').map((c) => c.headers['idempotency-key'])
  assert.deepEqual(keys, ['req-1', 'req-1'])
})

// Leaves a stored entry behind the way an interrupted page would.
async function interrupted() {
  const first = setup(running)
  await assert.rejects(() => first.rank('jd1', reqs, pool), /did not finish/)
  assert.equal(first.store.size, 1)
  return first.store
}

test('a stored job id is reused after a reload instead of posting again', async () => {
  const store = await interrupted()
  const second = setup(happy, store)
  assert.deepEqual(await second.rank('jd1', reqs, pool), resultBody.results)
  assert.equal(second.calls.filter((c) => c.method === 'POST').length, 0)
})

test('a stored job id that returns 404 is cleared and the request is posted again once', async () => {
  const store = await interrupted()
  let first = true
  const second = setup((c, n) => {
    if (c.method === 'GET' && c.url.endsWith('/jobs/j1') && first) { first = false; return { status: 404, body: { error: 'not_found' } } }
    return happy(c, n)
  }, store)
  assert.deepEqual(await second.rank('jd1', reqs, pool), resultBody.results)
  assert.equal(second.calls.filter((c) => c.method === 'POST').length, 1)
  assert.equal(second.calls[0].url, 'http://engine/jobs/j1')
})

test('FAILED throws an error naming the errorCode', async () => {
  const { rank } = setup((c) => {
    if (c.method === 'POST') return { status: 202, body: { jobId: 'j1', state: 'QUEUED' } }
    return { status: 200, body: { jobId: 'j1', state: 'FAILED', errorCode: 'bedrock_down' } }
  })
  await assert.rejects(() => rank('jd1', reqs, pool), /bedrock_down/)
})

test('a rejected POST throws the engine message', async () => {
  const { rank } = setup(() => ({ status: 429, body: { error: 'rate_limited', message: 'slow down' } }))
  await assert.rejects(() => rank('jd1', reqs, pool), /Engine rejected the ranking: rate_limited slow down/)
})

test('gives up after 600000 ms of polling', async () => {
  const { rank, sleeps } = setup(running)
  await assert.rejects(() => rank('jd1', reqs, pool), /did not finish/)
  assert.ok(sleeps.reduce((a, b) => a + b, 0) >= 600000)
})

test('poll sleeps stay at 1000 ms for 30 s, then grow by 1.5 and never exceed 5000 ms', async () => {
  const { rank, sleeps } = setup(running)
  await assert.rejects(() => rank('jd1', reqs, pool), /did not finish/)
  let elapsed = 0
  let i = 0
  while (elapsed < 30000) {
    assert.equal(sleeps[i], 1000)
    elapsed += sleeps[i++]
  }
  assert.equal(sleeps[i], 1500)
  for (; i < sleeps.length; i++) {
    assert.ok(sleeps[i] <= 5000)
    if (i > 0 && sleeps[i - 1] >= 1500) assert.equal(sleeps[i], Math.min(sleeps[i - 1] * 1.5, 5000))
  }
  assert.equal(sleeps[sleeps.length - 1], 5000)
})

test('a blocked sessionStorage lookup falls back to no storage and still ranks', async () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    get() { throw new Error('SecurityError') },
  })
  try {
    const fetchFn = (async (url: string, init?: RequestInit) => {
      const r = happy({ url, method: init?.method ?? 'GET', headers: {}, body: null }, 0) as { status: number; body: unknown }
      return { status: r.status, ok: r.status < 300, json: async () => r.body }
    }) as unknown as typeof fetch
    const rank = createRemoteRankPool({ baseUrl: 'http://engine', fetch: fetchFn, sleep: async () => undefined, newId: () => 'r' })
    assert.deepEqual(await rank('jd1', reqs, pool), resultBody.results)
  } finally {
    if (desc) Object.defineProperty(globalThis, 'sessionStorage', desc)
    else delete (globalThis as { sessionStorage?: unknown }).sessionStorage
  }
})

test('DONE without a resultUrl clears the stored entry before throwing', async () => {
  const { rank, store } = setup((c) => {
    if (c.method === 'POST') return { status: 202, body: { jobId: 'j1', state: 'QUEUED' } }
    return { status: 200, body: { jobId: 'j1', state: 'DONE' } }
  })
  await assert.rejects(() => rank('jd1', reqs, pool), /without a result/)
  assert.equal(store.size, 0)
})

test('a failed result download clears the stored entry before throwing', async () => {
  const { rank, store } = setup((c, n) => (c.url === 'http://res/j1' ? { status: 500 } : happy(c, n)))
  await assert.rejects(() => rank('jd1', reqs, pool), /result download failed: 500/)
  assert.equal(store.size, 0)
})

test('a 4xx poll response other than 404 or 429 fails fast and clears the entry', async () => {
  const { rank, store, sleeps } = setup((c) => {
    if (c.method === 'POST') return { status: 202, body: { jobId: 'j1', state: 'QUEUED' } }
    return { status: 403, body: { error: 'forbidden' } }
  })
  await assert.rejects(() => rank('jd1', reqs, pool), /Engine status check failed: 403/)
  assert.equal(store.size, 0)
  assert.equal(sleeps.length, 0)
})

test('429 and 5xx poll responses are retried', async () => {
  const codes = [429, 503]
  const { rank } = setup((c, n) => {
    if (c.method === 'GET' && c.url.endsWith('/jobs/j1') && codes.length) return { status: codes.shift()! }
    return happy(c, n)
  })
  assert.deepEqual(await rank('jd1', reqs, pool), resultBody.results)
})

// ---- Extraction client and its fallback ---------------------------------------

const jd = 'We need a water sanitation expert in Kenya.'
const ctx = { taxonomy: { categories: [], items: [] }, locationOptions: [], languageOptions: [] } as ExtractionContext
const fromEngine = { expertise: [{ name: 'WASH' }], locations: [], languages: [], hiring_organization: null } as unknown as ExtractedRequirements
const fromFallback = { expertise: [], locations: [], languages: [], hiring_organization: null } as ExtractedRequirements

function setupExtract(handler: Handler, withFallback = true) {
  const calls: Call[] = []
  let clock = 0
  const sleeps: number[] = []
  let fallbackCalls = 0
  const fetchFn = (async (url: string, init?: RequestInit) => {
    calls.push({
      url, method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: (init?.body as string | undefined) ?? null,
    })
    const r = handler(calls[calls.length - 1], calls.length)
    if (r instanceof Error) throw r
    return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => r.body }
  }) as unknown as typeof fetch
  const extract = createRemoteExtract({
    baseUrl: 'http://engine',
    fetch: fetchFn,
    sleep: async (ms) => { sleeps.push(ms); clock += ms },
    now: () => clock,
    fallback: withFallback ? async () => { fallbackCalls++; return fromFallback } : undefined,
  })
  return { calls, sleeps, extract, fallbackCalls: () => fallbackCalls, elapsed: () => clock }
}

test('extract posts once to /extract and returns the engine result without using the fallback', async () => {
  const { extract, calls, fallbackCalls } = setupExtract(() => ({ status: 200, body: { extracted: fromEngine } }))
  assert.deepEqual(await extract(jd, ctx), fromEngine)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'http://engine/extract')
  assert.equal(calls[0].method, 'POST')
  assert.equal(fallbackCalls(), 0)
})

test('extract falls back at once on a 404, a 501 or a 400 without retrying', async () => {
  for (const status of [404, 501, 400]) {
    const { extract, calls, sleeps, fallbackCalls } = setupExtract(() => ({ status, body: { error: 'nope' } }))
    assert.deepEqual(await extract(jd, ctx), fromFallback)
    assert.equal(calls.length, 1)
    assert.equal(sleeps.length, 0)
    assert.equal(fallbackCalls(), 1)
  }
})

test('extract falls back when the engine answers 200 without an extraction', async () => {
  const { extract, fallbackCalls } = setupExtract(() => ({ status: 200, body: {} }))
  assert.deepEqual(await extract(jd, ctx), fromFallback)
  assert.equal(fallbackCalls(), 1)
})

test('extract retries a 503 and uses the engine result when the next answer is good', async () => {
  const { extract, sleeps, fallbackCalls } = setupExtract((_c, n) =>
    n === 1 ? { status: 503 } : { status: 200, body: { extracted: fromEngine } })
  assert.deepEqual(await extract(jd, ctx), fromEngine)
  assert.deepEqual(sleeps, [1000])
  assert.equal(fallbackCalls(), 0)
})

test('extract retries network errors for at most 10 s and then falls back', async () => {
  const { extract, calls, elapsed, fallbackCalls } = setupExtract(() => new TypeError('Failed to fetch'))
  assert.deepEqual(await extract(jd, ctx), fromFallback)
  assert.ok(calls.length > 1, 'network errors are retried')
  assert.ok(elapsed() >= 10000 && elapsed() < 10000 + 5000, `waited ${elapsed()} ms`)
  assert.equal(fallbackCalls(), 1)
})

test('extract without a fallback still throws, so the baseline measures the engine', async () => {
  const { extract } = setupExtract(() => ({ status: 404, body: { error: 'not_found' } }), false)
  await assert.rejects(() => extract(jd, ctx), /Engine rejected extraction: not_found/)
})

test('extract fails at once on a daily_cap 429, and uses the fallback when there is one', async () => {
  const cap: Handler = () => ({ status: 429, body: { error: 'daily_cap', message: 'The daily extraction limit has been reached' } })
  const { extract, calls, sleeps } = setupExtract(cap, false)
  await assert.rejects(() => extract(jd, ctx), /Engine rejected extraction: daily_cap/)
  assert.equal(calls.length, 1)
  assert.equal(sleeps.length, 0)
  const withFallback = setupExtract(cap)
  assert.deepEqual(await withFallback.extract(jd, ctx), fromFallback)
  assert.equal(withFallback.calls.length, 1)
  assert.equal(withFallback.sleeps.length, 0)
})

test('extract retries a throttle 429 that is not the daily cap', async () => {
  const { extract, sleeps } = setupExtract((_c, n) =>
    n === 1 ? { status: 429, body: { message: 'Too Many Requests' } } : { status: 200, body: { extracted: fromEngine } })
  assert.deepEqual(await extract(jd, ctx), fromEngine)
  assert.deepEqual(sleeps, [1000])
})

test('extract reports degraded and the model of each answer through onResult', async () => {
  const seen: Array<{ degraded: boolean; model: string | null }> = []
  const answers = [
    { extracted: fromEngine, degraded: false, model: 'us.amazon.nova-pro-v1:0' },
    { extracted: fromFallback, degraded: true, model: 'us.amazon.nova-pro-v1:0' },
    { extracted: fromEngine },
  ]
  let n = 0
  const extract = createRemoteExtract({
    baseUrl: 'http://engine',
    fetch: (async () => ({ status: 200, ok: true, json: async () => answers[n++] })) as unknown as typeof fetch,
    onResult: (info) => void seen.push(info),
  })
  for (let i = 0; i < answers.length; i++) await extract(jd, ctx)
  assert.deepEqual(seen, [
    { degraded: false, model: 'us.amazon.nova-pro-v1:0' },
    { degraded: true, model: 'us.amazon.nova-pro-v1:0' },
    { degraded: false, model: null },
  ])
})

test('extract does not call onResult when the engine failed', async () => {
  let called = 0
  const extract = createRemoteExtract({
    baseUrl: 'http://engine',
    fetch: (async () => ({ status: 404, ok: false, json: async () => ({ error: 'not_found' }) })) as unknown as typeof fetch,
    onResult: () => void called++,
  })
  await assert.rejects(() => extract(jd, ctx))
  assert.equal(called, 0)
})
