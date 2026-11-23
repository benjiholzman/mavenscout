import type {
  ExtractedRequirements,
  ExtractionContext,
  ExtractRequirementsFn,
  JdMatchResult,
  RankPoolFn,
  Requirement,
} from './types'

// ============================================================================
// Client for the ranking engine API (loop8/engine). The app calls rankPool as
// before; when VITE_ENGINE_URL is set, score.ts hands the call to this wrapper.
// It starts a job, polls it, and returns the engine's already ranked results.
//
// Nothing here touches fetch, sessionStorage or the clock at import time, so
// the module also loads in Node (the baseline harness).
// ============================================================================

export interface RemoteOptions {
  baseUrl: string
  fetch?: typeof fetch
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  sleep?: (ms: number) => Promise<void>
  now?: () => number
  newId?: () => string
}

const BUDGET_MS = 600000
const STEADY_MS = 30000
const START_INTERVAL_MS = 1000
const MAX_INTERVAL_MS = 5000
const GROWTH = 1.5

/** Next wait: steady at 1000 ms while polling is young, then grows by 1.5 up to 5000 ms. */
function nextInterval(prev: number, elapsedMs: number): number {
  return elapsedMs < STEADY_MS ? START_INTERVAL_MS : Math.min(prev * GROWTH, MAX_INTERVAL_MS)
}

/** FNV-1a, enough to tell one request body from another in a storage key. */
function fnv1a(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16)
}

interface Entry {
  requestId: string
  jobId?: string
}

const NO_STORAGE: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
}

/** Reading sessionStorage can throw when site data is blocked; then ranking works without resume. */
function defaultStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  try {
    return globalThis.sessionStorage ?? NO_STORAGE
  } catch {
    return NO_STORAGE
  }
}

export function createRemoteRankPool(opts: RemoteOptions): RankPoolFn {
  const base = opts.baseUrl.replace(/\/+$/, '')

  return async (jobDescriptionId: string, requirements: Requirement[], pool): Promise<JdMatchResult[]> => {
    if (pool.length === 0) return []

    // Defaults resolve here, when a ranking runs, never at import.
    const doFetch = opts.fetch ?? globalThis.fetch.bind(globalThis)
    const storage = opts.storage ?? defaultStorage()
    const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
    const now = opts.now ?? Date.now
    const newId = opts.newId ?? (() => crypto.randomUUID())

    const poolIds = [...new Set(pool.map((p) => p.id))].sort()
    const storageKey = `mavenscout-engine:${jobDescriptionId}:${fnv1a(JSON.stringify({ requirements, poolIds }))}`
    const deadline = now() + BUDGET_MS
    const timedOut = () => new Error('The ranking engine did not finish in time')

    const readEntry = (): Entry | null => {
      try {
        const raw = storage.getItem(storageKey)
        return raw ? (JSON.parse(raw) as Entry) : null
      } catch {
        return null
      }
    }
    const writeEntry = (entry: Entry) => {
      try {
        storage.setItem(storageKey, JSON.stringify(entry))
      } catch {
        // Storage is only a convenience for resuming after a reload.
      }
    }
    const clearEntry = () => {
      try {
        storage.removeItem(storageKey)
      } catch {
        // Nothing to clean up.
      }
    }

    // Retries network errors with backoff inside the overall budget; the same
    // idempotency key means a retry can never start a second job.
    const send = async (url: string, init?: RequestInit) => {
      let backoff = START_INTERVAL_MS
      for (;;) {
        try {
          return await doFetch(url, init)
        } catch (err) {
          if (now() >= deadline) throw err instanceof Error ? err : timedOut()
          await sleep(backoff)
          backoff = Math.min(backoff * GROWTH, MAX_INTERVAL_MS)
        }
      }
    }

    const startJob = async (requestId: string): Promise<string> => {
      writeEntry({ requestId })
      const res = await send(`${base}/jobs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': requestId },
        body: JSON.stringify({ jobDescriptionId, requirements, poolIds }),
      })
      const body = (await res.json().catch(() => ({}))) as { jobId?: string; error?: string; message?: string }
      if (res.status !== 202 || !body.jobId) {
        throw new Error(`Engine rejected the ranking: ${body.error ?? res.status} ${body.message ?? ''}`.trim())
      }
      writeEntry({ requestId, jobId: body.jobId })
      return body.jobId
    }

    const stored = readEntry()
    let jobId = stored?.jobId ?? (await startJob(stored?.requestId ?? newId()))
    let reposted = false

    const pollStart = now()
    let interval = START_INTERVAL_MS
    const pause = () => {
      interval = nextInterval(interval, now() - pollStart)
      return sleep(interval)
    }

    while (now() < deadline) {
      const res = await send(`${base}/jobs/${encodeURIComponent(jobId)}`)
      if (res.status === 404) {
        // The engine no longer knows this job (for example it expired). Start
        // over once with a fresh key, then give up.
        if (reposted) {
          clearEntry()
          throw new Error('Engine lost the ranking job')
        }
        reposted = true
        clearEntry()
        jobId = await startJob(newId())
        continue
      }
      if (!res.ok) {
        // A client error other than 404 or 429 will not fix itself.
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          clearEntry()
          throw new Error(`Engine status check failed: ${res.status}`)
        }
        await pause()
        continue
      }
      const job = (await res.json()) as { state: string; errorCode?: string | null; resultUrl?: string }
      if (job.state === 'DONE' || job.state === 'PARTIAL') {
        if (!job.resultUrl) {
          clearEntry()
          throw new Error('Engine finished without a result')
        }
        const out = await send(job.resultUrl)
        if (!out.ok) {
          clearEntry()
          throw new Error(`Engine result download failed: ${out.status}`)
        }
        clearEntry()
        return ((await out.json()) as { results: JdMatchResult[] }).results
      }
      if (job.state === 'FAILED') {
        clearEntry()
        throw new Error(`Engine ranking failed: ${job.errorCode ?? 'unknown'}`)
      }
      await pause()
    }
    throw timedOut()
  }
}

// ============================================================================
// Extraction client. Unlike ranking, extraction is synchronous: the manager
// pastes a job description and expects suggestion chips at once, so this posts
// the text to the engine's /extract route and returns the result in one call.
// The engine reads the job description once and never per candidate.
// ============================================================================

export interface RemoteExtractOptions {
  baseUrl: string
  fetch?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  now?: () => number
  /** Runs when the engine cannot read the job description (any error). The app
   *  passes the local keyword extractor so "Read job description" never breaks.
   *  Left unset, the error is thrown, which is what the baseline harness wants
   *  because it must measure the engine and not the fallback. */
  fallback?: ExtractRequirementsFn
  /** Called with what the engine reported about each extraction it answered, so a measurement can tell a
   *  model result from the keyword result. Not called when the engine failed. */
  onResult?: (info: { degraded: boolean; model: string | null }) => void
}

/** Ceiling for retrying network errors and 5xx answers. Extraction is a
 *  synchronous click, so this is also the longest the manager waits before the
 *  fallback runs. A browser reports a 404 from API Gateway without CORS headers
 *  as a network error, so a missing route costs this whole budget. */
const EXTRACT_BUDGET_MS = 10000

export function createRemoteExtract(opts: RemoteExtractOptions): ExtractRequirementsFn {
  const base = opts.baseUrl.replace(/\/+$/, '')

  const viaEngine = async (jdText: string, ctx: ExtractionContext): Promise<ExtractedRequirements> => {
    const doFetch = opts.fetch ?? globalThis.fetch.bind(globalThis)
    const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
    const now = opts.now ?? Date.now
    const deadline = now() + EXTRACT_BUDGET_MS
    const timedOut = () => new Error('The engine did not read the job description in time')

    // Retries network errors with backoff inside the budget.
    const send = async (url: string, init?: RequestInit) => {
      let backoff = START_INTERVAL_MS
      for (;;) {
        try {
          return await doFetch(url, init)
        } catch (err) {
          if (now() >= deadline) throw err instanceof Error ? err : timedOut()
          await sleep(backoff)
          backoff = Math.min(backoff * GROWTH, MAX_INTERVAL_MS)
        }
      }
    }

    let interval = START_INTERVAL_MS
    for (;;) {
      const res = await send(`${base}/extract`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jdText, ctx }),
      })
      if (res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          extracted?: ExtractedRequirements
          degraded?: boolean
          model?: string
        }
        if (!body.extracted) throw new Error('Engine returned no extraction')
        opts.onResult?.({ degraded: body.degraded === true, model: typeof body.model === 'string' ? body.model : null })
        return body.extracted
      }
      // The daily cap lasts until tomorrow, so retrying it for the budget would only make the manager wait.
      // Any other 429 is a throttle of the API and is retried below.
      if (res.status === 429) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        if (body.error === 'daily_cap') {
          throw new Error(`Engine rejected extraction: ${body.error} ${body.message ?? ''}`.trim())
        }
      }
      // A client error other than 429, or a 501 (the engine build has no
      // extraction route), will not fix itself: surface it now rather than
      // retrying a permanent failure for the whole budget.
      if ((res.status >= 400 && res.status < 500 && res.status !== 429) || res.status === 501) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        throw new Error(`Engine rejected extraction: ${body.error ?? res.status} ${body.message ?? ''}`.trim())
      }
      if (now() >= deadline) throw timedOut()
      await sleep(interval)
      interval = Math.min(interval * GROWTH, MAX_INTERVAL_MS)
    }
  }

  const fallback = opts.fallback
  if (!fallback) return viaEngine
  return async (jdText, ctx) => {
    try {
      return await viaEngine(jdText, ctx)
    } catch (err) {
      console.warn(`engine extraction unavailable (${err instanceof Error ? err.message : String(err)}); using the local extractor`)
      return fallback(jdText, ctx)
    }
  }
}
