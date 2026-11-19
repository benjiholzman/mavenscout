// Shared Sol text-generation helper (Phase 2 Task 1, the ingestion module).
//
// This is the ONE place the extraction model call lives. Extraction reads a job
// description ONCE and maps it onto the unified expertise list, so this helper
// is called once per job, never once per candidate. Do not call it in a loop
// over the pool: Sol pricing is not known yet and the account has a hard spend
// cap that revokes model access at 100 percent (decisions D-10).
//
// To run this two prerequisites are needed, both gated:
//   1. @aws-sdk/client-bedrock-runtime is a dependency of the engine package.
//   2. AWS Bedrock access to invoke Sol in the customer account (us-east-1)
//      through the US inference profile id us.openai.gpt-6-sol, via the
//      assumable role. Read-only access cannot invoke; confirm access first.
//
// The Bedrock Converse API is used rather than a model specific InvokeModel
// body, so the same code path works whichever text model the inference profile
// points at (Sol today, Luna or a Claude model if swapped).

import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime'

const REGION = process.env.AWS_REGION ?? 'us-east-1'

/** The extraction model id. Falls back to the US inference profile for Sol. */
export const EXTRACT_MODEL = process.env.EXTRACT_MODEL ?? process.env.SOL_MODEL_ID ?? 'us.openai.gpt-6-sol'

const MAX_RETRIES = 3
const BASE_DELAY_MS = 400

/** Keep the model deterministic and the reply small: extraction returns a short
 *  JSON object, not prose. */
const MAX_TOKENS = 1024
const TEMPERATURE = 0

const client = new BedrockRuntimeClient({ region: REGION })

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** One extraction prompt: a system instruction and the job description text. */
export interface Prompt {
  system: string
  user: string
}

/** Completes one prompt and returns the model's text reply. */
export type CompleteFn = (prompt: Prompt) => Promise<string>

// Usage counters so a hand-run extraction can report a measured Sol cost
// (CLAUDE section 4.3). Converse returns the token usage per call; we only
// accumulate it. Process-global, reset with resetSolStats to measure one phase.
let solCalls = 0
let solInputTokens = 0
let solOutputTokens = 0

/** Successful Sol calls and the tokens Bedrock billed for them. Retries do not
 *  count until they succeed. */
export function getSolStats(): { calls: number; inputTokens: number; outputTokens: number } {
  return { calls: solCalls, inputTokens: solInputTokens, outputTokens: solOutputTokens }
}

/** Zero the usage counters, so a following run measures only its own calls. */
export function resetSolStats(): void {
  solCalls = 0
  solInputTokens = 0
  solOutputTokens = 0
}

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

/** Call Sol with one prompt through the Bedrock Converse API. Retries on
 *  throttling with exponential backoff and jitter. The model id is injected so
 *  the same helper serves whichever inference profile the settings point at. */
export function createSolComplete(modelId: string = EXTRACT_MODEL): CompleteFn {
  return async ({ system, user }) => {
    let lastErr: unknown
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await client.send(
          new ConverseCommand({
            modelId,
            system: [{ text: system }],
            messages: [{ role: 'user', content: [{ text: user }] }],
            inferenceConfig: { maxTokens: MAX_TOKENS, temperature: TEMPERATURE },
          }),
        )
        const text = (res.output?.message?.content ?? [])
          .map((block) => ('text' in block ? block.text : ''))
          .join('')
          .trim()
        if (text === '') throw new Error('Sol returned an empty reply')
        solCalls++
        solInputTokens += res.usage?.inputTokens ?? 0
        solOutputTokens += res.usage?.outputTokens ?? 0
        return text
      } catch (err) {
        lastErr = err
        if (attempt < MAX_RETRIES && isRetryable(err)) {
          await sleep(BASE_DELAY_MS * 2 ** attempt + Math.random() * BASE_DELAY_MS)
          continue
        }
        throw err
      }
    }
    // Unreachable: the final attempt always throws above.
    throw lastErr
  }
}

/** The arrays extraction expects back from the model, before validation. */
export interface RawExtraction {
  expertise: string[]
  locations: string[]
  languages: string[]
}

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : []

/** Parse the model reply into three string arrays, tolerant of a reply wrapped
 *  in a fenced code block or with text around the JSON object. Throws only when
 *  no JSON object can be found at all; a present-but-partial object yields empty
 *  arrays for the missing keys, so a thin reply degrades to the deterministic
 *  floor rather than failing the whole extraction. */
export function parseExtraction(reply: string): RawExtraction {
  const fenced = reply.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : reply
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Sol reply contained no JSON object')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(body.slice(start, end + 1))
  } catch {
    throw new Error('Sol reply was not valid JSON')
  }
  const obj = (parsed ?? {}) as Record<string, unknown>
  return {
    expertise: asStrings(obj.expertise),
    locations: asStrings(obj.locations),
    languages: asStrings(obj.languages),
  }
}
