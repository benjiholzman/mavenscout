import test from 'node:test'
import assert from 'node:assert/strict'
import { createSupabaseReader } from '../src/data/supabase'
import type { FetchLike } from '../src/data/supabase'

const KEY = 'anon-key-secret'
const ID = '123e4567-e89b-12d3-a456-426614174000'

type Call = { url: string; init: { method: string; headers: Record<string, string> } }

function fake(handler: (url: string) => { ok?: boolean; status?: number; body: unknown }) {
  const calls: Call[] = []
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, init })
    const r = handler(url)
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.body }
  }
  return { calls, fetch }
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/json' }

test('getJobDescriptionText sends the exact request and returns the text', async () => {
  const f = fake(() => ({ body: [{ raw_text: 'Hello JD' }] }))
  const r = createSupabaseReader({ url: 'https://x.supabase.co/', anonKey: KEY, fetch: f.fetch })
  assert.equal(await r.getJobDescriptionText(ID), 'Hello JD')
  assert.equal(f.calls.length, 1)
  assert.equal(f.calls[0].url, `https://x.supabase.co/rest/v1/job_descriptions?select=raw_text&id=eq.${ID}&limit=1`)
  assert.equal(f.calls[0].init.method, 'GET')
  assert.deepEqual(f.calls[0].init.headers, headers)
})

test('trailing slashes on the url are removed', async () => {
  const f = fake(() => ({ body: [] }))
  const r = createSupabaseReader({ url: 'https://x.supabase.co///', anonKey: KEY, fetch: f.fetch })
  await r.getJobDescriptionText(ID)
  assert.ok(f.calls[0].url.startsWith('https://x.supabase.co/rest/v1/job_descriptions?'))
})

test('a non-UUID id makes no call and returns null', async () => {
  const f = fake(() => ({ body: [] }))
  const r = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY, fetch: f.fetch })
  assert.equal(await r.getJobDescriptionText('abc&select=*'), null)
  assert.equal(f.calls.length, 0)
})

test('an empty result is null', async () => {
  const f = fake(() => ({ body: [] }))
  const r = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY, fetch: f.fetch })
  assert.equal(await r.getJobDescriptionText(ID), null)
})

test('blank or non-string raw_text is null', async () => {
  for (const raw of ['   ', '', null, 5]) {
    const f = fake(() => ({ body: [{ raw_text: raw }] }))
    const r = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY, fetch: f.fetch })
    assert.equal(await r.getJobDescriptionText(ID), null)
  }
})

test('getReferenceLists merges aliases and de-duplicates case-insensitively', async () => {
  const f = fake((url) => {
    if (url.includes('/organizations?')) {
      return { body: [
        { name: ' World Bank ', aliases: ['WB', 'world bank', ''] },
        { name: 'UNDP', aliases: ['wb', 'UN Development Programme', 7] },
        { name: 'undp', aliases: null },
      ] }
    }
    return { body: [{ name: 'English' }, { name: ' english ' }, { name: 'French' }, { name: '' }] }
  })
  const r = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY, fetch: f.fetch })
  const lists = await r.getReferenceLists()
  assert.deepEqual(lists.organizations, ['World Bank', 'WB', 'UNDP', 'UN Development Programme'])
  assert.deepEqual(lists.organizationTerms, {
    names: ['World Bank', 'UNDP'],
    aliases: ['WB', 'world bank', 'UN Development Programme'],
  })
  assert.deepEqual(lists.languages, ['English', 'French'])
  const urls = f.calls.map((c) => c.url).sort()
  assert.deepEqual(urls, [
    'https://x.supabase.co/rest/v1/languages?select=name',
    'https://x.supabase.co/rest/v1/organizations?select=name,aliases',
  ])
  for (const c of f.calls) assert.deepEqual(c.init.headers, headers)
})

test('a non-ok status throws with table and status and without the key', async () => {
  const f = fake(() => ({ ok: false, status: 401, body: {} }))
  const r = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY, fetch: f.fetch })
  await assert.rejects(r.getJobDescriptionText(ID), (e: Error) => {
    assert.equal(e.message, 'supabase_error: job_descriptions 401')
    assert.ok(!e.message.includes(KEY))
    return true
  })
  await assert.rejects(r.getReferenceLists(), /supabase_error: (organizations|languages) 401/)
})

test('a non-array body throws bad_body', async () => {
  const f = fake(() => ({ body: { message: 'nope' } }))
  const r = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY, fetch: f.fetch })
  await assert.rejects(r.getJobDescriptionText(ID), { message: 'supabase_error: job_descriptions bad_body' })
})

test('a body that is not JSON throws bad_body without any body text', async () => {
  const fetch: FetchLike = async () => ({
    ok: true,
    status: 200,
    json: async () => JSON.parse('<html>proxy page with jd text'),
  })
  const r = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY, fetch })
  await assert.rejects(r.getJobDescriptionText(ID), (e: Error) => {
    assert.equal(e.message, 'supabase_error: job_descriptions bad_body')
    return true
  })
})

test('missing config throws', () => {
  assert.throws(() => createSupabaseReader({ url: '', anonKey: KEY }), { message: 'supabase_config_missing' })
  assert.throws(() => createSupabaseReader({ url: 'https://x', anonKey: '' }), { message: 'supabase_config_missing' })
})

test('the default fetch is resolved when a call runs', async () => {
  const original = globalThis.fetch
  const r = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY })
  let used = false
  globalThis.fetch = (async () => {
    used = true
    return { ok: true, status: 200, json: async () => [] }
  }) as unknown as typeof fetch
  try {
    assert.equal(await r.getJobDescriptionText(ID), null)
    assert.ok(used)
  } finally {
    globalThis.fetch = original
  }
})
