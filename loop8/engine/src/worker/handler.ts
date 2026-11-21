import type { Context, SQSEvent } from 'aws-lambda'
import { createEngineFromEnv, createLazyEngine } from '../engine/factory'
import { realEngineDeps } from '../engine/real-deps'
import { createAwsRetry, createAwsStore } from '../shared/aws-store'
import { DEFAULT_LIMITS } from '../shared/limits'
import { processJob } from './app'
import { buildRetrySoon } from './queue-url'

const region = process.env.AWS_REGION ?? 'us-east-1'
const store = createAwsStore({ table: process.env.JOBS_TABLE ?? '', bucket: process.env.JOBS_BUCKET ?? '', region })
const retryByUrl = new Map<string, ReturnType<typeof createAwsRetry>>()
const makeRetry = (queueUrl: string) => {
  let retry = retryByUrl.get(queueUrl)
  if (!retry) retryByUrl.set(queueUrl, (retry = createAwsRetry({ queueUrl, region })))
  return retry
}

// The engine is built on the first job, not at module load. A configuration error then fails that job with a
// clear code (processJob records a TerminalError as FAILED) instead of crashing the container on every cold
// start and burning the five receives. ENGINE=stub, the default, builds nothing that can fail.
const { engine, jobText } = createLazyEngine(() =>
  createEngineFromEnv(process.env, realEngineDeps((key) => store.getObject(key))),
)

// Batch size is 1. An error propagates so SQS redelivers the message.
export async function handler(event: SQSEvent, context: Context): Promise<void> {
  for (const record of event.Records) {
    await processJob(record.body, Number(record.attributes.ApproximateReceiveCount), {
      store,
      engine,
      jobText,
      limits: DEFAULT_LIMITS,
      now: Date.now,
      workerId: context.awsRequestId,
      deadlineAt: Date.now() + context.getRemainingTimeInMillis(),
      retrySoon: buildRetrySoon({
        envUrl: process.env.JOBS_QUEUE_URL,
        eventSourceArn: record.eventSourceARN,
        receiptHandle: record.receiptHandle,
        delaySeconds: DEFAULT_LIMITS.retryDelaySeconds,
        makeRetry,
      }),
    })
  }
}
