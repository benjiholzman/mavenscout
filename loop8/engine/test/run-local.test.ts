import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runLocal } from '../src/local'
import type { RankRequest } from '../src/shared/validate'

test('runLocal on the sample job returns DONE with one ranked result per sample id', async () => {
  const job = JSON.parse(readFileSync('samples/sample-job.json', 'utf8')) as RankRequest
  const out = await runLocal(job, {})
  assert.equal(out.state, 'DONE')
  assert.equal(out.results.length, job.poolIds.length)
  assert.deepEqual(out.results.map((r) => r.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.deepEqual(out.results.map((r) => r.profile_id).sort(), [...job.poolIds].sort())
  assert.ok(out.endToEndMs >= 0)
})
