import test from 'node:test'
import assert from 'node:assert/strict'
import { queueUrlFromArn, resolveQueueUrl, buildRetrySoon } from '../src/worker/queue-url'

const ARN = 'arn:aws:sqs:eu-west-1:123456789012:jobs-queue'

test('queueUrlFromArn builds the URL for a standard ARN', () => {
  assert.equal(queueUrlFromArn(ARN), 'https://sqs.eu-west-1.amazonaws.com/123456789012/jobs-queue')
})

test('queueUrlFromArn accepts the aws-us-gov partition', () => {
  assert.equal(
    queueUrlFromArn('arn:aws-us-gov:sqs:us-gov-west-1:123456789012:q'),
    'https://sqs.us-gov-west-1.amazonaws.com/123456789012/q',
  )
})

test('queueUrlFromArn returns null for aws-cn and malformed input', () => {
  assert.equal(queueUrlFromArn('arn:aws-cn:sqs:cn-north-1:123456789012:q'), null)
  assert.equal(queueUrlFromArn(''), null)
  assert.equal(queueUrlFromArn('not-an-arn'), null)
  assert.equal(queueUrlFromArn('arn:aws:sns:us-east-1:123456789012:q'), null)
  assert.equal(queueUrlFromArn('arn:aws:sqs:us-east-1:123456789012'), null)
  assert.equal(queueUrlFromArn('arn:aws:sqs:us-east-1:123456789012:q:extra'), null)
  assert.equal(queueUrlFromArn('arn:aws:sqs::123456789012:q'), null)
  assert.equal(queueUrlFromArn('arn:aws:sqs:us-east-1::q'), null)
  assert.equal(queueUrlFromArn('arn:aws:sqs:us-east-1:123456789012:'), null)
  assert.equal(queueUrlFromArn(undefined), null)
})

test('resolveQueueUrl prefers the environment value over the ARN', () => {
  assert.equal(resolveQueueUrl('https://env/queue', ARN), 'https://env/queue')
})

test('resolveQueueUrl falls back to the ARN when the environment value is unset or empty', () => {
  const derived = 'https://sqs.eu-west-1.amazonaws.com/123456789012/jobs-queue'
  assert.equal(resolveQueueUrl(undefined, ARN), derived)
  assert.equal(resolveQueueUrl('', ARN), derived)
})

test('resolveQueueUrl trims the environment value, so whitespace only falls back to the ARN', () => {
  const derived = 'https://sqs.eu-west-1.amazonaws.com/123456789012/jobs-queue'
  assert.equal(resolveQueueUrl('   ', ARN), derived)
  assert.equal(resolveQueueUrl(' \t\n', ARN), derived)
  assert.equal(resolveQueueUrl('  https://env/queue \n', ARN), 'https://env/queue')
  assert.equal(resolveQueueUrl('   ', undefined), null)
})

test('resolveQueueUrl returns null when neither source is usable', () => {
  assert.equal(resolveQueueUrl(undefined, undefined), null)
  assert.equal(resolveQueueUrl('', 'garbage'), null)
})

test('buildRetrySoon uses the environment URL when set', async () => {
  const calls: Array<[string, string, number]> = []
  const retrySoon = buildRetrySoon({
    envUrl: 'https://env/queue',
    eventSourceArn: ARN,
    receiptHandle: 'rh',
    delaySeconds: 10,
    makeRetry: (url) => async (handle, delay) => { calls.push([url, handle, delay]) },
  })
  assert.ok(retrySoon)
  await retrySoon()
  assert.deepEqual(calls, [['https://env/queue', 'rh', 10]])
})

test('buildRetrySoon derives the URL from the ARN when the environment is unset', async () => {
  const calls: Array<[string, string, number]> = []
  const retrySoon = buildRetrySoon({
    envUrl: undefined,
    eventSourceArn: ARN,
    receiptHandle: 'rh',
    delaySeconds: 10,
    makeRetry: (url) => async (handle, delay) => { calls.push([url, handle, delay]) },
  })
  assert.ok(retrySoon)
  await retrySoon()
  assert.deepEqual(calls, [['https://sqs.eu-west-1.amazonaws.com/123456789012/jobs-queue', 'rh', 10]])
})

test('buildRetrySoon returns undefined when no URL is available', () => {
  let made = 0
  const retrySoon = buildRetrySoon({
    envUrl: undefined,
    eventSourceArn: undefined,
    receiptHandle: 'rh',
    delaySeconds: 10,
    makeRetry: () => { made++; return async () => {} },
  })
  assert.equal(retrySoon, undefined)
  assert.equal(made, 0)
})
