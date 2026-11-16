import test from 'node:test'
import assert from 'node:assert/strict'
import { log } from '../src/shared/log'

test('a log line is valid JSON with event and jobId', () => {
  const lines: string[] = []
  const orig = console.log
  console.log = (s: string) => { lines.push(s) }
  try { log('job_started', { jobId: 'j1', extra: 3 }) } finally { console.log = orig }
  assert.equal(lines.length, 1)
  const o = JSON.parse(lines[0])
  assert.equal(o.event, 'job_started')
  assert.equal(o.jobId, 'j1')
  assert.equal(o.extra, 3)
  assert.ok(typeof o.ts === 'string')
})
