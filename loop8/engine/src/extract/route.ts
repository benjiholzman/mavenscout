// The route POST /extract. Its own Lambda serves it, so the api Lambda never calls a model.
// The manager pastes a job description and expects suggestions at once, so the answer is one
// synchronous response. Nothing is queued and the job description is not stored.

import { JD_MAX_CHARS } from '../../../../src/lib/matching/config'
import type { ExtractedRequirements, ExtractionContext } from '../../../../src/lib/matching/types'
import type { ApiRequest, ApiResponse } from '../api/app'
import type { Limits } from '../shared/limits'

export interface ExtractOutcome {
  extracted: ExtractedRequirements
  /** True when the model failed and the result is the keyword result. */
  degraded: boolean
  /** The model id that was asked for the extraction. */
  model: string
}

export interface ExtractRouteDeps {
  /** Reads one job description into suggestions. */
  extract(jdText: string, ctx: ExtractionContext): Promise<ExtractOutcome>
  /** Counts the extractions of a day. The same method as the daily job cap, under its own key. */
  counter: { incrementDaily(day: string, cap: number): Promise<boolean> }
  limits: Pick<Limits, 'maxBodyBytes' | 'extractDailyCap'>
  now(): number
}

const err = (status: number, error: string, message: string): ApiResponse => ({
  status,
  body: { error, message },
})

function isExtractionContext(v: unknown): v is ExtractionContext {
  if (typeof v !== 'object' || v === null) return false
  const c = v as Record<string, unknown>
  const tax = c.taxonomy as Record<string, unknown> | undefined
  return (
    !!tax &&
    Array.isArray(tax.categories) &&
    Array.isArray(tax.items) &&
    Array.isArray(c.locationOptions) &&
    Array.isArray(c.languageOptions)
  )
}

export async function handleExtract(req: ApiRequest, deps: ExtractRouteDeps): Promise<ApiResponse> {
  const path = req.path.length > 1 && req.path.endsWith('/') ? req.path.slice(0, -1) : req.path
  if (req.method !== 'POST' || path !== '/extract') return err(404, 'not_found', 'No such route')
  if (req.body === null) return err(400, 'empty_body', 'Request body is required')
  if (Buffer.byteLength(req.body, 'utf8') > deps.limits.maxBodyBytes) {
    return err(413, 'too_large', 'Request body is too large')
  }
  let payload: unknown
  try {
    payload = JSON.parse(req.body)
  } catch {
    return err(400, 'invalid_json', 'Request body is not valid JSON')
  }
  const p = payload as { jdText?: unknown; ctx?: unknown }
  if (typeof p.jdText !== 'string' || p.jdText.trim() === '') {
    return err(400, 'missing_jd', 'jdText is required')
  }
  if (p.jdText.length > JD_MAX_CHARS) {
    return err(413, 'jd_too_long', `jdText must be at most ${JD_MAX_CHARS} characters`)
  }
  if (!isExtractionContext(p.ctx)) {
    return err(400, 'invalid_ctx', 'ctx must include taxonomy, locationOptions and languageOptions')
  }

  // The cap is counted after the checks above, so a bad request does not use up a call of the day.
  const day = new Date(deps.now()).toISOString().slice(0, 10)
  if (!(await deps.counter.incrementDaily(`extract-${day}`, deps.limits.extractDailyCap))) {
    return err(429, 'daily_cap', 'The daily extraction limit has been reached')
  }
  return { status: 200, body: await deps.extract(p.jdText, p.ctx) }
}
