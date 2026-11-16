import { randomUUID } from 'node:crypto'
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { loadSettings } from '../core/settings'
import { DEFAULT_LIMITS } from '../shared/limits'
import { createAwsQueue, createAwsStore } from '../shared/aws-store'
import { handleApi } from './app'

const region = process.env.AWS_REGION ?? 'us-east-1'
const store = createAwsStore({ table: process.env.JOBS_TABLE ?? '', bucket: process.env.JOBS_BUCKET ?? '', region })
const queue = createAwsQueue({ queueUrl: process.env.JOBS_QUEUE_URL ?? '', region })
const settings = loadSettings(process.env)

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const headers: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(event.headers ?? {})) headers[k.toLowerCase()] = v
  const body =
    event.body == null ? null : event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body

  const res = await handleApi(
    { method: event.requestContext.http.method, path: event.rawPath, headers, body },
    { store, queue, settings, limits: DEFAULT_LIMITS, now: Date.now, newId: randomUUID },
  )
  return {
    statusCode: res.status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(res.body),
  }
}
