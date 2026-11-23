import test from 'node:test'
import assert from 'node:assert/strict'
import { createExtractCompleter, EXTRACT_CALL_TIMEOUT_MS } from '../src/extract/complete'
import type { TextModel, TextRequest, TextResponse } from '../src/models/text-model'

const prompt = { system: 'sys', user: 'user text' }
const reply = (text: string, inputTokens = 100, outputTokens = 20): TextResponse => ({ text, inputTokens, outputTokens })
const named = (name: string) => Object.assign(new Error(name), { name })

function setup(steps: Array<TextResponse | Error>, deadlineAt = 1_000_000, nowRef = { t: 0 }) {
  const requests: TextRequest[] = []
  const sleeps: number[] = []
  let i = 0
  const textModel: TextModel = async (req) => {
    requests.push(req)
    const step = steps[Math.min(i++, steps.length - 1)]
    if (step instanceof Error) throw step
    return step
  }
  const completer = createExtractCompleter({
    textModel,
    modelId: 'model-x',
    deadlineAt,
    now: () => nowRef.t,
    sleep: async (ms) => void sleeps.push(ms),
    random: () => 0.5,
  })
  return { completer, requests, sleeps }
}

test('returns the trimmed text, sends the model id and counts the tokens', async () => {
  const { completer, requests } = setup([reply('  {"a":1}\n', 120, 30)])
  assert.equal(await completer.complete(prompt), '{"a":1}')
  assert.equal(requests.length, 1)
  assert.equal(requests[0].modelId, 'model-x')
  assert.equal(requests[0].system, 'sys')
  assert.equal(requests[0].user, 'user text')
  assert.deepEqual(completer.usage(), { calls: 1, inputTokens: 120, outputTokens: 30 })
})

test('a throttle is retried once and the tokens of the good reply are counted', async () => {
  const { completer, requests, sleeps } = setup([named('ThrottlingException'), reply('ok', 50, 5)])
  assert.equal(await completer.complete(prompt), 'ok')
  assert.equal(requests.length, 2)
  assert.equal(sleeps.length, 1)
  assert.deepEqual(completer.usage(), { calls: 1, inputTokens: 50, outputTokens: 5 })
})

test('a request timeout is retried, and a second failure is thrown after one retry only', async () => {
  const { completer, requests } = setup([named('RequestTimeout')])
  await assert.rejects(() => completer.complete(prompt), (e: Error) => e.name === 'RequestTimeout')
  assert.equal(requests.length, 2)
})

test('an error that a retry cannot fix is thrown at once', async () => {
  const { completer, requests, sleeps } = setup([named('AccessDeniedException'), reply('never')])
  await assert.rejects(() => completer.complete(prompt), (e: Error) => e.name === 'AccessDeniedException')
  assert.equal(requests.length, 1)
  assert.equal(sleeps.length, 0)
})

test('a retry does not start when a whole call no longer fits before the deadline', async () => {
  const clock = { t: 0 }
  const { completer, requests } = setup([named('ThrottlingException'), reply('late')], EXTRACT_CALL_TIMEOUT_MS - 1, clock)
  await assert.rejects(() => completer.complete(prompt), (e: Error) => e.name === 'RunDeadline')
  assert.equal(requests.length, 1)
})

test('the first try starts even when the deadline is already close', async () => {
  const { completer, requests } = setup([reply('ok')], 1)
  assert.equal(await completer.complete(prompt), 'ok')
  assert.equal(requests.length, 1)
})

test('an empty reply is an error, and its tokens are still counted', async () => {
  const { completer } = setup([reply('   ', 80, 0)])
  await assert.rejects(() => completer.complete(prompt), /empty_reply/)
  assert.deepEqual(completer.usage(), { calls: 1, inputTokens: 80, outputTokens: 0 })
})

test('each completer counts only its own calls', async () => {
  const a = setup([reply('x', 10, 1)]).completer
  const b = setup([reply('y', 20, 2)]).completer
  await a.complete(prompt)
  await b.complete(prompt)
  assert.deepEqual(a.usage(), { calls: 1, inputTokens: 10, outputTokens: 1 })
  assert.deepEqual(b.usage(), { calls: 1, inputTokens: 20, outputTokens: 2 })
})
