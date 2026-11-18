import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LIMITS } from '../src/shared/limits'

test('lease outlasts the worker timeout and ends before the SQS visibility timeout', () => {
  assert.ok(DEFAULT_LIMITS.leaseMs > 180000)
  assert.ok(DEFAULT_LIMITS.leaseMs < 1080000)
})

test('a caught retryable error comes back in about 10 seconds, well inside the visibility timeout', () => {
  assert.equal(DEFAULT_LIMITS.retryDelaySeconds, 10)
  assert.ok(DEFAULT_LIMITS.retryDelaySeconds * 1000 < 1080000)
})
