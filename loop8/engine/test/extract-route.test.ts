import test from 'node:test'
import assert from 'node:assert/strict'
import type { ApiRequest } from '../src/api/app'
import { handleExtract } from '../src/extract/route'
import type { ExtractOutcome, ExtractRouteDeps } from '../src/extract/route'
import { DEFAULT_LIMITS } from '../src/shared/limits'
import { createMemoryStore } from '../src/shared/memory-store'

const emptyExtracted = { expertise: [], locations: [], languages: [], hiring_organization: null }
const outcome: ExtractOutcome = { extracted: emptyExtracted, degraded: false, model: 'm1' }
const ctx = { taxonomy: { categories: [], items: [] }, locationOptions: [], languageOptions: [] }

function setup(overrides: Partial<ExtractRouteDeps> = {}, day = '2026-11-23') {
  const store = createMemoryStore()
  let calls = 0
  const deps: ExtractRouteDeps = {
    extract: async () => {
      calls++
      return outcome
    },
    counter: store,
    limits: DEFAULT_LIMITS,
    now: () => Date.parse(`${day}T10:00:00Z`),
    ...overrides,
  }
  return { deps, calls: () => calls }
}

const post = (body: unknown, path = '/extract'): ApiRequest => ({
  method: 'POST',
  path,
  headers: {},
  body: typeof body === 'string' || body === null ? body : JSON.stringify(body),
})

test('returns the outcome with the degraded flag and the model', async () => {
  const { deps } = setup()
  const r = await handleExtract(post({ jdText: 'English required', ctx }), deps)
  assert.equal(r.status, 200)
  assert.deepEqual(r.body, outcome)
})

test('a trailing slash is the same route and any other method or path is a 404', async () => {
  const { deps } = setup()
  assert.equal((await handleExtract(post({ jdText: 'a job', ctx }, '/extract/'), deps)).status, 200)
  assert.equal((await handleExtract({ ...post({ jdText: 'a job', ctx }), method: 'GET' }, deps)).status, 404)
  assert.equal((await handleExtract(post({ jdText: 'a job', ctx }, '/jobs'), deps)).status, 404)
})

test('validates the body and does not count a bad request against the cap', async () => {
  const { deps, calls } = setup({ limits: { ...DEFAULT_LIMITS, extractDailyCap: 1 } })
  assert.equal((await handleExtract(post(null), deps)).status, 400)
  assert.equal((await handleExtract(post('nope'), deps)).status, 400)
  assert.equal((await handleExtract(post({ ctx }), deps)).status, 400)
  assert.equal((await handleExtract(post({ jdText: '  ', ctx }), deps)).status, 400)
  assert.equal((await handleExtract(post({ jdText: 'hi' }), deps)).status, 400)
  assert.equal((await handleExtract(post({ jdText: 'x'.repeat(15001), ctx }), deps)).status, 413)
  const big = await handleExtract(post({ jdText: 'hi', ctx }), { ...deps, limits: { ...DEFAULT_LIMITS, maxBodyBytes: 5 } })
  assert.equal(big.status, 413)
  assert.equal(calls(), 0)
  // The cap of 1 is still free, so the first good request passes.
  assert.equal((await handleExtract(post({ jdText: 'a job', ctx }), deps)).status, 200)
})

test('the extraction after the daily cap answers 429 daily_cap and does not call the model', async () => {
  const cap = 3
  const { deps, calls } = setup({ limits: { ...DEFAULT_LIMITS, extractDailyCap: cap } })
  for (let i = 0; i < cap; i++) assert.equal((await handleExtract(post({ jdText: 'a job', ctx }), deps)).status, 200)
  const r = await handleExtract(post({ jdText: 'a job', ctx }), deps)
  assert.equal(r.status, 429)
  assert.equal((r.body as { error: string }).error, 'daily_cap')
  assert.equal(calls(), cap)
})

test('the default cap is 300 a day', async () => {
  assert.equal(DEFAULT_LIMITS.extractDailyCap, 300)
  const { deps } = setup()
  let last = 0
  for (let i = 0; i < 301; i++) last = (await handleExtract(post({ jdText: 'a job', ctx }), deps)).status
  assert.equal(last, 429)
})

test('the count is per day and separate from the job cap', async () => {
  const store = createMemoryStore()
  const limits = { ...DEFAULT_LIMITS, extractDailyCap: 1 }
  const one = setup({ counter: store, limits }, '2026-11-23').deps
  const next = setup({ counter: store, limits }, '2026-11-24').deps
  assert.equal((await handleExtract(post({ jdText: 'a job', ctx }), one)).status, 200)
  assert.equal((await handleExtract(post({ jdText: 'a job', ctx }), one)).status, 429)
  assert.equal((await handleExtract(post({ jdText: 'a job', ctx }), next)).status, 200)
  // Jobs of the same day still have their own room.
  assert.equal(await store.incrementDaily('2026-11-23', 1), true)
})

test('a failure of the counter is not hidden as a success', async () => {
  const { deps } = setup({
    counter: { incrementDaily: async () => { throw new Error('dynamo down') } },
  })
  await assert.rejects(() => handleExtract(post({ jdText: 'a job', ctx }), deps), /dynamo down/)
})
