// The model call of the extraction. It reuses the text model client and the retry rules of Fit and the
// summaries, with limits that fit a route that API Gateway cuts at 30 seconds. Nothing is logged here,
// because the prompt carries the job description.

import type { TextModel } from '../models/text-model'
import { DeadlineError, withRetry } from '../stage2/retry'

export interface Prompt {
  system: string
  user: string
}

/** Completes one prompt and returns the text of the reply. */
export type CompleteFn = (prompt: Prompt) => Promise<string>

export interface Usage {
  /** Model calls that returned a reply. Tries that failed are not counted. */
  calls: number
  inputTokens: number
  outputTokens: number
}

/** How long one model call may take before the text model client gives up. The handler builds the client
 *  with this value and the deadline rule below uses it, so a retry starts only when a whole call still fits. */
export const EXTRACT_CALL_TIMEOUT_MS = 10_000

/** A reply is a short JSON object, so this is far above what a normal reply needs. */
const MAX_TOKENS = 1024

/** One retry at most: two tries of 10 seconds and the wait between them fit inside the 25 second Lambda. */
const RETRIES = 1

export interface CompleterOptions {
  textModel: TextModel
  modelId: string
  /** Epoch milliseconds. A retry does not start when less than one call timeout remains before it. */
  deadlineAt: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  random?: () => number
}

/** One completer per request, so its token counts belong to that request. */
export function createExtractCompleter(opts: CompleterOptions): { complete: CompleteFn; usage(): Usage } {
  const now = opts.now ?? Date.now
  const usage: Usage = { calls: 0, inputTokens: 0, outputTokens: 0 }
  const complete: CompleteFn = async ({ system, user }) => {
    let tries = 0
    return withRetry(
      async () => {
        // The first try always starts. A retry starts only when a whole call still fits before the deadline.
        if (tries > 0 && opts.deadlineAt - now() < EXTRACT_CALL_TIMEOUT_MS) throw new DeadlineError()
        tries++
        const res = await opts.textModel({ modelId: opts.modelId, system, user, maxTokens: MAX_TOKENS })
        usage.calls++
        usage.inputTokens += res.inputTokens
        usage.outputTokens += res.outputTokens
        const text = res.text.trim()
        if (text === '') throw new Error('empty_reply')
        return text
      },
      { retries: RETRIES, baseMs: 500, maxDelayMs: 2000, sleep: opts.sleep, random: opts.random },
    )
  }
  return { complete, usage: () => ({ ...usage }) }
}
