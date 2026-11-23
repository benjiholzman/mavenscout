import test from 'node:test'
import assert from 'node:assert/strict'
import { extractFromJd } from '../src/extract/extract'
import type { ExtractionStats } from '../src/extract/extract'
import { buildExtractionPrompt, EXTRACTION_PROMPT_VERSION, EXTRACTION_SYSTEM } from '../src/extract/prompt'
import { buildExpertiseIndex } from '../../../src/lib/expertise'
import { parseExtraction } from '../src/extract/parse'
import type { CompleteFn } from '../src/extract/complete'
import { MAX_TAG_ROWS } from '../../../src/lib/matching/config'
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

test('onFallback is called when the model fails or its reply is not usable, and not when it works', async () => {
  const jd = 'We run nutrition programmes in the region.'
  const messages: string[] = []
  const onFallback = (m: string) => void messages.push(m)
  await extractFromJd(jd, ctx, { complete: async () => { throw new Error('throttled') }, onFallback })
  await extractFromJd(jd, ctx, { complete: fakeComplete('no json here'), onFallback })
  assert.equal(messages.length, 2)
  await extractFromJd(jd, ctx, { complete: fakeComplete('{"expertise":["Nutrition"],"locations":[],"languages":[]}'), onFallback })
  assert.equal(messages.length, 2)
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

test('the deterministic floor is never evicted when the model fills the capped list', async () => {
  // The floor is the recall guarantee: a model-only suggestion must never push a
  // deterministic hit out of the MAX_TAG_ROWS list. Build MAX_TAG_ROWS + 1 items,
  // write every one but the first (taxonomy order 0) literally into the JD so the
  // floor fills the cap exactly, then have the model return the missing first item
  // (the lowest order). Before the fix it sorted ahead and dropped a floor hit.
  const n = MAX_TAG_ROWS + 1
  const names = Array.from({ length: n }, (_, i) => `Zylphodon${String(i).padStart(2, '0')}`)
  const bigCategories: TaxonomyCategory[] = [{ id: 'c1', type: 'expertise', name: 'Big', sort_order: 1 }]
  const bigItems: TaxonomyItem[] = names.map((name, i) => ({
    id: `b${i}`, category_id: 'c1', name, sort_order: i + 1, kind: 'sector', aliases: [], legacy_names: [],
  }))
  const bigCtx: ExtractionContext = {
    taxonomy: { categories: bigCategories, items: bigItems },
    locationOptions: [], languageOptions: [],
  }
  // JD names items 1..n-1 (floor finds exactly MAX_TAG_ROWS); item 0 is omitted.
  const jd = `This role covers ${names.slice(1).join(', ')}.`
  const out = await extractFromJd(jd, bigCtx, {
    complete: fakeComplete(JSON.stringify({ expertise: [names[0]], locations: [], languages: [] })),
  })
  const got = out.expertise.map((e) => e.name)
  assert.equal(got.length, MAX_TAG_ROWS, 'stays within the row cap')
  for (const floorName of names.slice(1)) {
    assert.ok(got.includes(floorName), `floor hit ${floorName} is retained`)
  }
  assert.ok(!got.includes(names[0]), 'the model-only item yields to the full floor rather than evicting it')
})

test('parseExtraction tolerates a fenced reply and fills missing keys', () => {
  const reply = 'Here is the result:\n```json\n{"expertise": ["Nutrition"]}\n```\n'
  assert.deepEqual(parseExtraction(reply), { expertise: ['Nutrition'], locations: [], languages: [] })
})

test('parseExtraction throws when there is no JSON object', () => {
  assert.throws(() => parseExtraction('no json here'), /no JSON object/)
})

// ---- Names the model returns with the hint of the list line ----

const replyOf = (expertise: string[], locations: string[] = [], languages: string[] = []) =>
  JSON.stringify({ expertise, locations, languages })

async function run(expertise: string[], context: ExtractionContext = ctx, locations: string[] = [], languages: string[] = []) {
  let stats: ExtractionStats | null = null
  const out = await extractFromJd('A role with no keyword that matches.', context, {
    complete: fakeComplete(replyOf(expertise, locations, languages)),
    onStats: (st) => {
      stats = st
    },
  })
  return { out, stats: stats as ExtractionStats | null }
}

test('a name returned with the hint of its list line is kept as the name', async () => {
  const { out, stats } = await run(['Workshop Facilitation (facilitation, workshops)', 'Nutrition (food security)'])
  const names = out.expertise.map((e) => e.name)
  assert.ok(names.includes('Workshop Facilitation'))
  assert.ok(names.includes('Nutrition'))
  assert.deepEqual(stats?.expertise, { returned: 2, exact: 0, legacy: 0, hintRemoved: 2, dropped: 0 })
})

test('an invented name is dropped even when it has a hint, and only a trailing parenthesis is removed', async () => {
  const { out, stats } = await run(['Quantum Physics (qp)', 'Nutrition (food) and more', '(Nutrition)'])
  assert.deepEqual(out.expertise, [])
  assert.equal(stats?.expertise.dropped, 3)
  assert.equal(stats?.expertise.hintRemoved, 0)
})

test('an old name with a hint maps to the item that absorbed it', async () => {
  const { out, stats } = await run(['Outcome Evaluation (outcome, results)'])
  assert.deepEqual(out.expertise.map((e) => e.name), ['Impact Evaluation'])
  assert.deepEqual(stats?.expertise, { returned: 1, exact: 0, legacy: 0, hintRemoved: 1, dropped: 0 })
})

test('the exact name wins over the name without its parenthesis', async () => {
  const withParen: TaxonomyItem[] = [
    ...items,
    { id: 'i4', category_id: 'c2', name: 'Monitoring', sort_order: 3, kind: 'method', aliases: [], legacy_names: [] },
    { id: 'i5', category_id: 'c2', name: 'Monitoring (M&E)', sort_order: 4, kind: 'method', aliases: [], legacy_names: [] },
  ]
  const context: ExtractionContext = { ...ctx, taxonomy: { categories, items: withParen } }
  const { out, stats } = await run(['Monitoring (M&E)'], context)
  assert.deepEqual(out.expertise.map((e) => e.name), ['Monitoring (M&E)'])
  assert.deepEqual(stats?.expertise, { returned: 1, exact: 1, legacy: 0, hintRemoved: 0, dropped: 0 })
})

test('the counts tell exact, old name, hint removed and dropped apart, and locations and languages', async () => {
  const { stats } = await run(
    ['Nutrition', 'Outcome Evaluation', 'Workshop Facilitation (workshops)', 'Not A Real Item'],
    ctx,
    ['Ethiopia', 'Mars'],
    ['amharic'],
  )
  assert.deepEqual(stats, {
    expertise: { returned: 4, exact: 1, legacy: 1, hintRemoved: 1, dropped: 1 },
    locations: { returned: 2, kept: 1 },
    languages: { returned: 1, kept: 1 },
  })
})

test('no counts are reported when the model failed or its reply is not usable', async () => {
  let called = 0
  const onStats = () => void called++
  await extractFromJd('Nutrition work.', ctx, { complete: async () => { throw new Error('throttled') }, onStats })
  await extractFromJd('Nutrition work.', ctx, { complete: fakeComplete('no json here'), onStats })
  assert.equal(called, 0)
})

test('the prompt explains the parentheses of the list, has a version id and uses no example of a sample ToR', () => {
  assert.equal(EXTRACTION_PROMPT_VERSION, 'extract-v2')
  assert.match(EXTRACTION_SYSTEM, /hints in parentheses/)
  assert.match(EXTRACTION_SYSTEM, /not part of the name/)
  assert.match(EXTRACTION_SYSTEM, /tasks and the deliverables/)
  assert.doesNotMatch(EXTRACTION_SYSTEM, /validation workshop|policy brief|gender|nutrition/i)
  const prompt = buildExtractionPrompt({ jdText: 'a job', index: buildExpertiseIndex(categories, items), locationOptions: ['Ethiopia'], languageOptions: ['English'] })
  assert.equal(prompt.system, EXTRACTION_SYSTEM)
  assert.match(prompt.user, /EXPERTISE LIST/)
})
