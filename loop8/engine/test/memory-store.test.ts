import test from 'node:test'
import assert from 'node:assert/strict'
import { createMemoryStore, createMemoryQueue } from '../src/shared/memory-store'
import { TERMINAL } from '../src/shared/store'
import type { JobItem } from '../src/shared/store'
import type { JdMatchResult } from '../src/core/types'

function job(jobId: string, over: Partial<JobItem> = {}): JobItem {
  return {
    jobId, state: 'QUEUED', createdAt: 1, inputKey: `in/${jobId}.json`,
    settings: {
      variant: 'v', fitModel: 'f', textModel: 't', embedModel: 'e',
      summaryCount: 1, parallelCalls: 1, threshold: null, promptVersion: 'p', fitCap: 1,
    },
    progress: { done: 0, total: 3 }, fallbacks: [], record: [], expiresAt: 999, ...over,
  }
}

function res(profile_id: string, total: number): JdMatchResult {
  return {
    profile_id, rank: 0, fit_score: total, total_score: total, band: 'strong',
    adjustments: [], scoring: { weight: 0, earned: 0, possible: 0 }, must_haves_passed: [], narrative: 'n',
  } as unknown as JdMatchResult
}

test('claimIdempotency returns the first job id for a reused key', async () => {
  const s = createMemoryStore()
  assert.equal(await s.findIdempotent('k'), null)
  assert.equal(await s.claimIdempotency('k', 'j1', 100), 'j1')
  assert.equal(await s.claimIdempotency('k', 'j2', 100), 'j1')
  assert.equal(await s.findIdempotent('k'), 'j1')
})

test('incrementDaily allows exactly cap jobs per day', async () => {
  const s = createMemoryStore()
  assert.equal(await s.incrementDaily('d1', 2), true)
  assert.equal(await s.incrementDaily('d1', 2), true)
  assert.equal(await s.incrementDaily('d1', 2), false)
  assert.equal(await s.incrementDaily('d1', 2), false)
  assert.equal(await s.incrementDaily('d2', 2), true)
})

test('createJob throws on a duplicate id and returns copies', async () => {
  const s = createMemoryStore()
  await s.createJob(job('j1'))
  await assert.rejects(s.createJob(job('j1')))
  const a = await s.getJob('j1')
  a!.state = 'DONE'
  assert.equal((await s.getJob('j1'))!.state, 'QUEUED')
  assert.equal(await s.getJob('nope'), null)
})

test('acquireLease succeeds on QUEUED and sets RUNNING and startedAt', async () => {
  const s = createMemoryStore()
  await s.createJob(job('j1'))
  assert.equal(await s.acquireLease('j1', 'w1', 1000, 500), true)
  const j = await s.getJob('j1')
  assert.equal(j!.state, 'RUNNING')
  assert.equal(j!.leaseOwner, 'w1')
  assert.equal(j!.leaseUntil, 1500)
  assert.equal(j!.startedAt, 1000)
  assert.equal(await s.acquireLease('missing', 'w1', 1, 1), false)
})

test('acquireLease fails while another lease is live and succeeds after it expires', async () => {
  const s = createMemoryStore()
  await s.createJob(job('j1'))
  await s.acquireLease('j1', 'w1', 1000, 500)
  assert.equal(await s.acquireLease('j1', 'w2', 1200, 500), false)
  assert.equal(await s.acquireLease('j1', 'w2', 1600, 500), true)
  const j = await s.getJob('j1')
  assert.equal(j!.leaseOwner, 'w2')
  assert.equal(j!.leaseUntil, 2100)
  assert.equal(j!.startedAt, 1000)
})

test('acquireLease fails on a terminal job', async () => {
  const s = createMemoryStore()
  await s.createJob(job('j1', { state: 'DONE' }))
  assert.equal(await s.acquireLease('j1', 'w1', 1000, 500), false)
})

test('finishJob returns false and changes nothing on a terminal job', async () => {
  const s = createMemoryStore()
  await s.createJob(job('j1'))
  assert.equal(await s.finishJob('j1', { state: 'DONE', finishedAt: 5, resultKey: 'r' }), true)
  assert.equal(await s.finishJob('j1', { state: 'FAILED', finishedAt: 9, errorCode: 'x' }), false)
  const j = await s.getJob('j1')
  assert.equal(j!.state, 'DONE')
  assert.equal(j!.finishedAt, 5)
  assert.equal(j!.errorCode, undefined)
  assert.equal(await s.finishJob('missing', { state: 'DONE', finishedAt: 1 }), false)
})

test('finishJob copies only defined optional fields', async () => {
  const s = createMemoryStore()
  await s.createJob(job('j1', { promptVersion: 'keep' }))
  await s.finishJob('j1', { state: 'PARTIAL', finishedAt: 7, endToEndMs: 42, promptVersion: undefined })
  const j = await s.getJob('j1')
  assert.equal(j!.state, 'PARTIAL')
  assert.equal(j!.endToEndMs, 42)
  assert.equal(j!.promptVersion, 'keep')
})

test('saveCheckpoint twice for one profile keeps one checkpoint', async () => {
  const s = createMemoryStore()
  await s.saveCheckpoint('j1', res('a', 1))
  await s.saveCheckpoint('j1', res('b', 2))
  await s.saveCheckpoint('j1', res('a', 3))
  const list = await s.listCheckpoints('j1')
  assert.deepEqual(list.map((r) => [r.profile_id, r.total_score]), [['a', 3], ['b', 2]])
  assert.deepEqual(await s.listCheckpoints('other'), [])
})

test('setProgress, objects and queue', async () => {
  const s = createMemoryStore()
  await s.createJob(job('j1'))
  await s.setProgress('j1', 2)
  assert.equal((await s.getJob('j1'))!.progress.done, 2)
  assert.equal(await s.getObject('k'), null)
  await s.putObject('k', 'body')
  assert.equal(await s.getObject('k'), 'body')
  assert.equal(s.objects.get('k'), 'body')
  assert.equal(await s.objectUrl('k'), 'memory://k')
  const q = createMemoryQueue()
  await q.send('j1')
  assert.deepEqual(q.sent, ['j1'])
  assert.equal(TERMINAL.has('DONE'), true)
  assert.equal(TERMINAL.has('RUNNING'), false)
})

test('releaseLease frees the lease of its owner so the next delivery can acquire it at once', async () => {
  const s = createMemoryStore()
  await s.createJob(job('j1'))
  assert.equal(await s.acquireLease('j1', 'w1', 10, 1000), true)
  assert.equal(await s.releaseLease('j1', 'w2'), false)
  assert.equal(await s.acquireLease('j1', 'w2', 20, 1000), false)
  assert.equal(await s.releaseLease('j1', 'w1'), true)
  assert.equal((await s.getJob('j1'))?.state, 'RUNNING')
  assert.equal(await s.acquireLease('j1', 'w2', 20, 1000), true)
})

test('releaseLease does nothing for a terminal, queued or unknown job', async () => {
  const s = createMemoryStore()
  await s.createJob(job('j1'))
  assert.equal(await s.releaseLease('j1', 'w1'), false)
  await s.acquireLease('j1', 'w1', 10, 1000)
  await s.finishJob('j1', { state: 'DONE', finishedAt: 11 })
  assert.equal(await s.releaseLease('j1', 'w1'), false)
  assert.equal(await s.releaseLease('nope', 'w1'), false)
})
