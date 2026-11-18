import test from 'node:test'
import assert from 'node:assert/strict'
import { handleApi } from '../src/api/app'
import { processJob } from '../src/worker/app'
import { DEFAULT_LIMITS } from '../src/shared/limits'
import { createMemoryQueue, createMemoryStore } from '../src/shared/memory-store'
import { createStubEngine } from '../src/engine/stub'
import { loadSettings } from '../src/core/settings'

test('post twice, drain queue, worker finishes, GET returns DONE with result', async () => {
  console.log = () => {}
  const store = createMemoryStore()
  const queue = createMemoryQueue()
  const settings = loadSettings({})
  let n = 0
  const now = () => Date.parse('2026-11-16T10:00:00Z')
  const api = { store, queue, settings, limits: DEFAULT_LIMITS, now, newId: () => `job-${++n}` }
  const body = JSON.stringify({ jobDescriptionId: 'jd1', requirements: [], poolIds: ['a', 'b', 'c', 'd'] })
  const post = () => handleApi({ method: 'POST', path: '/jobs', headers: { 'idempotency-key': 'k' }, body }, api)
  const r1 = await post()
  const r2 = await post()
  const id = (r1.body as { jobId: string }).jobId
  assert.equal((r2.body as { jobId: string }).jobId, id)

  const worker = { store, engine: createStubEngine(), limits: DEFAULT_LIMITS, now: () => now() + 3000, workerId: 'w1' }
  for (const sent of [...queue.sent]) await processJob(sent, 1, worker)

  const g = await handleApi({ method: 'GET', path: `/jobs/${id}`, headers: {}, body: null }, api)
  const gb = g.body as { state: string; resultUrl: string; endToEndMs: number }
  assert.equal(gb.state, 'DONE')
  assert.equal(gb.resultUrl, `memory://results/${id}.json`)
  assert.equal(gb.endToEndMs, 3000)
  const out = JSON.parse((await store.getObject(`results/${id}.json`)) as string)
  assert.deepEqual(out.results.map((r: { rank: number }) => r.rank), [1, 2, 3, 4])
  assert.deepEqual(out.results.map((r: { profile_id: string }) => r.profile_id).sort(), ['a', 'b', 'c', 'd'])
  assert.deepEqual(out.settings, settings)
})
