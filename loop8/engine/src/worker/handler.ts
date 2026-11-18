import type { Context, SQSEvent } from 'aws-lambda'
import { createStubEngine, stubOptionsFromEnv } from '../engine/stub'
import { createAwsStore } from '../shared/aws-store'
import { DEFAULT_LIMITS } from '../shared/limits'
import { processJob } from './app'

const region = process.env.AWS_REGION ?? 'us-east-1'
const store = createAwsStore({ table: process.env.JOBS_TABLE ?? '', bucket: process.env.JOBS_BUCKET ?? '', region })
const engine = createStubEngine(stubOptionsFromEnv(process.env))

// Batch size is 1. An error propagates so SQS redelivers the message.
export async function handler(event: SQSEvent, context: Context): Promise<void> {
  for (const record of event.Records) {
    await processJob(record.body, Number(record.attributes.ApproximateReceiveCount), {
      store,
      engine,
      limits: DEFAULT_LIMITS,
      now: Date.now,
      workerId: context.awsRequestId,
    })
  }
}
