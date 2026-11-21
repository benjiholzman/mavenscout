// Stage 2 of the semantic engine: the Fit call for the first fitCap shortlisted
// candidates, scoring for every candidate with scoring data, then summaries for
// the top summaryCount by total. A failed Fit, score or summary falls back for
// that candidate only and the job continues, unless every Fit call of the run
// failed: then the job stops (see fitFailure). Flags are written into the
// narrative text; model error text never is. A failed Fit call logs its error
// name only. Nothing here logs profile, fragment, query, prompt, model output
// or error message text.
//
// Time: with ctx.deadlineAt the run stops starting model calls early enough to save its results before
// the Lambda times out. Candidates not reached keep their estimate with their own note, summaries not
// reached use the template text (see FINISH_RESERVE_MS). After a throttle the calls in flight are cut.
//
// Resume: the Fit targets are fixed by search order (done candidates are skipped
// but keep their place), and each candidate is checkpointed once, after the
// summaries, in rank order with the summarized candidates first. The done
// candidates of an interrupted run are therefore a rank order prefix whose
// summaries were already attempted, so each of them uses up a summary place.

import { buildNarrative } from '../../../../src/lib/matching/narrative'
import { scoreBreakdown } from '../../../../src/lib/matching/display'
import type { CandidateInput } from '../../../../src/lib/matching/fit'
import { TerminalError } from '../core/errors'
import { rankResults } from '../core/run'
import { DEFAULT_FIT_CAP } from '../core/settings'
import type { EngineContext, JdMatchResult, Requirement } from '../core/types'
import type { ScoringData } from '../data/supabase'
import type { TextModel } from '../models/text-model'
import { scoreCandidate } from '../scoring/score'
import type { Candidate } from '../search/cosine'
import { log } from '../shared/log'
import { judgeFit } from './fit'
import { DeadlineError, isRetryable, isThrottling, REQUEST_TIMEOUT_MS, ReplyError } from './retry'
import { writeSummary } from './summary'

export interface Stage2Item {
  candidate: Candidate
  /** In the stage 1 shortlist, so it may get the Fit call. */
  shortlisted: boolean
  /** The similarity estimate and its narrative note: uncapped for the shortlist,
   *  capped at 49 for candidates stage 1 left out. */
  estimate: number
  estimateNote: string
  /** For a shortlisted candidate outside the first fitCap: the estimate capped at
   *  49 and the note saying it was outside the in-depth assessment limit. */
  beyondFitCap?: { estimate: number; note: string }
}

export interface Stage2Options {
  /** For log lines only. */
  jobId: string
  textModel: TextModel
  scoringData: (ids: string[]) => Promise<ScoringData>
  /** The embedded query text: the job description with exclusions removed. */
  jdQuery: string
  requirements: Requirement[]
  /** Passed to the model calls; tests use it to skip retry waits. */
  callOptions?: { retries?: number; sleep?: (ms: number) => Promise<void>; random?: () => number }
  /** The clock, in epoch milliseconds. Tests inject it to move through the run deadline. */
  now?: () => number
}

const FIT_FALLBACK_NOTE =
  'The in-depth assessment of this profile failed, so the score is an estimate from semantic similarity to the job description.'
const FIT_DEADLINE_NOTE =
  'The in-depth assessment of this profile was not reached before the time limit of the run, so the score is an estimate from semantic similarity to the job description.'
const SUMMARY_FALLBACK_NOTE = 'A written summary was not available, so this is the standard summary.'

// Time kept at the end of the Lambda run, in milliseconds. The deadline is the end of the Lambda time
// (EngineContext.deadlineAt). No new summary attempt starts in the last FINISH_RESERVE_MS plus one request
// timeout: the reserve is for saving the results, the timeout is for a call that started just before.
// No new Fit attempt starts SUMMARY_WINDOW_MS before that, so the summaries still have time.
// Estimates, not measurements: saving up to 200 results was not timed.
const FINISH_RESERVE_MS = 20_000
const SUMMARY_WINDOW_MS = 30_000

/** After a throttle the number of calls in flight is halved, at most once in this time. */
const THROTTLE_CUT_INTERVAL_MS = 2000
/** The number of calls in flight is never cut below this. */
const MIN_PARALLEL_CALLS = 2

/** The number of model calls allowed in flight. A throttle cuts it and nothing raises it again in the run. */
export interface Limit {
  value: number
}

/** A setting of 0 or a fraction still allows one call at a time. */
const limitOf = (parallelCalls: number): Limit => ({ value: Math.max(1, Math.floor(parallelCalls) || 1) })

/** The limit and the function that cuts it after a throttle: halved, at most once in
 *  THROTTLE_CUT_INTERVAL_MS, never below MIN_PARALLEL_CALLS (or below the setting, when that is lower). */
export function createLimiter(parallelCalls: number, now: () => number): { limit: Limit; cut: () => void } {
  const limit = limitOf(parallelCalls)
  const floor = Math.min(MIN_PARALLEL_CALLS, limit.value)
  let lastCut = -Infinity
  const cut = (): void => {
    const t = now()
    if (t - lastCut < THROTTLE_CUT_INTERVAL_MS || limit.value <= floor) return
    limit.value = Math.max(floor, Math.floor(limit.value / 2))
    lastCut = t
  }
  return { limit, cut }
}

/** Runs fn over items with at most limit.value calls in flight (at least 1). A slot above the current
 *  limit stops taking items, and slot 0 never does, so the pool always finishes. fn must not throw. */
export async function inPool<T>(items: T[], limit: Limit, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  const worker = async (slot: number): Promise<void> => {
    while (next < items.length && slot < limit.value) await fn(items[next++])
  }
  const n = Math.min(Math.max(1, Math.floor(limit.value) || 1), items.length)
  await Promise.all(Array.from({ length: n }, (_, slot) => worker(slot)))
}

interface CallStats {
  /** Attempts that failed with throttling or a service error (see isThrottling). */
  throttles: number
  /** Attempts that failed with an error a retry can fix (see isRetryable), whether or not it was retried. */
  retries: number
}

/** A text model that counts failed attempts and refuses to start an attempt after stopAt, with a
 *  DeadlineError. withRetry does not retry that error, so a call waiting to retry ends at the deadline. */
function guarded(model: TextModel, stopAt: number, now: () => number, stats: CallStats, onThrottle?: () => void): TextModel {
  return async (req) => {
    if (now() >= stopAt) throw new DeadlineError()
    try {
      return await model(req)
    } catch (err) {
      if (isRetryable(err)) stats.retries++
      if (isThrottling(err)) {
        stats.throttles++
        onThrottle?.()
      }
      throw err
    }
  }
}

/** A stored job from before fitCap existed carries no value; the settings default applies. */
const fitCapOf = (v: unknown): number => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : DEFAULT_FIT_CAP)

const join = (...parts: string[]): string => parts.filter((p) => p !== '').join(' ')

/** The error's name when it looks like a class or code name, so a log line can never carry free text. */
function errorName(err: unknown): string {
  const name = (err as { name?: unknown } | null)?.name
  return typeof name === 'string' && /^[A-Za-z_][A-Za-z0-9_.]{0,63}$/.test(name) ? name : 'unknown'
}

const CONFIG_ERRORS = new Set(['AccessDenied', 'AccessDeniedException', 'ValidationException', 'ResourceNotFoundException'])

/** True for an error that a retry cannot fix: no access to the model, or a wrong model id or request. */
function isConfigError(err: unknown): boolean {
  if (CONFIG_ERRORS.has(errorName(err))) return true
  const message = (err as { message?: unknown } | null)?.message
  return typeof message === 'string' && message.includes('not available for this account')
}

const isTruncated = (err: unknown): boolean => err instanceof ReplyError && err.code === 'fit_output_truncated'

/** When every attempted Fit call failed, the error that stops the job: terminal when the cause is the
 *  model setup (a configuration error on any call, or every reply cut off), retryable otherwise. */
function fitFailure(errors: unknown[]): Error {
  if (errors.some(isConfigError) || errors.every(isTruncated)) return new TerminalError('fit_model_unavailable')
  return new Error('fit_all_failed')
}

/** The tokens a failed call still used, when its error carries them. */
function tokensOf(err: unknown): { inputTokens: number; outputTokens: number } {
  return err instanceof ReplyError ? { inputTokens: err.inputTokens, outputTokens: err.outputTokens } : { inputTokens: 0, outputTokens: 0 }
}

interface Scored {
  item: Stage2Item
  result: JdMatchResult
  /** Estimate or Fit fallback sentence, empty when Fit was judged. */
  flag: string
  template: string
  reason: string
}

export async function runStage2(items: Stage2Item[], ctx: EngineContext, o: Stage2Options): Promise<void> {
  const { settings } = ctx
  const cap = fitCapOf(settings.fitCap)
  const beyondCap = items.filter((i) => i.shortlisted).length - cap
  if (beyondCap > 0) {
    ctx.record('fit_cap_hit', { durationMs: 0, beyondCap })
    log('fit_cap_hit', { jobId: o.jobId, cap, beyondCap })
  }
  const todo = items.filter((i) => !ctx.isDone(i.candidate.profileId))
  if (todo.length === 0) return
  // Done candidates are a rank order prefix written summarized first, so each
  // of them already used a summary place (written or fallen back).
  const summarySlots = Math.max(0, settings.summaryCount - (items.length - todo.length))

  const data = await o.scoringData(todo.map((i) => i.candidate.profileId))
  const inputs = new Map(data.candidates.map((c) => [c.profile.id, c]))
  const present: Stage2Item[] = []
  for (const item of todo) {
    if (inputs.has(item.candidate.profileId)) present.push(item)
    else await ctx.fallback(item.candidate.profileId, 'profile_missing')
  }

  // Fit, for the first fitCap of the full shortlist in search order. Done and
  // missing candidates are skipped but keep their place, so every run of a job
  // assesses the same set and makes at most fitCap calls.
  const inCap = new Set(items.filter((i) => i.shortlisted).slice(0, cap).map((i) => i.candidate.profileId))
  const targets = present.filter((i) => inCap.has(i.candidate.profileId))
  const fits = new Map<string, { fit: number; reason: string }>()
  const failed = new Set<string>()
  const skipped = new Set<string>()
  const fitErrors: unknown[] = []
  const fitUsage = { tokensIn: 0, tokensOut: 0, fallbacks: 0 }
  // The run deadline. Without ctx.deadlineAt (local runs, tests) nothing is ever stopped.
  const now = o.now ?? Date.now
  const summaryStop = ctx.deadlineAt === undefined ? Infinity : ctx.deadlineAt - FINISH_RESERVE_MS - REQUEST_TIMEOUT_MS
  const fitStop = summaryStop - SUMMARY_WINDOW_MS
  const { limit, cut } = createLimiter(settings.parallelCalls, now)
  const fitStats: CallStats = { throttles: 0, retries: 0 }
  const fitModel = guarded(o.textModel, fitStop, now, fitStats, cut)
  const fitStart = Date.now()
  await inPool(targets, limit, async (item) => {
    const id = item.candidate.profileId
    const start = Date.now()
    if (now() >= fitStop) {
      skipped.add(id)
      return
    }
    try {
      const out = await judgeFit(fitModel, settings.fitModel, {
        jdQuery: o.jdQuery,
        fragments: item.candidate.topFragments.map(({ fragment: f }) => ({ fragmentId: f.fragmentId, type: f.type, text: f.text })),
      }, o.callOptions)
      fits.set(id, { fit: out.fit, reason: out.reason })
      fitUsage.tokensIn += out.inputTokens
      fitUsage.tokensOut += out.outputTokens
    } catch (err) {
      // Out of time while retrying: not a model failure, the candidate keeps its estimate.
      if (err instanceof DeadlineError) {
        skipped.add(id)
        return
      }
      // The error can carry request or output details, so only its name is logged.
      // Calls and fallbacks are counted once, on the fit record.
      failed.add(id)
      fitErrors.push(err)
      const spent = tokensOf(err)
      fitUsage.tokensIn += spent.inputTokens
      fitUsage.tokensOut += spent.outputTokens
      fitUsage.fallbacks++
      log('fit_call_failed', { jobId: o.jobId, errorName: errorName(err) })
      ctx.record('fit_fallback', { durationMs: Date.now() - start })
    }
  })
  const attempted = targets.length - skipped.size
  ctx.record('fit', { durationMs: Date.now() - fitStart, calls: attempted, ...fitUsage, ...fitStats, skipped: skipped.size })
  if (skipped.size > 0) {
    ctx.record('fit_deadline_hit', { durationMs: 0, skipped: skipped.size })
    log('fit_deadline_hit', { jobId: o.jobId, skipped: skipped.size })
  }
  // Every attempted call failed: the ranking would be estimates only, so the job does not finish as DONE.
  if (attempted > 0 && failed.size === attempted) throw fitFailure(fitErrors)

  // Scoring, in memory. A candidate whose scoring throws falls back on its own.
  const scoreStart = Date.now()
  const scored: Scored[] = []
  for (const item of present) {
    const id = item.candidate.profileId
    try {
      const input = inputs.get(id) as CandidateInput
      const judged = fits.get(id)
      const beyond = item.shortlisted && !inCap.has(id) ? item.beyondFitCap : undefined
      const fit = judged ? judged.fit : beyond ? beyond.estimate : item.estimate
      const flag = judged
        ? ''
        : failed.has(id) ? FIT_FALLBACK_NOTE : skipped.has(id) ? FIT_DEADLINE_NOTE : beyond ? beyond.note : item.estimateNote
      const s = scoreCandidate(fit, { candidate: input, requirements: o.requirements, expertise: data.expertise, orgs: data.orgs })
      const base = { fit_score: fit, total_score: s.total_score, adjustments: s.adjustments, scoring: s.scoring }
      const template = buildNarrative({ profile: input.profile, total: s.total_score, band: s.band, breakdown: scoreBreakdown(base), coveredTerms: [] })
      const result: JdMatchResult = {
        profile_id: id,
        rank: 0,
        ...base,
        band: s.band,
        must_haves_passed: s.must_haves_passed,
        narrative: join(flag, template),
      }
      scored.push({ item, result, flag, template, reason: judged?.reason ?? '' })
    } catch {
      await ctx.fallback(id, 'score_failed')
    }
  }
  ctx.record('score', { durationMs: Date.now() - scoreStart })

  // Summaries for the summary places left, in rank order.
  const byId = new Map(scored.map((s) => [s.result.profile_id, s]))
  const ranked = rankResults(scored.map((s) => s.result)).map((r) => byId.get(r.profile_id) as Scored)
  const top = ranked.slice(0, summarySlots)
  const texts = new Map<string, string>()
  const sumUsage = { tokensIn: 0, tokensOut: 0, fallbacks: 0 }
  const sumStats: CallStats = { throttles: 0, retries: 0 }
  const sumModel = guarded(o.textModel, summaryStop, now, sumStats)
  let sumSkipped = 0
  const sumStart = Date.now()
  await inPool(top, limitOf(settings.parallelCalls), async (s) => {
    const r = s.result
    try {
      const out = await writeSummary(sumModel, settings.textModel, {
        fit: r.fit_score,
        total: r.total_score,
        band: r.band,
        adjustments: r.adjustments,
        mustHaves: r.must_haves_passed.map((m) => m.label),
        reason: s.reason,
        fragments: s.item.candidate.topFragments.map(({ fragment: f }) => ({ type: f.type, text: f.text })),
      }, o.callOptions)
      sumUsage.tokensIn += out.inputTokens
      sumUsage.tokensOut += out.outputTokens
      if (out.text.trim() === '') sumUsage.fallbacks++
      else texts.set(r.profile_id, out.text)
    } catch (err) {
      if (err instanceof DeadlineError) sumSkipped++
      const spent = tokensOf(err)
      sumUsage.tokensIn += spent.inputTokens
      sumUsage.tokensOut += spent.outputTokens
      sumUsage.fallbacks++
    }
  })
  ctx.record('summary', { durationMs: Date.now() - sumStart, calls: top.length, ...sumUsage, ...sumStats, skipped: sumSkipped })
  if (sumSkipped > 0) log('summary_deadline_hit', { jobId: o.jobId, skipped: sumSkipped })

  // One checkpoint per candidate, in rank order, so the summarized ones come first.
  for (const [i, s] of ranked.entries()) {
    let narrative = s.result.narrative
    if (i < top.length) {
      const text = texts.get(s.result.profile_id)
      narrative = text ? join(s.flag, text) : join(s.flag, s.template, SUMMARY_FALLBACK_NOTE)
    }
    await ctx.checkpoint({ ...s.result, narrative })
  }
}
