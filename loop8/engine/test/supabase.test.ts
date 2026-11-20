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

const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4222-8222-222222222222'
const P3 = '33333333-3333-4333-8333-333333333333'

function scoringFake(profiles: Record<string, unknown>[], portfolio: Record<string, unknown>[]) {
  return fake((url) => {
    if (url.includes('/profiles?')) return { body: profiles }
    if (url.includes('/portfolio_items?')) return { body: portfolio }
    if (url.includes('/taxonomy_categories?')) return { body: [] }
    if (url.includes('/taxonomy_items?')) return { body: [] }
    if (url.includes('/organizations?')) return { body: [] }
    return { body: [] }
  })
}

test('getScoringData sends the exact requests and keeps the requested order', async () => {
  const f = scoringFake(
    [{ id: P2, name: 'B' }, { id: P1, name: 'A' }],
    [
      { id: 'i1', profile_id: P1, sort_order: 0 },
      { id: 'i2', profile_id: P2, sort_order: 0 },
      { id: 'i3', profile_id: P1, sort_order: 1 },
    ],
  )
  const r = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY, fetch: f.fetch })
  const data = await r.getScoringData([P1, P2, P3, 'bad&id'])
  assert.deepEqual(data.candidates.map((c) => c.profile.id), [P1, P2])
  assert.deepEqual(data.candidates[0].portfolio.map((i) => i.id), ['i1', 'i3'])
  assert.deepEqual(data.candidates[1].portfolio.map((i) => i.id), ['i2'])
  assert.deepEqual(data.missing, [P3, 'bad&id'])
  assert.ok(data.expertise)
  assert.ok(data.orgs)
  const urls = f.calls.map((c) => c.url).sort()
  assert.deepEqual(urls, [
    'https://x.supabase.co/rest/v1/organizations?select=*&order=name',
    `https://x.supabase.co/rest/v1/portfolio_items?select=*&profile_id=in.(${P1},${P2},${P3})&order=sort_order`,
    `https://x.supabase.co/rest/v1/profiles?select=*&id=in.(${P1},${P2},${P3})`,
    'https://x.supabase.co/rest/v1/taxonomy_categories?select=*&order=sort_order',
    'https://x.supabase.co/rest/v1/taxonomy_items?select=*&order=sort_order',
  ].sort())
  for (const c of f.calls) assert.deepEqual(c.init.headers, headers)
})

test('getScoringData with no valid ids makes no profile or portfolio request', async () => {
  const f = scoringFake([], [])
  const r = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY, fetch: f.fetch })
  const data = await r.getScoringData(['nope'])
  assert.deepEqual(data.candidates, [])
  assert.deepEqual(data.missing, ['nope'])
  assert.ok(!f.calls.some((c) => c.url.includes('/profiles?') || c.url.includes('/portfolio_items?')))
})

test('getScoringData chunks the id filters at 100', async () => {
  const ids = Array.from({ length: 250 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
  const f = scoringFake([], [])
  const r = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY, fetch: f.fetch })
  const data = await r.getScoringData(ids)
  const count = (t: string) => f.calls.filter((c) => c.url.includes(`/${t}?`)).length
  assert.equal(count('profiles'), 3)
  assert.equal(count('portfolio_items'), 3)
  assert.equal(data.missing.length, 250)
})

test('getScoringData errors name the table and status without the key', async () => {
  const f = fake(() => ({ ok: false, status: 500, body: {} }))
  const r = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY, fetch: f.fetch })
  await assert.rejects(r.getScoringData([P1]), (e: Error) => {
    assert.match(e.message, /^supabase_error: [a-z_]+ 500$/)
    assert.ok(!e.message.includes(KEY))
    return true
  })
  const g = fake(() => ({ body: { nope: 1 } }))
  const r2 = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY, fetch: g.fetch })
  await assert.rejects(r2.getScoringData([P1]), /supabase_error: [a-z_]+ bad_body/)
})

test('getExtraction sends the exact request and returns both fields', async () => {
  const f = fake(() => ({ body: [{ extracted: { a: 1 }, hiring_organization: 'UNDP' }] }))
  const r = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY, fetch: f.fetch })
  const out = await r.getExtraction(ID)
  assert.deepEqual(out, { extracted: { a: 1 } as never, hiringOrganization: 'UNDP' })
  assert.equal(f.calls[0].url, `https://x.supabase.co/rest/v1/job_descriptions?select=extracted,hiring_organization&id=eq.${ID}&limit=1`)
  assert.deepEqual(f.calls[0].init.headers, headers)
})

test('getExtraction gives nulls for a non-UUID, no row, or bad field types', async () => {
  const f = fake(() => ({ body: [] }))
  const r = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY, fetch: f.fetch })
  assert.deepEqual(await r.getExtraction('x&y'), { extracted: null, hiringOrganization: null })
  assert.equal(f.calls.length, 0)
  assert.deepEqual(await r.getExtraction(ID), { extracted: null, hiringOrganization: null })
  const g = fake(() => ({ body: [{ extracted: 'str', hiring_organization: '  ' }] }))
  const r2 = createSupabaseReader({ url: 'https://x.supabase.co', anonKey: KEY, fetch: g.fetch })
  assert.deepEqual(await r2.getExtraction(ID), { extracted: null, hiringOrganization: null })
})
