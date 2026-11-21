import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_FIT_CAP, loadSettings } from '../src/core/settings'

test('defaults are variant A on Luna', () => {
  const s = loadSettings({})
  assert.deepEqual(s, { variant: 'A', fitModel: 'us.openai.gpt-6-luna', textModel: 'us.openai.gpt-6-luna', embedModel: 'amazon.titan-embed-text-v2:0', summaryCount: 5, parallelCalls: 16, threshold: null, promptVersion: 'v0', fitCap: 200 })
})
test('the Fit cap default is 200, equal to the stage 1 cap', () => {
  assert.equal(DEFAULT_FIT_CAP, 200)
})
test('overrides are parsed', () => {
  const s = loadSettings({ ENGINE_VARIANT: 'C', TEXT_MODEL: 'x.sol', SUMMARY_COUNT: '10', THRESHOLD: '0.42' })
  assert.equal(s.variant, 'C'); assert.equal(s.textModel, 'x.sol'); assert.equal(s.summaryCount, 10); assert.equal(s.threshold, 0.42)
})
test('a bad number throws', () => {
  assert.throws(() => loadSettings({ SUMMARY_COUNT: 'five' }), /Invalid setting SUMMARY_COUNT/)
  assert.throws(() => loadSettings({ PARALLEL_CALLS: '-1' }), /Invalid setting PARALLEL_CALLS/)
  assert.throws(() => loadSettings({ SUMMARY_COUNT: '2.5' }), /Invalid setting SUMMARY_COUNT/)
})
test('THRESHOLD must be between 0 and 1', () => {
  assert.throws(() => loadSettings({ THRESHOLD: '50' }), /Invalid setting THRESHOLD/)
  assert.throws(() => loadSettings({ THRESHOLD: '1.5' }), /Invalid setting THRESHOLD/)
  assert.equal(loadSettings({ THRESHOLD: '1' }).threshold, 1)
  assert.equal(loadSettings({ THRESHOLD: '0' }).threshold, 0)
})
test('FIT_CAP is parsed and validated', () => {
  assert.equal(loadSettings({ FIT_CAP: '7' }).fitCap, 7)
  assert.equal(loadSettings({ FIT_CAP: '0' }).fitCap, 0)
  assert.throws(() => loadSettings({ FIT_CAP: 'x' }), /Invalid setting FIT_CAP/)
})
