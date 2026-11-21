import test from 'node:test'
import assert from 'node:assert/strict'
import { demoHandle, demoKey, fromDemoSeed, seedIdOf } from '../src/index/source'

// The six id-less individuals of scripts/demo-seed/profiles/t6-tor05-individuals.mjs and the ids the
// database holds for them. Each id is the one the engine reported as not_indexed in a real job on
// 2026-11-21, when the index still keyed them by slug.
const SIX: [string, string][] = [
  ['aminata-kone-traore', '25817ced-5288-5fe9-8eb1-463c136bf4ac'],
  ['ousmane-ndiaye-fall', 'c4dc5ea7-bbe7-5128-b3a2-189cbc5487ef'],
  ['claire-mbarga-lefevre', '4d62bc95-42dc-5dc7-a18a-21341b7dbc80'],
  ['yao-kouassi-nguessan', 'c6a4ec71-4ab4-533e-a810-a00822add5e1'],
  ['serge-kouame-ndri', '15e4bfa0-74a2-5d30-b10f-6cc5a2934d3b'],
  ['mariam-coulibaly-sanogo', '3f607f18-d9aa-58c7-b7bf-97b919ff8764'],
]

test('an id-less seed profile is keyed by the id the database derived from its slug', () => {
  for (const [slug, id] of SIX) {
    assert.equal(demoKey({ slug }), id, slug)
    assert.equal(seedIdOf(`demo-${slug}`), id, slug)
  }
})

test('a profile that has an id keeps it, and the id wins over a slug', () => {
  assert.equal(demoKey({ id: 'aaaaaaaa-0000-4000-a000-000000000001' }), 'aaaaaaaa-0000-4000-a000-000000000001')
  assert.equal(demoKey({ id: 'the-id', slug: 'the-slug' }), 'the-id')
})

test('a profile with neither an id nor a slug is refused', () => {
  assert.throws(() => demoKey({ headline: 'No key' }), /neither id nor slug/)
  assert.throws(() => demoKey({ id: ' ', slug: '' }), /neither id nor slug/)
})

test('the fragments of an id-less profile carry the derived id, and the display handle is unchanged', () => {
  const p = { slug: 'aminata-kone-traore', headline: 'e-procurement lead', bio: 'Led a national e-procurement roll-out.' }
  assert.equal(fromDemoSeed(p).profileId, '25817ced-5288-5fe9-8eb1-463c136bf4ac')
  assert.equal(demoHandle(p), 'demo-aminata-kone-traore')
})

test('the derived id has the shape of a version 5 UUID', () => {
  assert.match(seedIdOf('demo-anything'), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})
