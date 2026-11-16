import { gunzipSync, gzipSync } from 'node:zlib'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import type { JdMatchResult } from '../core/types'
import type { FinishUpdate, JobItem, JobQueue, JobStore } from './store'

// Anything with a send method, so tests can inject fakes. No AWS call is made unless the defaults are used.
export interface Sendable {
  send(command: any): Promise<any>
}

export interface AwsStoreClients {
  ddb?: Sendable
  s3?: Sendable
}

const DAY_SECONDS = 86400
const nowSeconds = () => Math.floor(Date.now() / 1000)

function isConditionalFailure(e: unknown): boolean {
  return (e as { name?: string } | null)?.name === 'ConditionalCheckFailedException'
}

function clean(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

export function createAwsStore(
  cfg: { table: string; bucket: string; region: string },
  clients: AwsStoreClients = {},
): JobStore {
  const ddb: Sendable =
    clients.ddb ??
    DynamoDBDocumentClient.from(new DynamoDBClient({ region: cfg.region }), {
      marshallOptions: { removeUndefinedValues: true },
    })
  const s3: Sendable = clients.s3 ?? new S3Client({ region: cfg.region })
  const TableName = cfg.table
  const metaKey = (jobId: string) => ({ pk: `JOB#${jobId}`, sk: 'META' })

  // Runs a conditional write and turns a failed condition into false.
  async function conditional(command: unknown): Promise<boolean> {
    try {
      await ddb.send(command)
      return true
    } catch (e) {
      if (isConditionalFailure(e)) return false
      throw e
    }
  }

  return {
    async findIdempotent(key) {
      const out = await ddb.send(new GetCommand({ TableName, Key: { pk: `IDEM#${key}`, sk: 'IDEM' } }))
      return (out.Item?.jobId as string | undefined) ?? null
    },

    async claimIdempotency(key, jobId, expiresAt) {
      const ok = await conditional(
        new PutCommand({
          TableName,
          Item: { pk: `IDEM#${key}`, sk: 'IDEM', jobId, expires_at: Math.floor(expiresAt / 1000) },
          ConditionExpression: 'attribute_not_exists(pk)',
        }),
      )
      if (ok) return jobId
      const out = await ddb.send(
        new GetCommand({ TableName, Key: { pk: `IDEM#${key}`, sk: 'IDEM' }, ConsistentRead: true }),
      )
      return (out.Item?.jobId as string | undefined) ?? jobId
    },

    async incrementDaily(day, cap) {
      return conditional(
        new UpdateCommand({
          TableName,
          Key: { pk: `DAY#${day}`, sk: 'COUNT' },
          UpdateExpression: 'ADD #count :one SET expires_at = if_not_exists(expires_at, :exp)',
          ConditionExpression: 'attribute_not_exists(#count) OR #count < :cap',
          ExpressionAttributeNames: { '#count': 'count' },
          ExpressionAttributeValues: { ':one': 1, ':cap': cap, ':exp': nowSeconds() + 2 * DAY_SECONDS },
        }),
      )
    },

    async createJob(job) {
      const { expiresAt, ...rest } = job
      // A failed condition means the id exists, so the ConditionalCheckFailedException propagates.
      await ddb.send(
        new PutCommand({
          TableName,
          Item: { ...metaKey(job.jobId), ...clean(rest as unknown as Record<string, unknown>), expires_at: Math.floor(expiresAt / 1000) },
          ConditionExpression: 'attribute_not_exists(pk)',
        }),
      )
    },

    async getJob(jobId) {
      const out = await ddb.send(new GetCommand({ TableName, Key: metaKey(jobId), ConsistentRead: true }))
      if (!out.Item) return null
      const { pk: _pk, sk: _sk, expires_at, ...rest } = out.Item
      return { ...rest, expiresAt: (expires_at as number) * 1000 } as JobItem
    },

    async acquireLease(jobId, owner, now, leaseMs) {
      return conditional(
        new UpdateCommand({
          TableName,
          Key: metaKey(jobId),
          UpdateExpression:
            'SET #state = :running, #leaseOwner = :owner, #leaseUntil = :until, #startedAt = if_not_exists(#startedAt, :now)',
          ConditionExpression:
            'attribute_exists(pk) AND (#state = :queued OR (#state = :running AND #leaseUntil < :now))',
          ExpressionAttributeNames: {
            '#state': 'state',
            '#leaseOwner': 'leaseOwner',
            '#leaseUntil': 'leaseUntil',
            '#startedAt': 'startedAt',
          },
          ExpressionAttributeValues: {
            ':running': 'RUNNING',
            ':queued': 'QUEUED',
            ':owner': owner,
            ':until': now + leaseMs,
            ':now': now,
          },
        }),
      )
    },

    async saveCheckpoint(jobId, result) {
      await ddb.send(
        new PutCommand({
          TableName,
          Item: {
            pk: `JOB#${jobId}`,
            sk: `CAND#${result.profile_id}`,
            result,
            expires_at: nowSeconds() + 7 * DAY_SECONDS,
          },
        }),
      )
    },

    async listCheckpoints(jobId) {
      const results: JdMatchResult[] = []
      let startKey: Record<string, unknown> | undefined
      do {
        const out: any = await ddb.send(
          new QueryCommand({
            TableName,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: { ':pk': `JOB#${jobId}`, ':prefix': 'CAND#' },
            ConsistentRead: true,
            ExclusiveStartKey: startKey,
          }),
        )
        for (const item of out.Items ?? []) results.push(item.result as JdMatchResult)
        startKey = out.LastEvaluatedKey
      } while (startKey)
      return results
    },

    async setProgress(jobId, done) {
      await conditional(
        new UpdateCommand({
          TableName,
          Key: metaKey(jobId),
          UpdateExpression: 'SET #progress.#done = :done',
          ConditionExpression: 'attribute_exists(pk)',
          ExpressionAttributeNames: { '#progress': 'progress', '#done': 'done' },
          ExpressionAttributeValues: { ':done': done },
        }),
      )
    },

    async finishJob(jobId, update: FinishUpdate) {
      const fields = clean(update as unknown as Record<string, unknown>)
      const names: Record<string, string> = { '#state': 'state' }
      const values: Record<string, unknown> = { ':tDone': 'DONE', ':tPartial': 'PARTIAL', ':tFailed': 'FAILED' }
      const sets: string[] = []
      Object.entries(fields).forEach(([key, value], i) => {
        names[`#f${i}`] = key
        values[`:f${i}`] = value
        sets.push(`#f${i} = :f${i}`)
      })
      return conditional(
        new UpdateCommand({
          TableName,
          Key: metaKey(jobId),
          UpdateExpression: `SET ${sets.join(', ')}`,
          ConditionExpression: 'attribute_exists(pk) AND NOT #state IN (:tDone, :tPartial, :tFailed)',
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
        }),
      )
    },

    async putObject(key, body) {
      await s3.send(
        new PutObjectCommand({
          Bucket: cfg.bucket,
          Key: key,
          Body: gzipSync(Buffer.from(body, 'utf8')),
          ContentEncoding: 'gzip',
          ContentType: 'application/json',
        }),
      )
    },

    async getObject(key) {
      try {
        const out = await s3.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }))
        const bytes: Uint8Array = await out.Body.transformToByteArray()
        return gunzipSync(Buffer.from(bytes)).toString('utf8')
      } catch (e) {
        if ((e as { name?: string } | null)?.name === 'NoSuchKey') return null
        throw e
      }
    },

    async objectUrl(key) {
      return getSignedUrl(s3 as S3Client, new GetObjectCommand({ Bucket: cfg.bucket, Key: key }), { expiresIn: 300 })
    },
  }
}

export function createAwsQueue(cfg: { queueUrl: string; region: string }, client?: Sendable): JobQueue {
  const sqs: Sendable = client ?? new SQSClient({ region: cfg.region })
  return {
    async send(jobId) {
      await sqs.send(new SendMessageCommand({ QueueUrl: cfg.queueUrl, MessageBody: jobId }))
    },
  }
}
