import test from 'node:test'
import assert from 'node:assert/strict'
import { orgTerms, findOrgNames } from '../src/search/org-check'
import { main, type CheckDeps } from '../src/check-artifact'
import type { IndexArtifact } from '../src/search/artifact'

const art = (texts: Record<string, string>): IndexArtifact => ({
  modelVersion: 'm',
  indexVersion: 'i',
  dimensions: 1,
  fragments: Object.entries(texts).map(([id, text]) => ({ fragmentId: id, profileId: `p-${id}`, type: 'bio', text, vector: [1] })),
})
const hits = (texts: Record<string, string>, names: string[], aliases: string[] = []) =>
  findOrgNames(art(texts), orgTerms(names, aliases))

test('orgTerms: one case rule for names and aliases, de-duplicated on whitespace and case', () => {
  const t = orgTerms([' World Bank ', '', 'world  bank', 'PATH'], ['UN', 'IBRD2', 'Unicef', 'unicef', 'CoST', ''])
  assert.deepEqual(t, [
    { term: 'World Bank', caseSensitive: false },
    { term: 'PATH', caseSensitive: true },
    { term: 'UN', caseSensitive: true },
    { term: 'IBRD2', caseSensitive: true },
    { term: 'Unicef', caseSensitive: false },
    { term: 'CoST', caseSensitive: true },
  ])
})

test('World Bank and world  bank are one term', () => {
  assert.equal(orgTerms(['World Bank', 'world  bank'], []).length, 1)
})

test('names PATH and GAIN do not hit career path or gain, and PATH hits', () => {
  assert.equal(hits({ a: 'a career path to gain skills' }, ['PATH', 'GAIN']).length, 0)
  assert.equal(hits({ a: 'worked with PATH on vaccines' }, ['PATH', 'GAIN']).length, 1)
})

test('name match is case-insensitive', () => {
  assert.equal(hits({ a: 'worked at the WORLD bank for years' }, ['World Bank']).length, 1)
})

test('all-caps alias is case-sensitive', () => {
  assert.equal(hits({ a: 'we un-learned it, un' }, [], ['UN']).length, 0)
  assert.equal(hits({ a: 'advised the UN on policy' }, [], ['UN']).length, 1)
})

test('mixed-case alias is case-sensitive, a capitalised alias is not', () => {
  assert.equal(hits({ a: 'a unicef mission' }, [], ['UniCef']).length, 0)
  assert.equal(hits({ a: 'a UniCef mission' }, [], ['UniCef']).length, 1)
  assert.equal(hits({ a: 'a unicef mission' }, [], ['Unicef']).length, 1)
})

test('whole word only', () => {
  assert.equal(hits({ a: 'Banking reform' }, ['Bank']).length, 0)
  assert.equal(hits({ a: 'a Bank, then more' }, ['Bank']).length, 1)
})

test('a name split by a line break or double space still matches', () => {
  assert.equal(hits({ a: 'the World\nBank' }, ['World Bank']).length, 1)
  assert.equal(hits({ a: 'the World  Bank' }, ['World Bank']).length, 1)
})

test('one hit per fragment and term, sorted by fragmentId then term', () => {
  const out = hits({ b: 'Acme Acme Zed', a: 'Zed and Acme' }, ['Zed', 'Acme'])
  assert.deepEqual(out.map((h) => `${h.fragmentId} ${h.term}`), ['a Acme', 'a Zed', 'b Acme', 'b Zed'])
  assert.deepEqual(out[0], { fragmentId: 'a', profileId: 'p-a', type: 'bio', term: 'Acme' })
})

const artifactJson = (text: string) => JSON.stringify({
  modelVersion: 'm', indexVersion: 'i', dimensions: 1,
  fragments: [{ fragmentId: 'f1', profileId: 'p1', type: 'bio', text, vector: [1] }],
})

function setup(files: Record<string, string>, reader?: () => Promise<unknown>) {
  const out: string[] = []
  const err: string[] = []
  const cfgs: { url: string; anonKey: string }[] = []
  const deps: CheckDeps = {
    readFile: async (p) => {
      if (!(p in files)) throw new Error(`ENOENT ${p}`)
      return files[p]
    },
    createReader: (cfg) => {
      cfgs.push(cfg)
      return { getJobDescriptionText: async () => null, getScoringData: async () => { throw new Error('unused') }, getExtraction: async () => { throw new Error('unused') }, getReferenceLists: (reader ?? (async () => ({
        organizations: [], organizationTerms: { names: ['Acme Corp'], aliases: ['AC'] }, languages: [],
      }))) as never }
    },
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  }
  return { deps, out, err, cfgs }
}
const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'secret-key' }

test('main exits 0 with no hits and prints counts', async () => {
  const s = setup({ 'a.json': artifactJson('clean text') })
  assert.equal(await main(['a.json'], env, s.deps), 0)
  assert.deepEqual(s.out, ['fragments 1', 'terms 2'])
  assert.deepEqual(s.cfgs, [{ url: env.SUPABASE_URL, anonKey: 'secret-key' }])
})

test('main exits 1 with hits, prints hit lines and never the text', async () => {
  const s = setup({ 'a.json': artifactJson('Served at Acme Corp in the field') })
  assert.equal(await main(['a.json'], env, s.deps), 1)
  assert.deepEqual(s.out, ['fragments 1', 'terms 2', 'f1 p1 bio Acme Corp'])
  assert.ok(!s.out.join('\n').includes('Served'))
})

test('main uses --orgs file when env is missing', async () => {
  const s = setup({
    'a.json': artifactJson('Zed Inc here'),
    'o.json': JSON.stringify({ names: ['Zed Inc'], aliases: [] }),
  })
  assert.equal(await main(['--orgs', 'o.json', 'a.json'], {}, s.deps), 1)
  assert.equal(s.cfgs.length, 0)
  assert.deepEqual(s.out, ['fragments 1', 'terms 1', 'f1 p1 bio Zed Inc'])
})

test('main exits 2 with usage when no path or no term source', async () => {
  let s = setup({})
  assert.equal(await main([], env, s.deps), 2)
  assert.match(s.err.join('\n'), /usage/i)
  s = setup({ 'a.json': artifactJson('x') })
  assert.equal(await main(['a.json'], { SUPABASE_URL: 'u', SUPABASE_ANON_KEY: '' }, s.deps), 2)
  assert.match(s.err.join('\n'), /usage/i)
})

test('main exits 2 on load, orgs file and reader errors, without the anon key', async () => {
  let s = setup({ 'a.json': 'not json' })
  assert.equal(await main(['a.json'], env, s.deps), 2)
  assert.match(s.err.join('\n'), /invalid_index/)
  s = setup({ 'a.json': artifactJson('x') })
  assert.equal(await main(['a.json', '--orgs', 'missing.json'], {}, s.deps), 2)
  s = setup({ 'a.json': artifactJson('x'), 'o.json': '{"names": 5}' })
  assert.equal(await main(['a.json', '--orgs', 'o.json'], {}, s.deps), 2)
  s = setup({ 'a.json': artifactJson('x') }, async () => { throw new Error('boom secret-key') })
  assert.equal(await main(['a.json'], env, s.deps), 2)
  assert.ok(s.err.length > 0)
  assert.ok(!s.err.join('\n').includes('secret-key'))
})
