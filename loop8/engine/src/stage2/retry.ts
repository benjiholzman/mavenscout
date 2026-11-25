// Shared retry for model calls that can be throttled. Used by the Fit call, the
// components call and the summaries call. Never logs anything: errors can carry
// request details.

export interface RetryOptions {
  retries?: number
  baseMs?: number
  /** Upper bound of one wait, before jitter. Keeps a long retry from waiting minutes. */
  maxDelayMs?: number
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

/** A model call was not started or not retried because the run is out of time. Not retryable, and not
 *  a model failure: the candidate keeps its estimate. The name is the code, the message is the code too. */
export class DeadlineError extends Error {
  constructor() {
    super('run_deadline')
    this.name = 'RunDeadline'
  }
}

/** How long one Converse call may take before the text model client gives up on it. A Fit reply is at most
 *  a few hundred tokens, so a call still open after this is hung, not slow. Lives here, with no AWS import,
 *  because the run deadline also needs it to know how long a call that already started can still run. */
export const REQUEST_TIMEOUT_MS = 25_000

export const DEFAULT_RETRIES = 5
export const DEFAULT_MAX_DELAY_MS = 8000

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

/** True for the errors a retry can fix: everything isThrottling covers, plus a model call that timed out
 *  or failed on the service side (ModelTimeoutException, HTTP 408, ModelErrorException, HTTP 424) and
 *  RequestTimeout, which the text model client raises when its own request timeout fires. */
export function isRetryable(err: unknown): boolean {
  if (isThrottling(err)) return true
  if (typeof err !== 'object' || err === null) return false
  const name = (err as { name?: unknown }).name
  const status = (err as { $metadata?: { httpStatusCode?: unknown } }).$metadata?.httpStatusCode
  return (
    name === 'ModelTimeoutException' ||
    name === 'ModelErrorException' ||
    name === 'RequestTimeout' ||
    status === 408 ||
    status === 424
  )
}

/** Run fn, retrying retryable errors with full jitter backoff: a wait of
 *  random() * min(maxDelayMs, baseMs * 2^attempt).
 *  Defaults: 5 retries, 500 ms base, 8 s cap, isRetryable. The last error is thrown
 *  once the retries are used up. */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? DEFAULT_RETRIES
  const baseMs = opts.baseMs ?? 500
  const maxDelayMs = opts.maxDelayMs ?? DEFAULT_MAX_DELAY_MS
  const sleep = opts.sleep ?? defaultSleep
  const retryable = opts.isRetryable ?? isRetryable
  const random = opts.random ?? Math.random
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt >= retries || !retryable(err)) throw err
      await sleep(random() * Math.min(maxDelayMs, baseMs * 2 ** attempt))
    }
  }
}
