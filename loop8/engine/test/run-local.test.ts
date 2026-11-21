import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runLocal } from '../src/local'
import type { RankRequest } from '../src/shared/validate'
import { buildSampleIndex } from '../src/engine/local-fakes'

test('runLocal on the sample job returns DONE with one ranked result per sample id', async () => {
  const job = JSON.parse(readFileSync('samples/sample-job.json', 'utf8')) as RankRequest
  const out = await runLocal(job, {})
  assert.equal(out.state, 'DONE')
  assert.equal(out.results.length, job.poolIds.length)
  assert.deepEqual(out.results.map((r) => r.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.deepEqual(out.results.map((r) => r.profile_id).sort(), [...job.poolIds].sort())
  assert.ok(out.endToEndMs >= 0)
})

const fake = { ENGINE: 'semantic', LOCAL_FAKE_MODELS: 'true' }

test('runLocal with ENGINE=semantic and fake models runs stage 2 offline over the sample index', async () => {
  const job = JSON.parse(readFileSync('samples/sample-job.json', 'utf8')) as RankRequest
  const out = await runLocal(job, fake)
  assert.equal(out.state, 'DONE')
  assert.deepEqual(out.results.map((r) => r.profile_id).sort(), [...job.poolIds].sort())
  assert.ok(out.record.some((p) => p.phase === 'embed_query'))
  assert.ok(out.results.every((r) => r.narrative.length > 0))
})

test('the sample index is the fake embedder output for the sample job pool, 1024 dimensions', () => {
  const job = JSON.parse(readFileSync('samples/sample-job.json', 'utf8')) as RankRequest
  const onDisk = JSON.parse(readFileSync('samples/sample-index.json', 'utf8'))
  assert.deepEqual(onDisk, JSON.parse(JSON.stringify(buildSampleIndex(job.poolIds))))
  assert.equal(onDisk.dimensions, 1024)
  assert.match(onDisk.note, /FAKE/)
})

test('runLocal with no ENGINE still runs the stub', async () => {
  const job = JSON.parse(readFileSync('samples/sample-job.json', 'utf8')) as RankRequest
  const out = await runLocal(job, {})
  assert.equal(out.state, 'DONE')
  assert.equal(out.record.some((p) => p.phase === 'embed_query'), false)
})
