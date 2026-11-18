import test from 'node:test'
import assert from 'node:assert/strict'
import { createStubEngine } from '../src/engine/stub'
import { loadSettings } from '../src/core/settings'
import { bandFor } from '../../../src/lib/matching/config'
import type { EngineContext, JdMatchResult, RankJob } from '../src/core/types'

const job: RankJob = { jobId: 'j1', jobDescriptionId: 'jd1', requirements: [], poolIds: ['a', 'b', 'c', 'd'] }

function fakeCtx(done: string[] = []) {
  const checkpoints: JdMatchResult[] = []
  const fallbacks: { profileId: string; reason: string }[] = []
  const records: { phase: string; durationMs: number }[] = []
  const ctx: EngineContext = {
    settings: loadSettings({}),
    isDone: (id) => done.includes(id),
    checkpoint: async (r) => { checkpoints.push(r) },
    fallback: async (profileId, reason) => { fallbacks.push({ profileId, reason }) },
    record: (phase, usage) => { records.push({ phase, durationMs: usage.durationMs }) },
  }
  return { ctx, checkpoints, fallbacks, records }
}

test('stub is deterministic and returns valid results', async () => {
  const one = fakeCtx(); const two = fakeCtx()
  await createStubEngine().rank(job, one.ctx)
  await createStubEngine().rank(job, two.ctx)
  assert.equal(one.checkpoints.length, 4)
  for (const r of one.checkpoints) {
    const twin = two.checkpoints.find((x) => x.profile_id === r.profile_id)!
    assert.equal(r.fit_score, twin.fit_score)
    assert.ok(Number.isInteger(r.fit_score) && r.fit_score >= 0 && r.fit_score <= 100)
    assert.equal(r.total_score, r.fit_score)
    assert.equal(r.band, bandFor(r.fit_score))
    assert.deepEqual(r.adjustments, [])
    assert.deepEqual(r.scoring, { weight: 0, earned: 0, possible: 0 })
    assert.deepEqual(r.must_haves_passed, [])
    assert.ok(r.narrative.includes('Stub result'))
  }
})
test('stub skips profiles already done', async () => {
  const c = fakeCtx(['b'])
  await createStubEngine().rank(job, c.ctx)
  assert.equal(c.checkpoints.length, 3)
  assert.ok(!c.checkpoints.some((r) => r.profile_id === 'b'))
})
test('failureRate 1 sends every profile to fallback', async () => {
  const c = fakeCtx()
  await createStubEngine({ failureRate: 1 }).rank(job, c.ctx)
  assert.equal(c.checkpoints.length, 0)
  assert.deepEqual(c.fallbacks.map((f) => f.profileId), job.poolIds)
})
test('crash throws', async () => {
  await assert.rejects(createStubEngine({ crash: true }).rank(job, fakeCtx().ctx), /stub crash/)
})
test('stub identifies itself', () => {
  const e = createStubEngine()
  assert.deepEqual(e.modelIds, { fit: 'stub', text: 'stub' })
  assert.equal(e.promptVersion, 'stub-1')
})
test('stub records one phase', async () => {
  const c = fakeCtx()
  await createStubEngine().rank(job, c.ctx)
  assert.equal(c.records.length, 1)
  assert.equal(c.records[0].phase, 'stub')
  assert.ok(c.records[0].durationMs >= 0)
})
