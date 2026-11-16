import test from 'node:test'
import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import { createAwsStore, createAwsQueue } from '../src/shared/aws-store'
import type { JobItem } from '../src/shared/store'

type Call = { name: string; input: Record<string, any> }

function fakeClient(handler: (c: Call) => unknown) {
  const calls: Call[] = []
  return {
    calls,
    send: async (cmd: { constructor: { name: string }; input: Record<string, any> }) => {
      const call = { name: cmd.constructor.name, input: cmd.input }
      calls.push(call)
      const out = handler(call)
      if (out instanceof Error) throw out
      return out ?? {}
    },
  }
}

function named(name: string, message = name): Error {
  const e = new Error(message)
  e.name = name
  return e
}

const cfg = { table: 'T', bucket: 'B', region: 'us-east-1' }
const conflict = () => named('ConditionalCheckFailedException')

function mk(ddb: ReturnType<typeof fakeClient>, s3 = fakeClient(() => ({}))) {
  return createAwsStore(cfg, { ddb: ddb as any, s3: s3 as any })
}

function job(): JobItem {
  return {
    jobId: 'j1', state: 'QUEUED', createdAt: 1, inputKey: 'in/j1.json',
    settings: {
      variant: 'v', fitModel: 'f', textModel: 't', embedModel: 'e',
      summaryCount: 1, parallelCalls: 1, threshold: null, promptVersion: 'p',
    },
    progress: { done: 0, total: 3 }, fallbacks: [], record: [], expiresAt: 5_000_000,
  }
}

test('claimIdempotency returns the existing job id on a conditional failure', async () => {
  const ddb = fakeClient((c) => {
    if (c.name === 'PutCommand') return conflict()
    if (c.name === 'GetCommand') return { Item: { pk: 'IDEM#k', sk: 'IDEM', jobId: 'owner' } }
  })
  assert.equal(await mk(ddb).claimIdempotency('k', 'mine', 5000), 'owner')
  const put = ddb.calls[0]
  assert.equal(put.input.ConditionExpression, 'attribute_not_exists(pk)')
  assert.equal(put.input.Item.expires_at, 5)
})

test('claimIdempotency returns the new job id when the key is free', async () => {
  const ddb = fakeClient(() => ({}))
  assert.equal(await mk(ddb).claimIdempotency('k', 'mine', 5000), 'mine')
})

test('incrementDaily returns false when the cap is reached', async () => {
  const ddb = fakeClient(() => conflict())
  assert.equal(await mk(ddb).incrementDaily('2026-11-17', 3), false)
})

test('incrementDaily returns true when the update succeeds', async () => {
  const ddb = fakeClient(() => ({}))
  assert.equal(await mk(ddb).incrementDaily('2026-11-17', 3), true)
  assert.match(ddb.calls[0].input.ConditionExpression, /#count < :cap/)
})

test('acquireLease and finishJob return false on a conditional failure', async () => {
  const ddb = fakeClient(() => conflict())
  const s = mk(ddb)
  assert.equal(await s.acquireLease('j1', 'w', 10, 5), false)
  assert.equal(await s.finishJob('j1', { state: 'DONE', finishedAt: 9 }), false)
})

test('acquireLease and finishJob return true on success', async () => {
  const ddb = fakeClient(() => ({}))
  const s = mk(ddb)
  assert.equal(await s.acquireLease('j1', 'w', 10, 5), true)
  assert.equal(await s.finishJob('j1', { state: 'DONE', finishedAt: 9 }), true)
  assert.match(ddb.calls[0].input.ConditionExpression, /#state = :queued/)
  assert.match(ddb.calls[1].input.ConditionExpression, /NOT #state IN/)
})

test('a non-conditional error propagates', async () => {
  const ddb = fakeClient(() => named('ProvisionedThroughputExceededException'))
  const s = mk(ddb)
  await assert.rejects(s.acquireLease('j1', 'w', 10, 5), /ProvisionedThroughput/)
  await assert.rejects(s.incrementDaily('d', 1), /ProvisionedThroughput/)
})

test('createJob writes expires_at in seconds and getJob maps back', async () => {
  let stored: Record<string, any> | undefined
  const ddb = fakeClient((c) => {
    if (c.name === 'PutCommand') stored = c.input.Item
    if (c.name === 'GetCommand') return { Item: stored }
  })
  const s = mk(ddb)
  await s.createJob(job())
  assert.equal(stored!.pk, 'JOB#j1')
  assert.equal(stored!.sk, 'META')
  assert.equal(stored!.expires_at, 5000)
  assert.equal(ddb.calls[0].input.ConditionExpression, 'attribute_not_exists(pk)')
  assert.deepEqual(await s.getJob('j1'), job())
})

test('getJob returns null when missing', async () => {
  assert.equal(await mk(fakeClient(() => ({}))).getJob('x'), null)
})

test('listCheckpoints paginates', async () => {
  let n = 0
  const ddb = fakeClient(() => {
    n++
    return n === 1
      ? { Items: [{ pk: 'JOB#j', sk: 'CAND#a', result: { profile_id: 'a' } }], LastEvaluatedKey: { pk: 'x' } }
      : { Items: [{ pk: 'JOB#j', sk: 'CAND#b', result: { profile_id: 'b' } }] }
  })
  const r = await mk(ddb).listCheckpoints('j')
  assert.deepEqual(r.map((x) => x.profile_id), ['a', 'b'])
  assert.deepEqual(ddb.calls[1].input.ExclusiveStartKey, { pk: 'x' })
})

test('getObject returns null on NoSuchKey', async () => {
  const s3 = fakeClient(() => named('NoSuchKey'))
  assert.equal(await mk(fakeClient(() => ({})), s3).getObject('k'), null)
})

test('putObject gzips and getObject round-trips', async () => {
  let body: Buffer | undefined
  const s3 = fakeClient((c) => {
    if (c.name === 'PutObjectCommand') body = c.input.Body
    if (c.name === 'GetObjectCommand') return { Body: { transformToByteArray: async () => new Uint8Array(gzipSync('{"a":1}')) } }
  })
  const s = mk(fakeClient(() => ({})), s3)
  await s.putObject('k', '{"a":1}')
  const put = s3.calls[0].input
  assert.equal(put.ContentEncoding, 'gzip')
  assert.equal(put.ContentType, 'application/json')
  assert.ok(body && body[0] === 0x1f && body[1] === 0x8b)
  assert.equal(await s.getObject('k'), '{"a":1}')
})

test('queue sends the bare job id', async () => {
  const sqs = fakeClient(() => ({}))
  await createAwsQueue({ queueUrl: 'https://q', region: 'us-east-1' }, sqs as any).send('j1')
  assert.equal(sqs.calls[0].input.MessageBody, 'j1')
  assert.equal(sqs.calls[0].input.QueueUrl, 'https://q')
})
