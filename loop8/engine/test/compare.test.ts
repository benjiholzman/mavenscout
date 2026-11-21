// The manual against AI comparison (src/eval/compare.ts). Everything here runs
// on fakes: an in-memory reader, the fake embedder and the fake text model. No
// network, Supabase, AWS or model call is made.

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildExpertiseIndex } from '../../../src/lib/expertise'
import { buildOrgIndex } from '../../../src/lib/organizations'
import type { ExtractedRequirements, Requirement } from '../../../src/lib/matching/types'
import type { TaxonomyCategory, TaxonomyItem } from '../../../src/types/db'
import { loadSettings } from '../src/core/settings'
import type { ReferenceLists, ScoringData } from '../src/data/supabase'
import { createFakeEmbed, createFakeTextModel, fakeVector } from '../src/engine/local-fakes'
import { createSemanticEngine } from '../src/engine/semantic'
import { demoUuid, fixtureStrings, loadHardCases } from '../src/eval/hard-cases'
import {
  aiRanker,
  baselineCheckLine,
  buildCases,
  buildPool,
  manualRanker,
  measureTargets,
  meanReciprocalRank,
  summarize,
  normalizeDemoProfile,
  parseBaselineFixed,
  parseCompareArgs,
  printLivePlan,
  REFERENCE_DATE,
  runCompare,
  runRankings,
  safeError,
  taxonomyFromIndex,
  tiedPairsTop10,
} from '../src/eval/compare'
import type { CompareInputs, RankedRow, Ranker, TorSpec } from '../src/eval/compare'
import { toFragments } from '../src/index/fragments'
import { demoKey, fromDemoSeed } from '../src/index/source'

const NOW = new Date('2026-11-20T00:00:00Z')

const categories: TaxonomyCategory[] = [
  { id: 'c1', type: 'expertise', name: 'Health', sort_order: 1 },
  { id: 'c2', type: 'expertise', name: 'Methods', sort_order: 2 },
]
const items: TaxonomyItem[] = [
  { id: 'i1', category_id: 'c1', name: 'Nutrition', sort_order: 1, kind: 'sector', aliases: ['malnutrition'], legacy_names: [] },
  { id: 'i2', category_id: 'c2', name: 'Impact Evaluation', sort_order: 1, kind: 'method', aliases: ['RCTs'], legacy_names: ['Evaluation'] },
]
const expertise = buildExpertiseIndex(categories, items)

const track = { status: 'available_now', from: null, until: null }

/** A demo seed profile in object shape. Its text carries a SENTINEL marker so a leak is visible. */
function demo(handle: string, id: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    handle,
    id,
    name: `Name ${handle}`,
    gender: 'F',
    level: 'senior',
    headline: `SENTINEL headline of ${handle} on nutrition`,
    city: 'Addis Ababa',
    country: 'Ethiopia',
    languages: [['English', 'fluent']],
    work: ['Remote'],
    pt: track,
    ft: track,
    updatedAt: '2026-10-01T00:00:00Z',
    featured: false,
    eligibility: null,
    bio: `SENTINEL biography of ${handle}: nutrition surveys and impact evaluation work.`,
    tiers: { core: ['Nutrition'] },
    accreditations: [],
    history: [],
    education: [],
    additional: [],
    portfolio: [
      { name: `SENTINEL project ${handle}`, org: 'Fictional Org', years: [2020, 2022], role: 'Lead', desc: `SENTINEL portfolio text ${handle}`, images: [], links: [] },
    ],
    ...over,
  }
}

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'

function demoProfiles(): Record<string, unknown>[] {
  return [
    demo('demo-a', A),
    demo('demo-b', B, { languages: [['French', 'fluent']] }),
    demo('demo-c', C, { approval_status: 'pending' }),
  ]
}

const JD = 'SENTINEL job description text: a nutrition specialist for an impact evaluation in Ethiopia.'

const reqs = (extra: Requirement[] = []): Requirement[] => [
  { id: 'r-exp', kind: 'expertise', level: 'strong', source: 'manual', value: { name: 'Nutrition' } } as Requirement,
  ...extra,
]
const englishMust = { id: 'r-lang', kind: 'language', level: 'must', source: 'manual', value: { values: ['English'], min: 'fluent' } } as Requirement

function tors(): TorSpec[] {
  return ['tor-01', 'tor-03', 'tor-05'].map((id) => ({
    id,
    file: `${id}.txt`,
    requirements: reqs(id === 'tor-01' ? [englishMust] : []),
    expected_top: [{ handle: 'demo-a' }],
    checks: id === 'tor-01' ? [{ type: 'decoy', handle: 'demo-b', expect: 'not_top10' }] : [],
  }))
}

function fakeReader(calls: string[] = []) {
  return {
    async getScoringData(ids: string[]): Promise<ScoringData> {
      calls.push(`scoring:${ids.length}`)
      return { candidates: [], expertise, orgs: buildOrgIndex([]), missing: [] }
    },
    async getReferenceLists(): Promise<ReferenceLists> {
      calls.push('lists')
      return { organizations: ['Fictional Org'], organizationTerms: { names: ['Fictional Org'], aliases: [] }, languages: ['English'] }
    },
  }
}

function inputs(over: Partial<CompareInputs> = {}): CompareInputs {
  return {
    tors: tors(),
    readJd: () => JD,
    demoProfiles: demoProfiles(),
    fixtures: loadHardCases(),
    reader: fakeReader(),
    models: 'fake',
    confirmLive: false,
    settings: loadSettings({}),
    now: NOW,
    print: () => {},
    warn: () => {},
    ...over,
  }
}

// ---- arguments ---------------------------------------------------------------

test('arguments: fake by default, live and confirm read, other values refused', () => {
  assert.deepEqual(parseCompareArgs([]), { models: 'fake', confirmLive: false })
  assert.deepEqual(parseCompareArgs(['--models=live', '--confirm-live']), { models: 'live', confirmLive: true })
  assert.deepEqual(parseCompareArgs(['--models=fake']), { models: 'fake', confirmLive: false })
  assert.throws(() => parseCompareArgs(['--models=real']), /invalid_models_value/)
  assert.throws(() => parseCompareArgs(['--bogus']), /unknown_argument/)
})

// ---- metrics -----------------------------------------------------------------

const rows = (ids: string[]): RankedRow[] =>
  ids.map((profile_id, i) => ({ profile_id, rank: i + 1, total_score: 90 - i, fit_score: 80 - i }))

test('metrics: rank, hits at 5 and 10, decoy outside the top 10', () => {
  const ids = Array.from({ length: 12 }, (_, i) => `p${i + 1}`)
  const idOf = (h: string) => (h === 'missing' ? undefined : h)
  const m = measureTargets({ output: { rows: rows(ids), fallbackIds: [] }, survivorIds: new Set(ids) }, idOf, [
    { handle: 'p1', role: 'expected' },
    { handle: 'p6', role: 'expected' },
    { handle: 'p11', role: 'expected' },
    { handle: 'missing', role: 'expected' },
    { handle: 'p3', role: 'decoy' },
    { handle: 'p12', role: 'decoy' },
  ])
  assert.deepEqual(m.map((x) => x.rank), [1, 6, 11, null, 3, 12])
  assert.deepEqual(m.map((x) => x.top5), [true, false, false, false, true, false])
  assert.deepEqual(m.map((x) => x.top10), [true, true, false, false, true, false])
  assert.deepEqual(m.map((x) => x.passed), [true, true, false, false, false, true])
  assert.equal(m[0].total, 90)
  assert.equal(m[0].fit, 80)
  assert.equal(m[3].total, null)
  assert.equal(m[3].status, 'not_in_pool')
})

// Pool p1..p12. r1 and r2 were removed by a Required row. The AI side could not score f1 and f2
// (engine fallbacks); the manual side ranked them.
const survivorIds = new Set([...Array.from({ length: 12 }, (_, i) => `p${i + 1}`), 'f1', 'f2'])
const idOfAll = (h: string) => (h.startsWith('gone') ? undefined : h)
const statusTargets = [
  { handle: 'p1', role: 'expected' as const },
  { handle: 'f1', role: 'expected' as const },
  { handle: 'r1', role: 'expected' as const },
  { handle: 'gone1', role: 'expected' as const },
  { handle: 'p12', role: 'decoy' as const },
  { handle: 'f2', role: 'decoy' as const },
  { handle: 'r2', role: 'decoy' as const },
  { handle: 'gone2', role: 'decoy' as const },
]

test('statuses on the manual side: ranked, filtered and not in pool', () => {
  const manual = { rows: rows([...Array.from({ length: 12 }, (_, i) => `p${i + 1}`), 'f1', 'f2']), fallbackIds: [] }
  const m = measureTargets({ output: manual, survivorIds }, idOfAll, statusTargets)
  assert.deepEqual(m.map((x) => x.status), ['ranked', 'ranked', 'filtered', 'not_in_pool', 'ranked', 'ranked', 'filtered', 'not_in_pool'])
  // f1 ranked 13th: a miss. f2 ranked 14th: a decoy pass. A filtered decoy passes, a missing one never does.
  assert.deepEqual(m.map((x) => x.passed), [true, false, false, false, true, true, true, false])
})

test('statuses on the AI side: a fallback is never a hit and a fallback decoy never passes', () => {
  const ai = { rows: rows(Array.from({ length: 12 }, (_, i) => `p${i + 1}`)), fallbackIds: ['f1', 'f2'] }
  const m = measureTargets({ output: ai, survivorIds }, idOfAll, statusTargets)
  assert.deepEqual(m.map((x) => x.status), ['ranked', 'fallback', 'filtered', 'not_in_pool', 'ranked', 'fallback', 'filtered', 'not_in_pool'])
  assert.deepEqual(m.map((x) => x.passed), [true, false, false, false, true, false, true, false])
  assert.deepEqual(m.map((x) => x.rank), [1, null, null, null, 12, null, null, null])
  const s = summarize(m)
  assert.equal(s.decoysPassed, 2)
  assert.equal(s.hits10, 1)
  assert.equal(s.mrr, 1 / 4)
  assert.deepEqual(s.notRanked, { filtered: 2, fallback: 2, not_in_pool: 2 })
})

test('a survivor without a result row counts as a fallback even if the ranker did not report it', () => {
  const m = measureTargets({ output: { rows: [], fallbackIds: [] }, survivorIds: new Set(['x']) }, (h) => h, [{ handle: 'x', role: 'decoy' }])
  assert.equal(m[0].status, 'fallback')
  assert.equal(m[0].passed, false)
})

test('metrics: mean reciprocal rank counts an unranked expected handle as 0', () => {
  assert.equal(meanReciprocalRank([1, 2, null, 4]), (1 + 0.5 + 0 + 0.25) / 4)
  assert.equal(meanReciprocalRank([]), 0)
})

// ---- inputs ------------------------------------------------------------------

test('taxonomy rebuilt from the index gives the same index', () => {
  const t = taxonomyFromIndex(expertise)
  assert.deepEqual(buildExpertiseIndex(t.categories, t.items), expertise)
})

test('demo profiles: tuple entries become objects, a slug profile gets the seed handle and id', () => {
  const raw = {
    ...demo('x', 'unused'),
    handle: undefined,
    id: undefined,
    slug: 'yao-test',
    pt: ['now'],
    ft: ['from', 10, 40],
    updatedAt: undefined,
    updated: 5,
    history: [['Fictional Org', 'Engineer', 2015, null, 'Built systems']],
    education: [['Fictional University', 'MSc Engineering', 2010, 2012]],
    accreditations: [['Some Cert', 'Fictional Body', 2019]],
    additional: [['Fictional Org', 'Volunteer', 2018, 2019, 'Helped']],
    portfolio: [{ name: 'P1', org: 'Fictional Org', years: [2020, null], role: 'Lead', desc: 'Did it', images: ['A caption'], links: [['Site', 'https://example.org']] }],
  }
  const p = normalizeDemoProfile(raw, NOW)
  assert.equal(p.handle, 'demo-yao-test')
  assert.equal(p.id, demoUuid('demo-yao-test'))
  assert.equal(p.history[0].role, 'Engineer')
  assert.equal(p.history[0].organization, 'Fictional Org')
  assert.equal(p.education[0].degree_or_course, 'MSc Engineering')
  assert.equal(p.accreditations[0].name, 'Some Cert')
  assert.equal(p.additional[0].role, 'Volunteer')
  assert.equal(p.pt.status, 'available_now')
  assert.equal(p.ft.status, 'available_from')
  assert.equal(p.ft.from, '2026-11-30')
  assert.equal(p.updatedAt, '2026-11-15T00:00:00.000Z')
  assert.deepEqual(p.portfolio[0].links, [{ label: 'Site', url: 'https://example.org' }])
  assert.equal(p.portfolio[0].images[0].caption, 'A caption')
})

test('pool: listed demo profiles plus every fixture', () => {
  const fixtures = loadHardCases()
  const pool = buildPool(demoProfiles(), fixtures, NOW)
  const handles = pool.entries.map((e) => e.handle)
  assert.ok(handles.includes('demo-a'))
  assert.ok(!handles.includes('demo-c'), 'an unlisted profile stays out')
  for (const f of fixtures) assert.ok(handles.includes(f.hardCase.handle))
  assert.equal(pool.demoCount, 2)
  assert.equal(pool.fixtureCount, fixtures.length)
})

test('cases: five ToR shaped cases from expectations and one case per hard case', () => {
  const cases = buildCases(tors(), loadHardCases())
  const tor1 = cases.find((c) => c.id === 'tor-01')!
  assert.deepEqual(tor1.targets, [{ handle: 'demo-a', role: 'expected' }, { handle: 'demo-b', role: 'decoy' }])
  const hard = cases.filter((c) => c.kind === 'hard')
  assert.equal(hard.length, 5)
  const decoy = hard.find((c) => c.id === 'hard-5')!
  assert.deepEqual(decoy.targets, [{ handle: 'hard-daniel-boateng', role: 'decoy' }])
  assert.equal(hard.find((c) => c.id === 'hard-1')!.targets[0].role, 'expected')
})

// ---- rankings ----------------------------------------------------------------

test('both rankers get the same pool, after the Must haves', async () => {
  const pool = buildPool(demoProfiles(), loadHardCases(), NOW)
  const seen: Record<string, string[][]> = { manual: [], ai: [] }
  const spy = (name: 'manual' | 'ai'): Ranker => async (input) => {
    seen[name].push(input.survivors.map((c) => c.profile.id))
    return { rows: rows(input.survivors.map((c) => c.profile.id)), fallbackIds: [] }
  }
  const runs = await runRankings(
    tors().map((t) => ({ tor: t, rawText: JD })),
    pool,
    { expertise, orgs: buildOrgIndex([]), extractionContext: { taxonomy: { categories, items }, locationOptions: [], languageOptions: [] } },
    { manual: spy('manual'), ai: spy('ai') },
  )
  assert.equal(runs.length, 3)
  assert.deepEqual(seen.manual, seen.ai)
  // tor-01 requires fluent English: demo-b (French only) is filtered out.
  const tor1 = seen.manual[0]
  assert.ok(tor1.includes(A))
  assert.ok(!tor1.includes(B))
  assert.ok(seen.manual[1].includes(B), 'no Must have in tor-03, so demo-b stays')
  assert.equal(runs[0].pool, tor1.length)
})

test('manual ranker is the placeholder scorePool, best first', async () => {
  const pool = buildPool(demoProfiles(), [], NOW)
  const out = await manualRanker()({
    torId: 'tor-01',
    rawText: JD,
    extracted: null,
    requirements: reqs(),
    survivors: pool.entries.map((e) => e.candidate),
    expertise,
    orgs: buildOrgIndex([]),
  })
  assert.equal(out.rows.length, 2)
  assert.deepEqual(out.rows.map((r) => r.rank), [1, 2])
  assert.ok(out.rows[0].total_score >= out.rows[1].total_score)
})

// ---- the command -------------------------------------------------------------

test('fake run: prints a table of handles, ranks and scores, never profile or JD text', async () => {
  const printed: string[] = []
  const out = await runCompare(inputs({ print: (l) => printed.push(l) }))
  const text = [out.markdown, ...printed].join('\n')
  assert.match(out.markdown, /\| Measure \| Manual/)
  assert.match(out.markdown, /hard-achieng-odhiambo/)
  assert.match(out.markdown, /demo-a/)
  assert.ok(!text.includes('SENTINEL'), 'no demo profile or JD text')
  for (const f of loadHardCases()) {
    for (const s of fixtureStrings(f.demo).filter((s) => s.length > 25)) {
      assert.ok(!text.includes(s), `fixture text leaked for ${f.hardCase.handle}`)
    }
  }
  // Two sets, never combined: the customer ToRs (3 expected, 1 decoy) and the hard set (4 and 1).
  for (const side of ['manual', 'ai'] as const) {
    assert.equal(out.report.summary.tor[side].expectedTotal, 3)
    assert.equal(out.report.summary.tor[side].decoysTotal, 1)
    assert.equal(out.report.summary.hard[side].expectedTotal, 4)
    assert.equal(out.report.summary.hard[side].decoysTotal, 1)
  }
  assert.match(out.markdown, /## Primary measure: customer ToR set/)
  assert.match(out.markdown, /## Loop8 hard set/)
  assert.equal(out.markdown.match(/\| Expected handles in top 10 \|/g)?.length, 2, 'one summary per set and no combined one')
  assert.ok(out.markdown.indexOf('customer ToR set') < out.markdown.indexOf('Loop8 hard set'), 'the customer set comes first')
  assert.equal(out.report.hard.length, 5)
  for (const h of out.report.hard) assert.ok(['fails', 'passes', 'filtered', 'fallback', 'not_in_pool'].includes(h.placeholder))
})

test('fake run reads taxonomy and organizations through the reader, no profile rows', async () => {
  const calls: string[] = []
  await runCompare(inputs({ reader: fakeReader(calls) }))
  assert.deepEqual(calls.sort(), ['lists', 'scoring:0'])
})

test('live mode refuses without --confirm-live, before any read or call', async () => {
  const calls: string[] = []
  let built = false
  await assert.rejects(
    runCompare(inputs({ models: 'live', reader: fakeReader(calls), live: async () => { built = true; throw new Error('no') } })),
    /live_requires_confirm/,
  )
  assert.deepEqual(calls, [])
  assert.equal(built, false)
})

test('live mode prints the planned calls first, reuses the artifact and embeds the fixtures only', async () => {
  const events: string[] = []
  const dims = 32
  const demos = [demo('demo-a', A), { ...demo('x', 'unused'), handle: undefined, id: undefined, slug: 'slugged' }]
  // The prebuilt artifact keys profiles by demoKey (id, or the derived database id for the id-less ones).
  const fragments = demos.flatMap((d) => toFragments(fromDemoSeed(d as never)))
  assert.ok(fragments.some((f) => f.profileId === demoKey(demos[1] as never)))
  const artifactRaw = JSON.stringify({
    modelVersion: 'live-embed-1',
    indexVersion: 'live-idx',
    dimensions: dims,
    fragments: fragments.map((f) => ({ ...f, vector: fakeVector(f.text, dims) })),
  })
  const fixtures = loadHardCases()
  const fixtureFragments = fixtures.flatMap((f) => toFragments(f.source)).length
  const out = await runCompare(inputs({
    models: 'live',
    confirmLive: true,
    demoProfiles: demos,
    print: (l) => events.push(`print:${l}`),
    live: async () => ({
      embed: async (t: string) => { events.push('embed'); return fakeVector(t, dims) },
      embedModelId: 'live-embed-1',
      embedDimensions: dims,
      textModel: createFakeTextModel(),
      readArtifact: () => artifactRaw,
    }),
  }))
  const firstEmbed = events.indexOf('embed')
  const plan = events.findIndex((e) => e.startsWith('print:') && /planned/i.test(e))
  assert.ok(plan >= 0 && plan < firstEmbed, 'plan printed before the first call')
  // One query per run: three customer ToR runs and three hard set runs (tor-01, tor-03, tor-05).
  assert.equal(events.filter((e) => e === 'embed').length, fixtureFragments + 6)
  assert.match(events[plan], new RegExp(`${fixtureFragments + 6} embed calls`))
  for (const r of out.report.runs) assert.equal(r.ai.fallbackIds.length, 0, `every pool profile indexed in ${r.tor}`)
})

// ---- fix round 1: live checks, warnings, filtered fixtures, fallback decoys --------

/** A live artifact over the given demo profiles, with fake vectors. */
function liveArtifactRaw(demos: Record<string, unknown>[], dims: number, modelVersion = 'live-embed-1'): string {
  const fragments = demos.flatMap((d) => toFragments(fromDemoSeed(d as never)))
  return JSON.stringify({
    modelVersion,
    indexVersion: 'live-idx',
    dimensions: dims,
    fragments: fragments.map((f) => ({ ...f, vector: fakeVector(f.text, dims) })),
  })
}

function liveDeps(raw: string, dims: number, events: string[], over: { embedModelId?: string; embedDimensions?: number } = {}) {
  return async () => ({
    embed: async (t: string) => { events.push('embed'); return fakeVector(t, dims) },
    embedModelId: over.embedModelId ?? 'live-embed-1',
    embedDimensions: over.embedDimensions ?? dims,
    textModel: createFakeTextModel(),
    readArtifact: () => raw,
  })
}

test('live mode stops on an artifact model or dimension mismatch before any embed call or plan', async () => {
  const demos = [demo('demo-a', A)]
  for (const [over, code] of [
    [{ embedModelId: 'other-model' }, /embedding_model_mismatch/],
    [{ embedDimensions: 64 }, /embedding_dimension_mismatch/],
  ] as const) {
    const events: string[] = []
    await assert.rejects(
      runCompare(inputs({
        models: 'live', confirmLive: true, demoProfiles: demos,
        print: (l) => events.push(`print:${l}`),
        live: liveDeps(liveArtifactRaw(demos, 32), 32, events, over),
      })),
      code,
    )
    assert.deepEqual(events, [], 'no plan and no embed call')
  }
})

test('a handle missing from the pool is warned by handle and counted as not in pool, never as a pass', async () => {
  const warned: string[] = []
  const t = tors()
  t[1].checks = [{ type: 'decoy', handle: 'demo-gone', expect: 'not_top10' }]
  const out = await runCompare(inputs({ tors: t, warn: (l) => warned.push(l) }))
  assert.deepEqual(warned, ['Handle not in the pool: demo-gone'])
  const c = out.report.cases.find((x) => x.case.id === 'tor-03')!
  for (const side of [c.manual, c.ai]) {
    assert.equal(side[1].status, 'not_in_pool')
    assert.equal(side[1].passed, false)
  }
  assert.equal(out.report.summary.tor.manual.decoysPassed, 1, 'only the tor-01 decoy, filtered by its Required row')
})

test('a fixture removed by a Required row shows filtered, not a placeholder fail', async () => {
  const t = tors()
  t[1].requirements = reqs([{ id: 'r-eo', kind: 'language', level: 'must', source: 'manual', value: { values: ['Esperanto'], min: 'working' } } as Requirement])
  const out = await runCompare(inputs({ tors: t }))
  const h3 = out.report.hard.find((h) => h.id === 'hard-3')!
  assert.equal(h3.placeholder, 'filtered')
  assert.equal(h3.manual.status, 'filtered')
  assert.equal(h3.ai.status, 'filtered')
  assert.match(out.markdown, /\| hard-3 \| tor-03 \| hard-nour-obeidat \| [a-z_]+ \| top10 \| filtered \| filtered \| filtered \| no \|/)
})

test('end to end: a decoy the AI engine could not score is shown as fallback and does not pass', async () => {
  // demo-b is in the pool but missing from the prebuilt artifact, so the engine falls back on it.
  const dims = 32
  const events: string[] = []
  const demos = [demo('demo-a', A), demo('demo-b', B)]
  const t = tors().map((x) => ({ ...x, requirements: reqs() }))
  const out = await runCompare(inputs({
    tors: t, models: 'live', confirmLive: true, demoProfiles: demos,
    live: liveDeps(liveArtifactRaw([demos[0]], dims), dims, events),
  }))
  const c = out.report.cases.find((x) => x.case.id === 'tor-01')!
  assert.equal(c.manual[1].status, 'ranked')
  assert.equal(c.ai[1].status, 'fallback')
  assert.equal(c.ai[1].passed, false)
  assert.equal(out.report.summary.tor.ai.decoysPassed, 0)
  assert.equal(out.report.summary.tor.ai.notRanked.fallback, 1)
  assert.ok(out.report.runs[0].ai.fallbackIds.includes(B))
  assert.match(out.markdown, /\| tor-01 \| demo-b \| decoy \| #\d+ \| \d+\/\d+ \| fallback \|  \| (yes|no) \| no \|/)
})

// ---- final fix wave -------------------------------------------------------------

const fixtureIds = () => new Set(loadHardCases().map((f) => f.candidate.profile.id))

test('the customer ToR set ranks the demo profiles only; the hard set runs separately with the fixtures', async () => {
  const out = await runCompare(inputs())
  const torRuns = out.report.runs.filter((r) => r.set === 'tor')
  const hardRuns = out.report.runs.filter((r) => r.set === 'hard')
  assert.deepEqual(torRuns.map((r) => r.tor), ['tor-01', 'tor-03', 'tor-05'])
  assert.deepEqual(hardRuns.map((r) => r.tor).sort(), ['tor-01', 'tor-03', 'tor-05'])
  const fx = fixtureIds()
  for (const r of torRuns) {
    for (const id of r.survivorIds) assert.ok(!fx.has(id), `no fixture in the customer pool of ${r.tor}`)
    for (const id of [...r.manual.rows, ...r.ai.rows].map((x) => x.profile_id)) assert.ok(!fx.has(id))
  }
  for (const f of loadHardCases()) {
    const run = hardRuns.find((r) => r.tor === f.hardCase.tor)!
    assert.ok(run.survivorIds.has(f.candidate.profile.id), `${f.hardCase.id} is in its hard set pool`)
  }
  // Each hard case is measured on its own set's run, where its fixture is ranked.
  assert.ok(out.report.cases.filter((c) => c.case.kind === 'hard').every((c) => c.manual[0].status === 'ranked'))
})

test('runRankings gives the AI side the extraction the manual side computes, never null', async () => {
  const pool = buildPool(demoProfiles(), [], NOW)
  const seen: Record<string, (ExtractedRequirements | null)[]> = { manual: [], ai: [] }
  const spy = (name: 'manual' | 'ai'): Ranker => async (input) => {
    seen[name].push(input.extracted)
    return { rows: rows(input.survivors.map((c) => c.profile.id)), fallbackIds: [] }
  }
  await runRankings(
    tors().map((t) => ({ tor: t, rawText: JD })),
    pool,
    { expertise, orgs: buildOrgIndex([]), extractionContext: { taxonomy: { categories, items }, locationOptions: ['Ethiopia'], languageOptions: [] } },
    { manual: spy('manual'), ai: spy('ai') },
  )
  assert.equal(seen.ai.length, 3)
  for (const e of seen.ai) assert.notEqual(e, null)
  assert.deepEqual(seen.ai, seen.manual)
})

/** An in-memory index over the given pool entries, with fake vectors. */
function artifactOf(entries: { source: Parameters<typeof toFragments>[0] }[], dims: number) {
  const fragments = entries
    .flatMap((e) => toFragments(e.source))
    .map((f) => ({ fragmentId: f.fragmentId, profileId: f.profileId, type: f.type, text: f.text, vector: fakeVector(f.text, dims) }))
  return { modelVersion: 'fake-embed', indexVersion: 'test', dimensions: dims, fragments }
}

test('the AI engine reads the run extraction: its extraction function returns it, and its places leave the query', async () => {
  const dims = 32
  const pool = buildPool(demoProfiles(), [], NOW)
  const artifact = artifactOf(pool.entries, dims)
  const jd = `${JD} Based in Quillanbury.`
  const extracted = { expertise: [], locations: [{ value: 'Quillanbury', mentions: 1 }], languages: [], hiring_organization: null } as ExtractedRequirements
  const runWith = async (ex: ExtractedRequirements | null) => {
    const queries: string[] = []
    const returned: unknown[] = []
    const embed = createFakeEmbed(dims)
    const ranker = aiRanker({
      artifact,
      embed: async (t) => { queries.push(t); return embed(t) },
      textModel: createFakeTextModel(),
      settings: loadSettings({}),
      exclude: { orgNames: [], languages: [] },
      createEngine: (opts) => createSemanticEngine({
        ...opts,
        extraction: async (id) => { const v = await opts.extraction!(id); returned.push(v); return v },
      }),
    })
    await ranker({ torId: 'tor-01', rawText: jd, extracted: ex, requirements: reqs(), survivors: pool.entries.map((e) => e.candidate), expertise, orgs: buildOrgIndex([]) })
    return { queries, returned }
  }
  const withEx = await runWith(extracted)
  assert.deepEqual(withEx.returned, [{ extracted, hiringOrganization: null }])
  assert.ok(withEx.queries.length > 0)
  for (const q of withEx.queries) assert.ok(!q.includes('Quillanbury'), 'the extracted place is removed from the query')
  // Control: without the extraction the place stays, so the exclusion comes from the extraction.
  const without = await runWith(null)
  assert.ok(without.queries.some((q) => q.includes('Quillanbury')))
})

test('live mode without --confirm-live prints the planned counts only, with no read and no call', () => {
  const printed: string[] = []
  const fixtures = loadHardCases()
  const settings = loadSettings({})
  printLivePlan({ tors: tors(), demoProfiles: demoProfiles(), fixtures, settings, print: (l) => printed.push(l) })
  assert.equal(printed.length, 1)
  const fixtureFragments = fixtures.flatMap((f) => toFragments(f.source)).length
  // 2 listed demo profiles; the ToR runs rank them, the hard runs rank them plus the 5 fixtures.
  const textCalls =
    3 * (Math.min(settings.fitCap, 2) + settings.summaryCount) + 3 * (Math.min(settings.fitCap, 2 + fixtures.length) + settings.summaryCount)
  assert.match(printed[0], new RegExp(`${fixtureFragments + 6} embed calls`))
  assert.match(printed[0], new RegExp(`at most ${textCalls} text model calls`))
  assert.match(printed[0], /--confirm-live/)
  assert.ok(!printed[0].includes('SENTINEL'))
})

test('ties: tied adjacent pairs in the top 10, as the baseline harness counts them', () => {
  const r = (scores: number[]): RankedRow[] => scores.map((s, i) => ({ profile_id: `p${i}`, rank: i + 1, total_score: s, fit_score: s }))
  assert.equal(tiedPairsTop10(r([90, 90, 80, 80, 80, 70, 60, 50, 40, 30, 30])), 3)
  assert.equal(tiedPairsTop10(r([90, 80])), 0)
  assert.equal(tiedPairsTop10([]), 0)
})

test('the runs table shows tied pairs in the top 10 per ranker and per set', async () => {
  const out = await runCompare(inputs())
  assert.ok(out.markdown.includes('| Set | ToR | Pool after Required | Manual ranked | AI ranked | AI fallbacks | Manual ties in top 10 | AI ties in top 10 |'))
  for (const r of out.report.runs) {
    const line = `| ${r.set} | ${r.tor} | ${r.pool} | ${r.manual.rows.length} | ${r.ai.rows.length} | ${r.ai.fallbackIds.length} | ${tiedPairsTop10(r.manual.rows)} | ${tiedPairsTop10(r.ai.rows)} |`
    assert.ok(out.markdown.includes(line), `runs row for ${r.set} ${r.tor}`)
  }
})

test('profile dates come from one fixed reference date, not the run date', async () => {
  const slug = { ...demo('x', 'unused'), handle: undefined, id: undefined, slug: 'dated', updatedAt: undefined, updated: 5 }
  const pool = buildPool([slug], loadHardCases())
  const d = pool.entries.find((e) => e.handle === 'demo-dated')!
  assert.equal(d.candidate.profile.availability_updated_at, new Date(REFERENCE_DATE.getTime() - 5 * 86_400_000).toISOString())
  for (const e of pool.entries.filter((x) => x.fixture)) assert.equal(e.candidate.profile.availability_updated_at, REFERENCE_DATE.toISOString())
  // Two runs on different days rank identically.
  const a = await runCompare(inputs({ demoProfiles: [...demoProfiles(), slug], now: new Date('2026-11-20T00:00:00Z') }))
  const b = await runCompare(inputs({ demoProfiles: [...demoProfiles(), slug], now: new Date('2027-03-02T00:00:00Z') }))
  assert.deepEqual(a.report.runs.map((r) => r.manual.rows), b.report.runs.map((r) => r.manual.rows))
  assert.equal(a.report.referenceDate, REFERENCE_DATE.toISOString())
})

const BASELINE_SAMPLE = [
  '## Summary',
  '',
  '**Fixed requirements:** 14/14 expected in top 10, 13/14 in top 5, checks 13/14. **End to end:** 12/14 expected in top 10, 11/14 in top 5, checks 10/14.',
].join('\n')

test('baseline parser reads the fixed requirements top 5 and top 10 counts', () => {
  assert.deepEqual(parseBaselineFixed(BASELINE_SAMPLE), { top5: { hits: 13, total: 14 }, top10: { hits: 14, total: 14 } })
  assert.equal(parseBaselineFixed('no summary here'), null)
})

test('the run prints whether the manual side reproduces the baseline counts', async () => {
  const printed: string[] = []
  const first = await runCompare(inputs())
  const m = first.report.summary.tor.manual
  const same = `**Fixed requirements:** ${m.hits10}/${m.expectedTotal} expected in top 10, ${m.hits5}/${m.expectedTotal} in top 5, checks 1/1.`
  const out = await runCompare(inputs({ baselineMarkdown: same, print: (l) => printed.push(l) }))
  const line = printed.find((l) => l.startsWith('Manual side against ranking-baseline.md'))
  assert.ok(line, 'the check line is printed')
  assert.match(line!, /: match$/)
  assert.ok(out.markdown.includes(line!))
  const other = `**Fixed requirements:** ${m.hits10}/${m.expectedTotal + 1} expected in top 10, ${m.hits5}/${m.expectedTotal} in top 5.`
  assert.match(baselineCheckLine(m, other), /: mismatch$/)
  assert.match(baselineCheckLine(m, undefined), /not checked/)
})

test('a fixture handle mismatch throws a code the runner prints as is', () => {
  const dir = mkdtempSync(join(tmpdir(), 'compare-fixture-'))
  writeFileSync(join(dir, 'cases.json'), JSON.stringify({ cases: [{ id: 'hard-1', tor: 'tor-01', handle: 'hard-one' }] }))
  writeFileSync(join(dir, 'hard-one.json'), JSON.stringify({ handle: 'hard-other' }))
  assert.throws(() => loadHardCases(dir), (err: Error) => {
    assert.equal(err.message, 'fixture_handle_mismatch: hard-1')
    assert.equal(safeError(err), 'fixture_handle_mismatch: hard-1')
    return true
  })
  assert.equal(safeError(new Error('https://example.org secret')), 'Error')
})
