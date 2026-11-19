import test from 'node:test'
import assert from 'node:assert/strict'
import { extractFromJd } from '../src/extract/extract'
import { parseExtraction } from '../src/bedrock/sol'
import type { CompleteFn } from '../src/bedrock/sol'
import type { ExtractionContext } from '../../../src/lib/matching/types'
import type { TaxonomyCategory, TaxonomyItem } from '../../../src/types/db'

// A small slice of the unified expertise list, enough to exercise mapping,
// the deterministic floor, legacy names and the unknown-name guard.
const categories: TaxonomyCategory[] = [
  { id: 'c1', type: 'expertise', name: 'Health', sort_order: 1 },
  { id: 'c2', type: 'expertise', name: 'Research, evaluation and analysis', sort_order: 2 },
]
const items: TaxonomyItem[] = [
  { id: 'i1', category_id: 'c1', name: 'Nutrition', sort_order: 1, kind: 'sector', aliases: [], legacy_names: [] },
  { id: 'i2', category_id: 'c2', name: 'Impact Evaluation', sort_order: 1, kind: 'method', aliases: [], legacy_names: ['Outcome Evaluation'] },
  { id: 'i3', category_id: 'c2', name: 'Workshop Facilitation', sort_order: 2, kind: 'method', aliases: [], legacy_names: [] },
]
const ctx: ExtractionContext = {
  taxonomy: { categories, items },
  locationOptions: ['Ethiopia', 'Nairobi, Kenya'],
  languageOptions: ['English', 'Amharic'],
}

const fakeComplete = (reply: string): CompleteFn => async () => reply

test('model adds a paraphrase the keyword floor misses', async () => {
  // "validation workshop" is not a name or alias, so the floor misses Workshop
  // Facilitation. The model maps it; the floor still catches Nutrition literally.
  const jd = 'We run nutrition programmes and need help facilitating a validation workshop with partners.'
  const out = await extractFromJd(jd, ctx, {
    complete: fakeComplete('{"expertise":["Workshop Facilitation","Nutrition"],"locations":[],"languages":[]}'),
  })
  const names = out.expertise.map((e) => e.name)
  assert.ok(names.includes('Nutrition'), 'floor keeps the literal hit')
  assert.ok(names.includes('Workshop Facilitation'), 'model adds the paraphrase')
  const ws = out.expertise.find((e) => e.name === 'Workshop Facilitation')!
  assert.equal(ws.mentions, 1)
  assert.equal(ws.suggested, 'slight')
})

test('an invented name the model returns is dropped', async () => {
  const out = await extractFromJd('A short brief about programme delivery.', ctx, {
    complete: fakeComplete('{"expertise":["Quantum Basket Weaving"],"locations":[],"languages":[]}'),
  })
  assert.deepEqual(out.expertise.map((e) => e.name), [])
})

test('a legacy name is mapped to the item that absorbed it', async () => {
  const out = await extractFromJd('A brief about measuring programme outcomes.', ctx, {
    complete: fakeComplete('{"expertise":["Outcome Evaluation"],"locations":[],"languages":[]}'),
  })
  assert.ok(out.expertise.map((e) => e.name).includes('Impact Evaluation'))
})

test('a model failure degrades to the deterministic floor', async () => {
  const jd = 'We run nutrition programmes in the region.'
  const failing: CompleteFn = async () => {
    throw new Error('throttled')
  }
  const out = await extractFromJd(jd, ctx, { complete: failing })
  assert.deepEqual(out.expertise.map((e) => e.name), ['Nutrition'])
})

test('locations are validated against the options, case-insensitively, and unknowns dropped', async () => {
  const out = await extractFromJd('Consultant must be based in Ethiopia.', ctx, {
    complete: fakeComplete('{"expertise":[],"locations":["ethiopia","Atlantis"],"languages":["English"]}'),
  })
  assert.deepEqual(out.locations.map((l) => l.value), ['Ethiopia'])
  assert.deepEqual(out.languages.map((l) => l.value), ['English'])
})

test('extraction never marks a must have and never guesses the hiring organization', async () => {
  const out = await extractFromJd('Nutrition specialist, based in Ethiopia, English required.', ctx, {
    complete: fakeComplete('{"expertise":["Nutrition"],"locations":["Ethiopia"],"languages":["English"]}'),
  })
  assert.equal(out.hiring_organization, null)
  for (const e of out.expertise) assert.ok(e.suggested === 'slight' || e.suggested === 'strong')
})

test('parseExtraction tolerates a fenced reply and fills missing keys', () => {
  const reply = 'Here is the result:\n```json\n{"expertise": ["Nutrition"]}\n```\n'
  assert.deepEqual(parseExtraction(reply), { expertise: ['Nutrition'], locations: [], languages: [] })
})

test('parseExtraction throws when there is no JSON object', () => {
  assert.throws(() => parseExtraction('no json here'), /no JSON object/)
})
