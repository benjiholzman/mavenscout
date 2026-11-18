import test from 'node:test'
import assert from 'node:assert/strict'
import { rankResults, runEngine } from '../src/core/run'
import type { RunIO } from '../src/core/run'
import { createStubEngine } from '../src/engine/stub'
import { loadSettings } from '../src/core/settings'
import { bandFor } from '../../../src/lib/matching/config'
import type { Engine, Fallback, JdMatchResult, RankJob } from '../src/core/types'

function res(profile_id: string, total: number, fit: number): JdMatchResult {
  return {
    profile_id, rank: 0, fit_score: fit, total_score: total, band: bandFor(total),
    adjustments: [], scoring: { weight: 0, earned: 0, possible: 0 }, must_haves_passed: [], narrative: 'n',
  }
}

const job: RankJob = { jobId: 'j1', jobDescriptionId: 'jd1', requirements: [], poolIds: ['a', 'b', 'c', 'd'] }

function makeIO(existing: JdMatchResult[] = []) {
  const saved: JdMatchResult[] = []
  const savedFallbacks: Fallback[] = []
  const io: RunIO = {
    settings: loadSettings({}),
    existing,
    saveCheckpoint: async (r) => { saved.push(r) },
    saveFallback: async (f) => { savedFallbacks.push(f) },
  }
  return { io, saved, savedFallbacks }
}

test('rankResults orders by total desc, fit desc, profile id asc and numbers ranks from 1', () => {
  const input = [res('c', 50, 40), res('b', 50, 40), res('a', 50, 60), res('d', 90, 10)]
  const out = rankResults(input)
  assert.deepEqual(out.map((r) => r.profile_id), ['d', 'a', 'b', 'c'])
  assert.deepEqual(out.map((r) => r.rank), [1, 2, 3, 4])
  assert.equal(input[0].rank, 0)
})

test('runEngine merges existing checkpoints with new ones, one result per profile', async () => {
  const { io, saved } = makeIO([res('a', 10, 10), res('b', 20, 20)])
  const out = await runEngine(job, createStubEngine(), io)
  assert.equal(out.results.length, 4)
  assert.equal(new Set(out.results.map((r) => r.profile_id)).size, 4)
  assert.deepEqual(saved.map((r) => r.profile_id).sort(), ['c', 'd'])
})

test('existing profiles are reported done to the engine', async () => {
  const { io } = makeIO([res('a', 10, 10)])
  const seen: boolean[] = []
  const engine: Engine = {
    modelIds: {}, promptVersion: 'x',
    async rank(_job, ctx) {
      seen.push(ctx.isDone('a'), ctx.isDone('b'))
      await ctx.checkpoint(res('b', 1, 1))
      seen.push(ctx.isDone('b'))
    },
  }
  await runEngine(job, engine, io)
  assert.deepEqual(seen, [true, false, true])
})

test('any fallback makes the state PARTIAL, none makes it DONE', async () => {
  const clean = await runEngine(job, createStubEngine(), makeIO().io)
  assert.equal(clean.state, 'DONE')
  const failing = makeIO()
  const out = await runEngine(job, createStubEngine({ failureRate: 1 }), failing.io)
  assert.equal(out.state, 'PARTIAL')
  assert.equal(out.fallbacks.length, 4)
  assert.equal(failing.savedFallbacks.length, 4)
})

test('record contains the phases the engine reported', async () => {
  const out = await runEngine(job, createStubEngine(), makeIO().io)
  assert.equal(out.record.length, 1)
  assert.equal(out.record[0].phase, 'stub')
  assert.equal(typeof out.record[0].durationMs, 'number')
})

test('an engine error propagates', async () => {
  await assert.rejects(runEngine(job, createStubEngine({ crash: true }), makeIO().io), /stub crash/)
})
