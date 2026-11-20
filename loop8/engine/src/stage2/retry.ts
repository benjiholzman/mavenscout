// Shared retry for model calls that can be throttled. Used by the Fit call and
// the summaries call. Never logs anything: errors can carry request details.

export interface RetryOptions {
  retries?: number
  baseMs?: number
  sleep?: (ms: number) => Promise<void>
  isRetryable?: (err: unknown) => boolean
  /** Returns a number in [0, 1). Injectable so tests are deterministic. */
  random?: () => number
}

/** A model reply that could not be used (cut off, or invalid after the retry). It carries the
 *  tokens of every reply in the call, because those are billed. The name is the code, so a log
 *  line can show it; the message is the code too and never carries model text. */
export class ReplyError extends Error {
  constructor(public code: string, public inputTokens: number, public outputTokens: number) {
    super(code)
    this.name = code
  }
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** True for throttling and transient service errors: ThrottlingException,
 *  ServiceUnavailableException, HTTP 429 and HTTP 5xx. */
export function isThrottling(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const name = (err as { name?: unknown }).name
  const status = (err as { $metadata?: { httpStatusCode?: unknown } }).$metadata?.httpStatusCode
  return (
    name === 'ThrottlingException' ||
    name === 'ServiceUnavailableException' ||
    status === 429 ||
    (typeof status === 'number' && status >= 500)
  )
}

/** Run fn, retrying retryable errors with full jitter backoff: a wait of
 *  random() * baseMs * 2^attempt.
 *  Defaults: 3 retries, 500 ms base, isThrottling. The last error is thrown
 *  once the retries are used up. */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 3
  const baseMs = opts.baseMs ?? 500
  const sleep = opts.sleep ?? defaultSleep
  const retryable = opts.isRetryable ?? isThrottling
  const random = opts.random ?? Math.random
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt >= retries || !retryable(err)) throw err
      await sleep(random() * baseMs * 2 ** attempt)
    }
  }
}
