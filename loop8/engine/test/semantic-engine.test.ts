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
