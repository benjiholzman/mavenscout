import test from 'node:test'
import assert from 'node:assert/strict'
import { runEngine } from '../src/core/run'
import { bandFor } from '../../../src/lib/matching/config'
import type { RunIO } from '../src/core/run'
import { loadSettings } from '../src/core/settings'
import { createSemanticEngine } from '../src/engine/semantic'
import type { IndexArtifact } from '../src/search/artifact'
import { TerminalError } from '../src/core/errors'
import { DEFAULT_LIMITS } from '../src/shared/limits'
import type { JdMatchResult, RankJob } from '../src/core/types'
import { scoreCandidate } from '../src/scoring/score'
import { FIT_PROMPT_VERSION } from '../src/stage2/fit'
import { SUMMARY_PROMPT_VERSION } from '../src/stage2/summary'
import { buildExpertiseIndex } from '../../../src/lib/expertise'
import { buildOrgIndex } from '../../../src/lib/organizations'
import type { CandidateInput } from '../../../src/lib/matching/fit'
import type { Requirement } from '../../../src/lib/matching/types'
import type { Profile, TaxonomyCategory, TaxonomyItem } from '../../../src/types/db'
import type { TextModel, TextRequest } from '../src/models/text-model'
import type { Extraction, ScoringData } from '../src/data/supabase'

const artifact: IndexArtifact = {
  modelVersion: 'fake-embed-1',
  indexVersion: 'idx-1',
  dimensions: 2,
  fragments: [
    { fragmentId: 'a1', profileId: 'a', type: 'portfolio', text: 'SECRET-A', vector: [1, 0] },
    { fragmentId: 'b1', profileId: 'b', type: 'employer', text: 'SECRET-B', vector: [0.8, 0.6] },
    { fragmentId: 'c1', profileId: 'c', type: 'skill', text: 'SECRET-C', vector: [0, 1] },
  ],
}

const job: RankJob = {
  jobId: 'j1', jobDescriptionId: 'jd1', requirements: [], poolIds: ['a', 'b', 'c', 'd'], jdText: 'Water sanitation expert',
}

function makeIO(threshold: number | null, existing: JdMatchResult[] = []) {
  const io: RunIO = {
    settings: { ...loadSettings({}), threshold },
    existing,
    saveCheckpoint: async () => {},
    saveFallback: async () => {},
  }
  return io
}

const embed = async () => [1, 0]

test('modelIds and promptVersion', () => {
  const e = createSemanticEngine({ artifact, embed })
  assert.deepEqual(e.modelIds, { embed: 'fake-embed-1', fit: 'similarity-estimate', index: 'idx-1' })
  assert.equal(e.promptVersion, 'none')
})

test('missing or blank jdText throws jd_text_required', async () => {
  const e = createSemanticEngine({ artifact, embed })
  await assert.rejects(runEngine({ ...job, jdText: undefined }, e, makeIO(null)), /jd_text_required/)
  await assert.rejects(runEngine({ ...job, jdText: '  ' }, e, makeIO(null)), /jd_text_required/)
})

test('dimension mismatch throws', async () => {
  const e = createSemanticEngine({ artifact, embed: async () => [1, 0, 0] })
  await assert.rejects(runEngine(job, e, makeIO(null)), /embedding_dimension_mismatch/)
})

test('notIndexed become fallbacks and the job is PARTIAL', async () => {
  const e = createSemanticEngine({ artifact, embed })
  const out = await runEngine(job, e, makeIO(null))
  assert.equal(out.state, 'PARTIAL')
  assert.deepEqual(out.fallbacks, [{ profileId: 'd', reason: 'not_indexed' }])
  assert.equal(out.results.length, 3)
})

test('threshold splits shortlisted and capped estimates, results are ranked', async () => {
  const e = createSemanticEngine({ artifact, embed })
  const out = await runEngine({ ...job, poolIds: ['a', 'b', 'c'] }, e, makeIO(0.5))
  assert.equal(out.state, 'DONE')
  assert.deepEqual(out.results.map((r) => [r.profile_id, r.rank, r.fit_score]), [['a', 1, 100], ['b', 2, 80], ['c', 3, 0]])
  const low = createSemanticEngine({ artifact, embed })
  const out2 = await runEngine({ ...job, poolIds: ['a', 'b', 'c'] }, low, makeIO(0.9))
  const b = out2.results.find((r) => r.profile_id === 'b') as JdMatchResult
  assert.equal(b.fit_score, 49)
  assert.equal(b.total_score, 49)
  assert.match(b.narrative, /below the similarity threshold/)
  assert.match(b.narrative, /estimate/)
  assert.match(b.narrative, /employer/)
  assert.doesNotMatch(b.narrative, /SECRET/)
  assert.deepEqual(b.adjustments, [])
  assert.deepEqual(b.scoring, { weight: 0, earned: 0, possible: 0 })
})

test('threshold null shortlists all', async () => {
  const e = createSemanticEngine({ artifact, embed })
  const out = await runEngine({ ...job, poolIds: ['a', 'b', 'c'] }, e, makeIO(null))
  for (const r of out.results) assert.doesNotMatch(r.narrative, /below the similarity threshold|shortlist limit/)
  assert.equal(out.results.find((r) => r.profile_id === 'b')?.fit_score, 80)
})

test('cap hit is recorded and cut candidates are capped at 49 with a limit narrative', async () => {
  const e = createSemanticEngine({ artifact, embed, cap: 1 })
  const out = await runEngine({ ...job, poolIds: ['a', 'b', 'c'] }, e, makeIO(null))
  assert.ok(out.record.some((p) => p.phase === 'stage1_cap_hit' && p.durationMs === 0))
  const b = out.results.find((r) => r.profile_id === 'b') as JdMatchResult
  assert.equal(b.fit_score, 49)
  assert.match(b.narrative, /shortlist limit/)
  assert.doesNotMatch(b.narrative, /below the similarity threshold/)
  assert.ok(out.record.some((p) => p.phase === 'embed_query'))
  assert.ok(out.record.some((p) => p.phase === 'search'))
})

test('isDone profiles are skipped', async () => {
  const existing: JdMatchResult[] = [{
    profile_id: 'a', rank: 0, fit_score: 7, total_score: 7, band: bandFor(7),
    adjustments: [], scoring: { weight: 0, earned: 0, possible: 0 }, must_haves_passed: [], narrative: 'old',
  }]
  const e = createSemanticEngine({ artifact, embed })
  const out = await runEngine(job, e, makeIO(null, existing))
  assert.equal(out.results.find((r) => r.profile_id === 'a')?.narrative, 'old')
})

test('exclusions are applied to the text passed to embed', async () => {
  let seen = ''
  const e = createSemanticEngine({
    artifact,
    embed: async (t) => { seen = t; return [1, 0] },
    exclude: { orgNames: ['UNICEF'] },
  })
  await runEngine({ ...job, jdText: 'Work with UNICEF on water' }, e, makeIO(null))
  assert.equal(seen, 'Work with on water')
})

test('non-finite embedding values throw embedding_not_finite', async () => {
  const e = createSemanticEngine({ artifact, embed: async () => [NaN, 0] })
  await assert.rejects(runEngine(job, e, makeIO(null)), /embedding_not_finite/)
})

test('modelIds record the index version', () => {
  const e = createSemanticEngine({ artifact, embed })
  assert.deepEqual(e.modelIds, { embed: 'fake-embed-1', fit: 'similarity-estimate', index: 'idx-1' })
})

test('embedModelId must match the artifact model version, checked before embed', async () => {
  let called = false
  const spy = async () => { called = true; return [1, 0] }
  const bad = createSemanticEngine({ artifact, embed: spy, embedModelId: 'other-model' })
  await assert.rejects(runEngine(job, bad, makeIO(null)), /embedding_model_mismatch/)
  assert.equal(called, false)
  const ok = createSemanticEngine({ artifact, embed: spy, embedModelId: 'fake-embed-1' })
  await runEngine(job, ok, makeIO(null))
  assert.equal(called, true)
})

test('engine errors are TerminalError', async () => {
  const e = createSemanticEngine({ artifact, embed })
  await assert.rejects(runEngine({ ...job, jdText: ' ' }, e, makeIO(null)), (err: unknown) => err instanceof TerminalError && err.code === 'jd_text_required')
  const m = createSemanticEngine({ artifact, embed, embedModelId: 'x' })
  await assert.rejects(runEngine(job, m, makeIO(null)), (err: unknown) => err instanceof TerminalError && err.code === 'embedding_model_mismatch')
  const d = createSemanticEngine({ artifact, embed: async () => [1] })
  await assert.rejects(runEngine(job, d, makeIO(null)), (err: unknown) => err instanceof TerminalError && err.code === 'embedding_dimension_mismatch')
  const n = createSemanticEngine({ artifact, embed: async () => [NaN, 0] })
  await assert.rejects(runEngine(job, n, makeIO(null)), (err: unknown) => err instanceof TerminalError && err.code === 'embedding_not_finite')
})

test('default cap is DEFAULT_LIMITS.maxDeepScored', async () => {
  const many: IndexArtifact = {
    ...artifact,
    fragments: Array.from({ length: DEFAULT_LIMITS.maxDeepScored + 1 }, (_, i) => ({
      fragmentId: `f${i}`, profileId: `p${i}`, type: 'skill', text: 't', vector: [1, 0],
    })),
  }
  const ids = many.fragments.map((f) => f.profileId)
  const e = createSemanticEngine({ artifact: many, embed })
  const out = await runEngine({ ...job, poolIds: ids }, e, makeIO(null))
  assert.equal(out.results.filter((r) => /shortlist limit/.test(r.narrative)).length, 1)
})

test('cap hit logs stage1_cap_hit with the job id and cap', async () => {
  const lines: string[] = []
  const orig = console.log
  console.log = (s: string) => { lines.push(s) }
  try {
    const e = createSemanticEngine({ artifact, embed, cap: 1 })
    await runEngine(job, e, makeIO(null))
  } finally {
    console.log = orig
  }
  const hit = lines.map((l) => JSON.parse(l)).find((l) => l.event === 'stage1_cap_hit')
  assert.ok(hit)
  assert.equal(hit.jobId, 'j1')
  assert.equal(hit.cap, 1)
})

test('with a threshold, an above-threshold candidate cut by the cap gets the limit narrative', async () => {
  const e = createSemanticEngine({ artifact, embed, cap: 1 })
  const out = await runEngine({ ...job, poolIds: ['a', 'b', 'c'] }, e, makeIO(0.5))
  const b = out.results.find((r) => r.profile_id === 'b') as JdMatchResult
  assert.equal(b.fit_score, 49)
  assert.match(b.narrative, /shortlist limit/)
  assert.doesNotMatch(b.narrative, /below the similarity threshold/)
  const c = out.results.find((r) => r.profile_id === 'c') as JdMatchResult
  assert.match(c.narrative, /below the similarity threshold/)
})

test('query drops the exclusions of the options and of the requirements', async () => {
  const seen: string[] = []
  const e = createSemanticEngine({
    artifact,
    embed: async (t) => { seen.push(t); return [1, 0] },
    exclude: { orgNames: ['UNICEF'] },
  })
  const requirements = [
    { id: 'r1', kind: 'location', level: 'must', source: 'manual', value: { values: ['Nairobi, Kenya'] } },
    { id: 'r2', kind: 'language', level: 'strong', source: 'manual', value: { values: ['French'] } },
    { id: 'r3', kind: 'org_history', level: 'slight', source: 'manual', value: { org: 'World Bank', scope: 'ever', peers: ['ADB'] } },
  ] as unknown as RankJob['requirements']
  await runEngine(
    { ...job, requirements, jdText: 'Water expert in Nairobi for UNICEF, World Bank, ADB, speaks French, Kenya' },
    e,
    makeIO(null),
  )
  assert.deepEqual(seen, ['Water expert in for , , , speaks ,'])
})

// ---- Stage 2 (Fit, scoring, summaries) ----------------------------------------

const track = { status: 'available_now' as const, from: null, until: null }
function profile(over: Partial<Profile>): Profile {
  return {
    id: 'p', user_id: null, consultant_type: 'Individual', handle: 'p', name: 'P', headline: 'Evaluation specialist',
    location: 'Nairobi, Kenya', career_level: 'senior', year_founded: null, contracting_work_eligibility: null,
    work_types: ['Remote'], part_time_availability: track, full_time_availability: track, availability_updated_at: null,
    photo_url: null, cover_image_url: null, resume_path: null, resume_url: null, detailed_bio: null,
    tiered_expertise: [], accreditations: [], spoken_languages: [], work_history: [], education_history: [],
    additional_experience: [], website_name: null, website_url: null, social_links: [], email: null,
    testimonial_grace_until: null, verification_recheck_until: null, is_premium: false, custom_domain: null,
    subscription_status: 'none', approval_status: 'approved', submitted_at: null, is_demo: true,
    created_at: '2026-01-01', updated_at: '2026-01-01', ...over,
  } as Profile
}

const cats: TaxonomyCategory[] = [{ id: 'c1', type: 'expertise', name: 'Health', sort_order: 1 }]
const items: TaxonomyItem[] = [{ id: 'i1', category_id: 'c1', name: 'Health systems', sort_order: 1, kind: 'sector' }]
const expertiseIdx = buildExpertiseIndex(cats, items)
const orgIdx = buildOrgIndex([])

// Five indexed profiles with similarity falling from p1 to p5.
const ids5 = ['p1', 'p2', 'p3', 'p4', 'p5']
const art5: IndexArtifact = {
  modelVersion: 'fake-embed-1',
  indexVersion: 'idx-1',
  dimensions: 2,
  fragments: ids5.map((id, i) => ({
    fragmentId: `${id}#portfolio#0`, profileId: id, type: 'portfolio', text: `EV-${id}`,
    vector: [Math.cos(i * 0.2), Math.sin(i * 0.2)],
  })),
}
const inputs = new Map<string, CandidateInput>(ids5.map((id, i) => [id, {
  profile: profile({ id, handle: id, name: `Name ${id}`, tiered_expertise: i % 2 === 0 ? [{ name: 'Health systems', tier: 'core' }] : [] }),
  portfolio: [],
}]))
const scoringData = async (ids: string[]): Promise<ScoringData> => ({
  candidates: ids.flatMap((id) => (inputs.has(id) ? [inputs.get(id) as CandidateInput] : [])),
  expertise: expertiseIdx,
  orgs: orgIdx,
  missing: ids.filter((id) => !inputs.has(id)),
})
const reqs = [
  { id: 'r1', kind: 'expertise', level: 'strong', source: 'jd', value: { name: 'Health systems' } },
] as unknown as Requirement[]
const fitByProfile: Record<string, number> = { p1: 90, p2: 70, p3: 60, p4: 55, p5: 40 }
const summaryText = Array.from({ length: 45 }, (_, i) => `s${i}`).join(' ')

interface FakeModel { model: TextModel; fitCalls: TextRequest[]; summaryCalls: TextRequest[]; maxInFlight: () => number }
function fakeModel(opts: { failFit?: string[]; failSummary?: boolean; emptySummary?: boolean; delayMs?: number } = {}): FakeModel {
  const fitCalls: TextRequest[] = []
  const summaryCalls: TextRequest[] = []
  let inFlight = 0
  let max = 0
  const model: TextModel = async (req) => {
    inFlight++
    max = Math.max(max, inFlight)
    try {
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs))
      if (req.system.startsWith('You judge')) {
        fitCalls.push(req)
        const id = ids5.find((p) => req.user.includes(`EV-${p}`)) ?? 'none'
        if (opts.failFit?.includes(id)) throw new Error('MODEL-ERROR-TEXT')
        return { text: JSON.stringify({ fit: fitByProfile[id] ?? 50, fragmentIds: ['E1'], reason: 'ok' }), inputTokens: 100, outputTokens: 10 }
      }
      summaryCalls.push(req)
      if (opts.failSummary) throw new Error('MODEL-ERROR-TEXT')
      return { text: opts.emptySummary ? '' : summaryText, inputTokens: 200, outputTokens: 60 }
    } finally {
      inFlight--
    }
  }
  return { model, fitCalls, summaryCalls, maxInFlight: () => max }
}

const job5: RankJob = { jobId: 'j5', jobDescriptionId: 'jd5', requirements: reqs, poolIds: ids5, jdText: 'Health systems evaluation' }

function io5(over: Partial<ReturnType<typeof loadSettings>> = {}, existing: JdMatchResult[] = []): RunIO {
  return {
    settings: { ...loadSettings({}), summaryCount: 2, ...over },
    existing,
    saveCheckpoint: async () => {},
    saveFallback: async () => {},
  }
}

const stage2 = (m: FakeModel, extra: Partial<Parameters<typeof createSemanticEngine>[0]> = {}) =>
  createSemanticEngine({ artifact: art5, embed, textModel: m.model, scoringData, ...extra })

test('stage 2: modelIds carry fit and text model ids, promptVersion combines both prompts', () => {
  const m = fakeModel()
  const e = stage2(m, { fitModelId: 'fit-x', textModelId: 'text-y' })
  assert.deepEqual(e.modelIds, { embed: 'fake-embed-1', fit: 'fit-x', text: 'text-y', index: 'idx-1' })
  assert.equal(e.promptVersion, `${FIT_PROMPT_VERSION}+${SUMMARY_PROMPT_VERSION}`)
  const d = stage2(m)
  assert.equal(d.modelIds.fit, loadSettings({}).fitModel)
  assert.equal(d.modelIds.text, loadSettings({}).textModel)
})

test('stage 2: a text model without scoring data is refused', () => {
  assert.throws(() => createSemanticEngine({ artifact: art5, embed, textModel: fakeModel().model }), /scoring_data_required/)
})

test('stage 2: Fit calls never exceed fitCap, the rest keep a flagged estimate capped at 49', async () => {
  const m = fakeModel()
  const out = await runEngine(job5, stage2(m), io5({ fitCap: 2 }))
  assert.equal(m.fitCalls.length, 2)
  assert.ok(m.fitCalls.every((c) => c.modelId === loadSettings({}).fitModel))
  const byId = new Map(out.results.map((r) => [r.profile_id, r]))
  assert.equal(byId.get('p1')?.fit_score, 90)
  assert.equal(byId.get('p2')?.fit_score, 70)
  for (const id of ['p3', 'p4', 'p5']) {
    const r = byId.get(id) as JdMatchResult
    assert.equal(r.fit_score, Math.min(49, Math.round(100 * Math.cos(ids5.indexOf(id) * 0.2))))
    assert.match(r.narrative, /^This is an estimate from semantic similarity/)
    assert.match(r.narrative, /outside the in-depth assessment limit, so the estimate is capped at 49/)
  }
  assert.doesNotMatch(byId.get('p1')?.narrative ?? '', /estimate/)
  assert.equal(out.state, 'DONE')
})

test('stage 2: unassessed candidates beyond fitCap never outrank an assessed one with Fit at least 50', async () => {
  const m = fakeModel()
  const out = await runEngine({ ...job5, requirements: [] }, stage2(m), io5({ fitCap: 2 }))
  const assessed = out.results.filter((r) => ['p1', 'p2'].includes(r.profile_id))
  const others = out.results.filter((r) => !['p1', 'p2'].includes(r.profile_id))
  assert.equal(others.length, 3)
  for (const u of others) {
    assert.ok(u.fit_score <= 49)
    for (const a of assessed) if (a.fit_score >= 50) assert.ok(a.rank < u.rank, `${a.profile_id} above ${u.profile_id}`)
  }
})

test('stage 2: no more than parallelCalls model calls at a time', async () => {
  const m = fakeModel({ delayMs: 5 })
  await runEngine(job5, stage2(m), io5({ parallelCalls: 2, summaryCount: 5 }))
  assert.equal(m.fitCalls.length, 5)
  assert.equal(m.maxInFlight(), 2)
  const one = fakeModel({ delayMs: 2 })
  await runEngine(job5, stage2(one), io5({ parallelCalls: 0 }))
  assert.equal(one.maxInFlight(), 1)
})

test('stage 2: a failed Fit falls back to the estimate with a flag, records fit_fallback, job continues', async () => {
  const m = fakeModel({ failFit: ['p2'] })
  const out = await runEngine(job5, stage2(m), io5({ summaryCount: 0 }))
  assert.equal(out.state, 'DONE')
  const p2 = out.results.find((r) => r.profile_id === 'p2') as JdMatchResult
  assert.equal(p2.fit_score, Math.round(100 * Math.cos(0.2)))
  assert.match(p2.narrative, /in-depth assessment of this profile failed/)
  assert.doesNotMatch(p2.narrative, /MODEL-ERROR-TEXT/)
  const fb = out.record.filter((p) => p.phase === 'fit_fallback')
  assert.equal(fb.length, 1)
  assert.equal(fb[0].calls, undefined)
  assert.equal(out.record.reduce((n, p) => n + (p.calls ?? 0), 0), 5 + 0)
  const fit = out.record.find((p) => p.phase === 'fit')
  assert.equal(fit?.calls, 5)
  assert.equal(fit?.fallbacks, 1)
  assert.equal(fit?.tokensIn, 400)
  assert.equal(fit?.tokensOut, 40)
})

test('stage 2: scores equal scoreCandidate', async () => {
  const m = fakeModel()
  const out = await runEngine(job5, stage2(m), io5({ fitCap: 3 }))
  for (const r of out.results) {
    const want = scoreCandidate(r.fit_score, { candidate: inputs.get(r.profile_id) as CandidateInput, requirements: reqs, expertise: expertiseIdx, orgs: orgIdx })
    assert.deepEqual(r.adjustments, want.adjustments)
    assert.deepEqual(r.scoring, want.scoring)
    assert.deepEqual(r.must_haves_passed, want.must_haves_passed)
    assert.equal(r.total_score, want.total_score)
    assert.equal(r.band, want.band)
  }
  assert.ok(out.results.some((r) => r.total_score !== r.fit_score))
})

test('stage 2: summaries only for the top S by total, others get the template', async () => {
  const m = fakeModel()
  const out = await runEngine(job5, stage2(m), io5({ summaryCount: 2 }))
  assert.equal(m.summaryCalls.length, 2)
  assert.ok(m.summaryCalls.every((c) => c.modelId === loadSettings({}).textModel))
  assert.deepEqual(out.results.slice(0, 2).map((r) => r.narrative), [summaryText, summaryText])
  for (const r of out.results.slice(2)) {
    assert.notEqual(r.narrative, summaryText)
    assert.match(r.narrative, /for this brief at/)
  }
  const s = out.record.find((p) => p.phase === 'summary')
  assert.equal(s?.calls, 2)
  assert.equal(s?.fallbacks, 0)
  assert.equal(s?.tokensIn, 400)
  assert.equal(s?.tokensOut, 120)
  for (const phase of ['embed_query', 'search', 'fit', 'score', 'summary']) {
    assert.ok(out.record.some((p) => p.phase === phase), phase)
  }
})

test('stage 2: a failed summary uses the template with a flag sentence', async () => {
  const m = fakeModel({ failSummary: true })
  const out = await runEngine(job5, stage2(m), io5({ summaryCount: 1 }))
  const top = out.results[0]
  assert.match(top.narrative, /for this brief at/)
  assert.match(top.narrative, /A written summary was not available/)
  assert.doesNotMatch(top.narrative, /MODEL-ERROR-TEXT/)
  assert.doesNotMatch(out.results[1].narrative, /A written summary was not available/)
  assert.equal(out.record.find((p) => p.phase === 'summary')?.fallbacks, 1)
})

test('stage 2: an empty summary counts as a summary fallback', async () => {
  const m = fakeModel({ emptySummary: true })
  const out = await runEngine(job5, stage2(m), io5({ summaryCount: 1 }))
  assert.match(out.results[0].narrative, /A written summary was not available/)
  assert.equal(out.record.find((p) => p.phase === 'summary')?.fallbacks, 1)
})

test('stage 2: the extracted hiring organization is excluded with the column value', async () => {
  const seen: string[] = []
  const e = createSemanticEngine({
    artifact, embed: async (t) => { seen.push(t); return [1, 0] },
    extraction: async () => ({
      extracted: { expertise: [], locations: [], languages: [], hiring_organization: 'Save the Children' },
      hiringOrganization: null,
    }),
  })
  await runEngine({ ...job, jdText: 'Water for Save the Children and UNICEF' }, e, makeIO(null))
  assert.deepEqual(seen, ['Water for and UNICEF'])
})

test('stage 2: extraction exclusions reach the embedded query', async () => {
  const seen: string[] = []
  const extraction = async (jdId: string): Promise<Extraction> => {
    assert.equal(jdId, 'jd5')
    return {
      extracted: {
        expertise: [{ name: 'Health systems', suggested: 'slight', mentions: 1 }],
        locations: [{ value: 'Addis Ababa, Ethiopia', mentions: 1 }],
        languages: [{ value: 'Amharic', mentions: 1 }],
        hiring_organization: null,
      },
      hiringOrganization: 'UNICEF',
    }
  }
  const e = stage2(fakeModel(), { embed: async (t) => { seen.push(t); return [1, 0] }, extraction })
  await runEngine({ ...job5, jdText: 'Health systems for UNICEF in Addis Ababa and Ethiopia, Amharic speaker' }, e, io5())
  assert.deepEqual(seen, ['Health systems for in and , speaker'])
})

test('stage 2: extraction also applies without a text model, and a null extraction is fine', async () => {
  const seen: string[] = []
  const e = createSemanticEngine({
    artifact, embed: async (t) => { seen.push(t); return [1, 0] },
    extraction: async () => ({ extracted: null, hiringOrganization: 'World Bank' }),
  })
  await runEngine({ ...job, jdText: 'Water for the World Bank' }, e, makeIO(null))
  assert.deepEqual(seen, ['Water for the'])
})

test('stage 2: a pool id without scoring data becomes profile_missing', async () => {
  const m = fakeModel()
  const extra: IndexArtifact = {
    ...art5,
    fragments: [...art5.fragments, { fragmentId: 'zz#bio#0', profileId: 'zz', type: 'bio', text: 'EV-zz', vector: [1, 0] }],
  }
  const out = await runEngine({ ...job5, poolIds: [...ids5, 'zz'] }, stage2(m, { artifact: extra }), io5())
  assert.deepEqual(out.fallbacks, [{ profileId: 'zz', reason: 'profile_missing' }])
  assert.equal(out.state, 'PARTIAL')
  assert.ok(!out.results.some((r) => r.profile_id === 'zz'))
  assert.equal(m.fitCalls.length, 5)
})

test('stage 2: with the fit cap reached, candidates keep their result when lower similarity candidates are added', async () => {
  // p1 and p2 are inside fitCap 2 and p3 is beyond it in both pools; p4 and p5 rank lower by similarity.
  const small = await runEngine({ ...job5, poolIds: ['p1', 'p2', 'p3'] }, stage2(fakeModel()), io5({ fitCap: 2, summaryCount: 10 }))
  const big = await runEngine(job5, stage2(fakeModel()), io5({ fitCap: 2, summaryCount: 10 }))
  for (const id of ['p1', 'p2', 'p3']) {
    const a = small.results.find((r) => r.profile_id === id) as JdMatchResult
    const b = big.results.find((r) => r.profile_id === id) as JdMatchResult
    assert.deepEqual({ ...a, rank: 0 }, { ...b, rank: 0 })
  }
  assert.ok((small.results.find((r) => r.profile_id === 'p3') as JdMatchResult).fit_score <= 49)
})

/** Runs the job once with a store that fails on write number failAt, and returns what was saved. */
async function crashAt(failAt: number, s: Partial<ReturnType<typeof loadSettings>>, m: FakeModel): Promise<JdMatchResult[]> {
  const saved: JdMatchResult[] = []
  const io = { ...io5(s), saveCheckpoint: async (r: JdMatchResult) => {
    if (saved.length + 1 === failAt) throw new Error('store down')
    saved.push(r)
  } }
  await assert.rejects(runEngine(job5, stage2(m), io), /store down/)
  return saved
}

const cleanRun = async (s: Partial<ReturnType<typeof loadSettings>>) => runEngine(job5, stage2(fakeModel()), io5(s))

test('stage 2: each candidate is checkpointed once, in rank order, summarized ones first', async () => {
  const saved: JdMatchResult[] = []
  const io = { ...io5({ summaryCount: 2 }), saveCheckpoint: async (r: JdMatchResult) => { saved.push(r) } }
  const out = await runEngine(job5, stage2(fakeModel()), io)
  assert.deepEqual(saved.map((r) => r.profile_id), out.results.map((r) => r.profile_id))
  assert.deepEqual(saved.slice(0, 2).map((r) => r.narrative), [summaryText, summaryText])
})

test('stage 2: a crash after scoring (before any checkpoint) still gets the summaries on resume', async () => {
  const s = { fitCap: 3, summaryCount: 2 }
  const saved = await crashAt(1, s, fakeModel())
  assert.equal(saved.length, 0)
  const m = fakeModel()
  const out = await runEngine(job5, stage2(m), io5(s, saved))
  assert.equal(m.summaryCalls.length, 2)
  assert.ok(m.fitCalls.length <= 3)
  assert.deepEqual(out.results, (await cleanRun(s)).results)
})

test('stage 2: a crash part way through the checkpoints resumes with the same Fit set and the true top S summaries', async () => {
  const s = { fitCap: 3, summaryCount: 3 }
  const first = fakeModel()
  const saved = await crashAt(3, s, first)
  assert.equal(saved.length, 2)
  assert.equal(first.fitCalls.length, 3)
  const m = fakeModel()
  const out = await runEngine(job5, stage2(m), io5(s, saved))
  // Only the in-cap candidates not yet saved are assessed again, and one summary place is left.
  const inCap = new Set(['p1', 'p2', 'p3'])
  const savedIds = new Set(saved.map((r) => r.profile_id))
  const called = m.fitCalls.map((c) => ids5.find((p) => c.user.includes(`EV-${p}`)) as string)
  assert.ok(called.every((id) => inCap.has(id) && !savedIds.has(id)))
  assert.equal(called.length, [...inCap].filter((id) => !savedIds.has(id)).length)
  assert.equal(m.summaryCalls.length, 1)
  const clean = await cleanRun(s)
  assert.deepEqual(out.results, clean.results)
  assert.deepEqual(out.results.slice(0, 3).map((r) => r.narrative), [summaryText, summaryText, summaryText])
})

test('stage 2: a scoring data read that fails before any Fit call leaves nothing saved, and the retry matches a clean run', async () => {
  const s = { fitCap: 2, summaryCount: 2 }
  let calls = 0
  const flaky = async (ids: string[]): Promise<ScoringData> => {
    if (calls++ === 0) throw new Error('scoring source down')
    return scoringData(ids)
  }
  await assert.rejects(runEngine(job5, stage2(fakeModel(), { scoringData: flaky }), io5(s)), /scoring source down/)
  const m = fakeModel()
  const out = await runEngine(job5, stage2(m, { scoringData: flaky }), io5(s))
  assert.ok(m.fitCalls.length <= 2)
  assert.deepEqual(out.results, (await cleanRun(s)).results)
})

test('stage 2: done candidates keep their place in the fit cap and use up summary places', async () => {
  // As left by an earlier run: p1 and p2 done. With fitCap 2 nothing is left to assess.
  const clean = await cleanRun({ fitCap: 2, summaryCount: 3 })
  const existing = clean.results.filter((r) => ['p1', 'p2'].includes(r.profile_id)).map((r) => ({ ...r, rank: 0 }))
  const m = fakeModel()
  const out = await runEngine(job5, stage2(m), io5({ fitCap: 2, summaryCount: 3 }, existing))
  assert.equal(m.fitCalls.length, 0)
  assert.equal(m.summaryCalls.length, 1)
  const byId = new Map(out.results.map((r) => [r.profile_id, r]))
  for (const id of ['p3', 'p4', 'p5']) assert.ok((byId.get(id) as JdMatchResult).fit_score <= 49)
  assert.deepEqual(out.results, clean.results)
})

test('stage 2: a candidate whose scoring throws becomes score_failed and the job continues', async () => {
  const broken = async (ids: string[]): Promise<ScoringData> => {
    const d = await scoringData(ids)
    return {
      ...d,
      // A malformed row: reading the name throws, as a bad shape would inside the app functions.
      candidates: d.candidates.map((c) => (c.profile.id === 'p2'
        ? { ...c, profile: Object.defineProperty({ ...c.profile }, 'name', { get() { throw new Error('bad row') } }) }
        : c)),
    }
  }
  const out = await runEngine(job5, stage2(fakeModel(), { scoringData: broken }), io5())
  assert.deepEqual(out.fallbacks, [{ profileId: 'p2', reason: 'score_failed' }])
  assert.equal(out.state, 'PARTIAL')
  assert.deepEqual(out.results.map((r) => r.profile_id).sort(), ['p1', 'p3', 'p4', 'p5'])
})

test('stage 2: nothing is logged with profile, fragment or model text', async () => {
  const lines: string[] = []
  const orig = console.log
  console.log = (s: string) => { lines.push(String(s)) }
  try {
    await runEngine(job5, stage2(fakeModel({ failFit: ['p3'] })), io5())
  } finally {
    console.log = orig
  }
  for (const l of lines) assert.doesNotMatch(l, /EV-|MODEL-ERROR-TEXT|Name p|s0 s1/)
})

test('stage 2: modelIds report the fit and text models of the job that ran, not the engine options', async () => {
  const m = fakeModel()
  const e = stage2(m, { fitModelId: 'worker-fit', textModelId: 'worker-text' })
  await runEngine(job5, e, io5({ fitModel: 'job-fit', textModel: 'job-text' }))
  assert.ok(m.fitCalls.length > 0 && m.fitCalls.every((c) => c.modelId === 'job-fit'))
  assert.ok(m.summaryCalls.length > 0 && m.summaryCalls.every((c) => c.modelId === 'job-text'))
  assert.deepEqual(e.modelIds, { embed: 'fake-embed-1', fit: 'job-fit', text: 'job-text', index: 'idx-1' })
})

/** Every Fit call fails with the error from makeErr (or, with a reply, returns it); summaries are not reached. */
function failingFit(makeErr: (id: string) => Error | { text: string; inputTokens: number; outputTokens: number; stopReason?: string }): FakeModel {
  const base = fakeModel()
  const model: TextModel = async (req) => {
    if (!req.system.startsWith('You judge')) return base.model(req)
    base.fitCalls.push(req)
    const out = makeErr(ids5.find((p) => req.user.includes(`EV-${p}`)) ?? 'none')
    if (out instanceof Error) throw out
    return out
  }
  return { ...base, model }
}

const named = (name: string, message = 'MODEL-ERROR-TEXT'): Error => Object.assign(new Error(message), { name })

test('stage 2: every Fit call failing with a configuration error stops the job with fit_model_unavailable', async () => {
  const cases: [string, () => Error | { text: string; inputTokens: number; outputTokens: number; stopReason?: string }][] = [
    ['AccessDenied', () => named('AccessDenied')],
    ['AccessDeniedException', () => named('AccessDeniedException')],
    ['ValidationException', () => named('ValidationException')],
    ['ResourceNotFoundException', () => named('ResourceNotFoundException')],
    ['not available message', () => named('Error', 'The model is not available for this account. MODEL-ERROR-TEXT')],
    ['every reply truncated', () => ({ text: '{"fit":', inputTokens: 5, outputTokens: 400, stopReason: 'max_tokens' })],
  ]
  for (const [label, make] of cases) {
    const m = failingFit(make)
    await assert.rejects(runEngine(job5, stage2(m), io5()), (e: unknown) => {
      assert.ok(e instanceof TerminalError, label)
      assert.equal(e.code, 'fit_model_unavailable', label)
      return true
    })
    assert.equal(m.fitCalls.length, 5, label)
    assert.equal(m.summaryCalls.length, 0, label)
  }
})

test('stage 2: one configuration error among other failures is enough for fit_model_unavailable', async () => {
  const m = failingFit((id) => (id === 'p4' ? named('ValidationException') : new Error('boom')))
  await assert.rejects(runEngine(job5, stage2(m), io5()), (e) => e instanceof TerminalError && e.code === 'fit_model_unavailable')
})

test('stage 2: every Fit call failing with other errors throws a retryable fit_all_failed', async () => {
  for (const make of [
    () => new Error('boom'),
    (id: string) => (id === 'p1' ? named('Error', 'fit_output_truncated') : new Error('boom')),
  ]) {
    const m = failingFit(make)
    await assert.rejects(runEngine(job5, stage2(m), io5()), (e: unknown) => {
      assert.ok(!(e instanceof TerminalError))
      assert.equal((e as Error).message, 'fit_all_failed')
      return true
    })
  }
  // Truncation on some calls only, with the others failing otherwise, is not a configuration problem.
  const mixed = failingFit((id) => (id === 'p1'
    ? { text: '', inputTokens: 1, outputTokens: 1, stopReason: 'max_tokens' }
    : new Error('boom')))
  await assert.rejects(runEngine(job5, stage2(mixed), io5()), (e) => !(e instanceof TerminalError) && (e as Error).message === 'fit_all_failed')
})

test('stage 2: with no Fit call attempted, nothing is thrown', async () => {
  const m = failingFit(() => named('AccessDeniedException'))
  const out = await runEngine(job5, stage2(m), io5({ fitCap: 0 }))
  assert.equal(m.fitCalls.length, 0)
  assert.equal(out.state, 'DONE')
})

test('stage 2: each failed Fit call logs its error name and the job id, never the message', async () => {
  const lines: string[] = []
  const orig = console.log
  console.log = (s: string) => { lines.push(String(s)) }
  try {
    const m = failingFit((id) => (id === 'p2' ? named('ThrottlingException') : named('ValidationException')))
    await assert.rejects(runEngine(job5, stage2(m, { callOptions: { retries: 0 } }), io5()))
    const partial = fakeModel({ failFit: ['p3'] })
    await runEngine(job5, stage2(partial), io5())
  } finally {
    console.log = orig
  }
  const failed = lines.map((l) => JSON.parse(l)).filter((l) => l.event === 'fit_call_failed')
  assert.equal(failed.length, 6)
  assert.ok(failed.every((l) => l.jobId === 'j5'))
  assert.deepEqual(failed.map((l) => l.errorName).sort(), ['Error', 'ThrottlingException', ...Array(4).fill('ValidationException')].sort())
  for (const l of lines) assert.doesNotMatch(l, /MODEL-ERROR-TEXT|EV-/)
})

test('stage 2: tokens of truncated Fit and summary replies are counted in the phase records', async () => {
  const base = fakeModel()
  const model: TextModel = async (req) => {
    if (req.system.startsWith('You judge') && req.user.includes('EV-p2')) {
      return { text: '{"fit":', inputTokens: 7, outputTokens: 400, stopReason: 'max_tokens' }
    }
    if (!req.system.startsWith('You judge')) return { text: summaryText, inputTokens: 11, outputTokens: 300, stopReason: 'max_tokens' }
    return base.model(req)
  }
  const out = await runEngine(job5, stage2({ ...base, model }), io5({ summaryCount: 2 }))
  const fit = out.record.find((p) => p.phase === 'fit')
  assert.equal(fit?.fallbacks, 1)
  assert.equal(fit?.tokensIn, 4 * 100 + 7)
  assert.equal(fit?.tokensOut, 4 * 10 + 400)
  const summary = out.record.find((p) => p.phase === 'summary')
  assert.equal(summary?.fallbacks, 2)
  assert.equal(summary?.tokensIn, 22)
  assert.equal(summary?.tokensOut, 600)
})
