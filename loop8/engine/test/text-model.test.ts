import test from 'node:test'
import assert from 'node:assert/strict'
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { createBedrockTextModel, bedrockClientConfig } from '../src/models/text-model'
import { withRetry, isThrottling } from '../src/stage2/retry'

test('converse client sends system, one user message, temperature 0 and maps usage', async () => {
  const sent: any[] = []
  const client = {
    async send(cmd: any) {
      sent.push(cmd.input)
      return {
        output: { message: { content: [{ text: 'hello ' }, { text: 'world' }] } },
        usage: { inputTokens: 12, outputTokens: 3 },
        stopReason: 'end_turn',
      }
    },
  }
  const model = createBedrockTextModel({ client })
  const res = await model({ modelId: 'm-1', system: 'SYS', user: 'USR', maxTokens: 200 })
  assert.deepEqual(res, { text: 'hello world', inputTokens: 12, outputTokens: 3, stopReason: 'end_turn' })
  assert.equal(sent.length, 1)
  assert.equal(sent[0].modelId, 'm-1')
  assert.deepEqual(sent[0].system, [{ text: 'SYS' }])
  assert.deepEqual(sent[0].messages, [{ role: 'user', content: [{ text: 'USR' }] }])
  assert.equal(sent[0].inferenceConfig.maxTokens, 200)
  assert.equal(sent[0].inferenceConfig.temperature, 0)
})

test('converse client tolerates missing usage and empty output', async () => {
  const model = createBedrockTextModel({ client: { send: async () => ({}) } })
  const res = await model({ modelId: 'm', system: 's', user: 'u', maxTokens: 1 })
  assert.deepEqual(res, { text: '', inputTokens: 0, outputTokens: 0, stopReason: undefined })
})

test('converse client lets errors through unchanged', async () => {
  const err = Object.assign(new Error('slow down'), { name: 'ThrottlingException' })
  const model = createBedrockTextModel({ client: { send: async () => { throw err } } })
  await assert.rejects(model({ modelId: 'm', system: 's', user: 'u', maxTokens: 1 }), err)
})

test('isThrottling covers names and statuses', () => {
  assert.equal(isThrottling({ name: 'ThrottlingException' }), true)
  assert.equal(isThrottling({ name: 'ServiceUnavailableException' }), true)
  assert.equal(isThrottling({ $metadata: { httpStatusCode: 429 } }), true)
  assert.equal(isThrottling({ $metadata: { httpStatusCode: 503 } }), true)
  assert.equal(isThrottling({ $metadata: { httpStatusCode: 400 } }), false)
  assert.equal(isThrottling({ name: 'ValidationException' }), false)
  assert.equal(isThrottling(null), false)
  assert.equal(isThrottling('x'), false)
})

test('withRetry backs off exponentially and stops after the retries', async () => {
  const waits: number[] = []
  let calls = 0
  const err = { name: 'ThrottlingException' }
  await assert.rejects(
    withRetry(async () => { calls++; throw err }, { retries: 3, baseMs: 500, random: () => 1, sleep: async (ms) => { waits.push(ms) } }),
    (e) => e === err,
  )
  assert.equal(calls, 4)
  assert.deepEqual(waits, [500, 1000, 2000])
})

test('withRetry applies full jitter to each wait', async () => {
  const waits: number[] = []
  await assert.rejects(withRetry(async () => { throw { name: 'ThrottlingException' } }, { retries: 2, baseMs: 500, random: () => 0.5, sleep: async (ms) => { waits.push(ms) } }))
  assert.deepEqual(waits, [250, 500])
})

test('default client config sets maxAttempts to 1 so withRetry is the only retry', async () => {
  const cfg = bedrockClientConfig()
  assert.equal(cfg.maxAttempts, 1)
  assert.equal(bedrockClientConfig('eu-west-1').region, 'eu-west-1')
  const client = new BedrockRuntimeClient(cfg)
  assert.equal(await (client.config.maxAttempts as () => Promise<number>)(), 1)
})

test('converse client returns the stop reason', async () => {
  const model = createBedrockTextModel({ client: { send: async () => ({ output: { message: { content: [{ toolUse: {} }] } }, stopReason: 'max_tokens' }) } })
  const res = await model({ modelId: 'm', system: 's', user: 'u', maxTokens: 1 })
  assert.equal(res.text, '')
  assert.equal(res.stopReason, 'max_tokens')
})

test('withRetry returns after a transient failure and skips non-retryable errors', async () => {
  let n = 0
  const ok = await withRetry(async () => { if (++n < 2) throw { name: 'ThrottlingException' }; return 'ok' }, { sleep: async () => {} })
  assert.equal(ok, 'ok')
  let calls = 0
  await assert.rejects(withRetry(async () => { calls++; throw new Error('bad') }, { sleep: async () => {} }))
  assert.equal(calls, 1)
})
