// Lambda entry of the route POST /extract. The role of this function may call the extraction model and write
// one counter key of the jobs table, and nothing else.

import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda'
import { internalError, toApiRequest, toHttpResponse } from '../api/http'
import { loadSettings } from '../core/settings'
import { createBedrockTextModel } from '../models/text-model'
import { createAwsStore } from '../shared/aws-store'
import { DEFAULT_LIMITS } from '../shared/limits'
import { log } from '../shared/log'
import { createExtractCompleter, EXTRACT_CALL_TIMEOUT_MS } from './complete'
import { extractFromJd } from './extract'
import { handleExtract, type ExtractOutcome } from './route'

const region = process.env.AWS_REGION ?? 'us-east-1'
// This function has no access to the bucket, so the store only serves the daily counter.
const store = createAwsStore({ table: process.env.JOBS_TABLE ?? '', bucket: '', region })
const settings = loadSettings(process.env)
const textModel = createBedrockTextModel({ requestTimeoutMs: EXTRACT_CALL_TIMEOUT_MS })

/** Time left for the response after the last model try, in milliseconds. */
const RESPONSE_MARGIN_MS = 2000

export async function handler(
  event: APIGatewayProxyEventV2,
  context: Context,
): Promise<APIGatewayProxyStructuredResultV2> {
  const startedAt = Date.now()
  const completer = createExtractCompleter({
    textModel,
    modelId: settings.extractModel,
    deadlineAt: startedAt + context.getRemainingTimeInMillis() - RESPONSE_MARGIN_MS,
  })
  let degraded = false
  try {
    const res = await handleExtract(toApiRequest(event), {
      counter: store,
      limits: DEFAULT_LIMITS,
      now: Date.now,
      extract: async (jdText, ctx) => {
        const extracted = await extractFromJd(jdText, ctx, {
          complete: completer.complete,
          onFallback: () => {
            degraded = true
          },
        })
        return { extracted, degraded, model: settings.extractModel }
      },
    })
    // One line per call. It never carries the job description or the reply of the model.
    const body = res.body as Partial<ExtractOutcome>
    log('extract_done', {
      jobId: 'n/a',
      status: res.status,
      model: settings.extractModel,
      degraded: body.extracted ? body.degraded === true : null,
      durationMs: Date.now() - startedAt,
      ...completer.usage(),
      expertise: body.extracted ? body.extracted.expertise.length : null,
    })
    return toHttpResponse(res)
  } catch (e) {
    console.error(JSON.stringify({ event: 'extract_error', message: e instanceof Error ? e.message : String(e) }))
    return internalError()
  }
}
