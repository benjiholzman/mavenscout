import test from 'node:test'
import assert from 'node:assert/strict'
import { loadSettings } from '../src/core/settings'

test('defaults are variant A on Luna', () => {
  const s = loadSettings({})
  assert.deepEqual(s, { variant: 'A', fitModel: 'us.openai.gpt-6-luna', textModel: 'us.openai.gpt-6-luna', embedModel: 'amazon.titan-embed-text-v2:0', summaryCount: 5, parallelCalls: 16, threshold: null, promptVersion: 'v0' })
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
