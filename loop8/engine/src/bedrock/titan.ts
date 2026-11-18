// Shared Titan Text Embeddings V2 helper (issue #20, contract point 1).
//
// This is the ONE place the embedding config lives. Both the indexing script
// (profile fragments) and the rankPool query side must call embedText, so the
// two embed into the same space and cosine scores are comparable. Do not add a
// second embedding path.
//
// To run this (and build.ts) two prerequisites are needed, both gated:
//   1. npm i @aws-sdk/client-bedrock-runtime  (edits the root package.json, so
//      it carries the reason from issue #20).
//   2. AWS Bedrock access to invoke Titan in the customer account (us-east-1),
//      with the APN tag on anything created. Read-only access cannot invoke;
//      confirm InvokeModel is allowed before a real run.
//
// Titan V2 request:  { inputText, dimensions: 1024, normalize: true }
// Titan V2 response: { embedding: number[], inputTextTokenCount }

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'

const REGION = process.env.AWS_REGION ?? 'us-east-1'

/** The embedding model id. Stored on every fragment and the artifact so a run
 *  proves which space it used; vectors from different models are never mixed. */
export const MODEL_VERSION = process.env.TITAN_MODEL_ID ?? 'amazon.titan-embed-text-v2:0'
export const DIMENSIONS = 1024
export const METRIC = 'cosine' as const

const MAX_RETRIES = 3
const BASE_DELAY_MS = 400

const client = new BedrockRuntimeClient({ region: REGION })

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** True for throttling and transient server errors worth retrying. */
function isRetryable(err: unknown): boolean {
  const name = (err as { name?: string })?.name ?? ''
  const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode
  return (
    name === 'ThrottlingException' ||
    name === 'ModelTimeoutException' ||
    name === 'ServiceUnavailableException' ||
    name === 'InternalServerException' ||
    status === 429 ||
    (status != null && status >= 500)
  )
}

/** Embed one text into a normalized 1024-dim Titan V2 vector. Retries on
 *  throttling with exponential backoff and jitter. */
export async function embedText(text: string): Promise<number[]> {
  const input = text.trim()
  if (input === '') throw new Error('embedText received empty text')

  const body = JSON.stringify({ inputText: input, dimensions: DIMENSIONS, normalize: true })

  let lastErr: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await client.send(
        new InvokeModelCommand({
          modelId: MODEL_VERSION,
          contentType: 'application/json',
          accept: 'application/json',
          body,
        }),
      )
      const parsed = JSON.parse(new TextDecoder().decode(res.body)) as { embedding?: number[] }
      const vector = parsed.embedding
      if (!Array.isArray(vector) || vector.length !== DIMENSIONS) {
        throw new Error(`Titan returned ${vector?.length ?? 'no'} dims, expected ${DIMENSIONS}`)
      }
      return vector
    } catch (err) {
      lastErr = err
      if (attempt < MAX_RETRIES && isRetryable(err)) {
        await sleep(BASE_DELAY_MS * 2 ** attempt + Math.random() * BASE_DELAY_MS)
        continue
      }
      throw err
    }
  }
  throw lastErr
}
