import { randomUUID } from 'node:crypto'
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createSolComplete } from '../bedrock/sol'
import { loadSettings } from '../core/settings'
import { extractFromJd } from '../extract/extract'
import { DEFAULT_LIMITS } from '../shared/limits'
import { createAwsQueue, createAwsStore } from '../shared/aws-store'
import { handleApi } from './app'
import { internalError, toApiRequest, toHttpResponse } from './http'

const region = process.env.AWS_REGION ?? 'us-east-1'
const store = createAwsStore({ table: process.env.JOBS_TABLE ?? '', bucket: process.env.JOBS_BUCKET ?? '', region })
const queue = createAwsQueue({ queueUrl: process.env.JOBS_QUEUE_URL ?? '', region })
const settings = loadSettings(process.env)
const complete = createSolComplete(settings.extractModel)

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const res = await handleApi(toApiRequest(event), {
      store, queue, settings, limits: DEFAULT_LIMITS, now: Date.now, newId: randomUUID,
      extract: (jdText, ctx) => extractFromJd(jdText, ctx, { complete }),
    })
    return toHttpResponse(res)
  } catch (e) {
    console.error(JSON.stringify({ event: 'api_error', message: e instanceof Error ? e.message : String(e) }))
    return internalError()
  }
}
