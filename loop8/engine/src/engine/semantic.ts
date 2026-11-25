import { bandFor } from '../../../../src/lib/matching/config'
import { TerminalError } from '../core/errors'
import { log } from '../shared/log'
import { DEFAULT_LIMITS } from '../shared/limits'
import type { Engine, EngineContext, JdMatchResult, RankJob } from '../core/types'
import type { IndexArtifact } from '../search/artifact'
import { searchPool } from '../search/cosine'
import type { Candidate, EmbedText } from '../search/cosine'
import { buildQueryText, exclusionsFromRequirements, mergeExclusions } from '../search/query'
import type { QueryExclusions } from '../search/query'
import { loadSettings } from '../core/settings'
import type { Extraction, ScoringData } from '../data/supabase'
import type { TextModel } from '../models/text-model'
import { COMPONENTS_PROMPT_VERSION } from '../stage2/components'
import { FIT_PROMPT_VERSION } from '../stage2/fit'
import { SUMMARY_PROMPT_VERSION } from '../stage2/summary'
import { runStage2 } from '../stage2/run-stage2'
import type { Stage2Item, Stage2Options } from '../stage2/run-stage2'

export interface SemanticEngineOptions {
  artifact: IndexArtifact
  embed: EmbedText
  exclude?: QueryExclusions
  embedModelId?: string
  cap?: number
  topFragments?: number
  /** Stage 2. Without it the engine returns similarity estimates only. Needs scoringData. */
  textModel?: TextModel
  scoringData?: (ids: string[]) => Promise<ScoringData>
  /** The stored extraction of the job description, read for query exclusions and for the work places
   *  of the components call. */
  extraction?: (jdId: string) => Promise<Extraction>
  /** The ids reported in modelIds before any job has run. Once rank starts, modelIds report the
   *  ids in the job's settings, which are the ids the calls use. */
  fitModelId?: string
  textModelId?: string
  callOptions?: Stage2Options['callOptions']
  /** The clock for the run deadline. Tests only. */
  now?: Stage2Options['now']
}

const BELOW_CAP = 49

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

type Reason = 'shortlisted' | 'below_threshold' | 'cap' | 'fit_cap'

function narrativeFor(candidate: Candidate, reason: Reason): string {
  const best = candidate.topFragments[0]?.fragment.type
  const where = best ? ` The best matching part of the profile is its ${best} section.` : ''
  const base = 'This is an estimate from semantic similarity to the job description, not an in-depth assessment.'
  if (reason === 'below_threshold') {
    return `${base} The profile was below the similarity threshold, so the estimate is capped at ${BELOW_CAP}.${where}`
  }
  if (reason === 'cap') {
    return `${base} The profile was outside the shortlist limit, so the estimate is capped at ${BELOW_CAP}.${where}`
  }
  if (reason === 'fit_cap') {
    return `${base} The profile was outside the in-depth assessment limit, so the estimate is capped at ${BELOW_CAP}.${where}`
  }
  return `${base}${where}`
}

const valuesOf = (list: unknown): string[] =>
  Array.isArray(list)
    ? list.flatMap((x) => {
      const v = (x as { value?: unknown } | null)?.value
      return typeof v === 'string' ? [v] : []
    })
    : []

/** The stored extraction's location and language values and the hiring organization (the column
 *  and the extracted value). A missing or
 *  malformed field is skipped. A value such as "City, Country" also names each of its parts. */
export function exclusionsFromExtraction(extraction: Extraction | null | undefined): QueryExclusions {
  const places: string[] = []
  for (const value of valuesOf(extraction?.extracted?.locations)) {
    places.push(value)
    if (value.includes(',')) places.push(...value.split(','))
  }
  // The column and the extraction's own value; either can be null.
  const orgs = [extraction?.hiringOrganization, extraction?.extracted?.hiring_organization]
    .filter((v): v is string => typeof v === 'string')
  const clean = (terms: string[]) => terms.map((t) => t.trim()).filter((t) => t !== '')
  return mergeExclusions({
    orgNames: clean(orgs),
    places: clean(places),
    languages: clean(valuesOf(extraction?.extracted?.languages)),
  })
}

/** The places the job description names, for the components call only: the stored extraction's
 *  location values, trimmed, without empty values, de-duplicated ignoring case (the first spelling
 *  is kept). A value such as "City, Country" stays whole. Never the manager's location rows, which
 *  say where a candidate is based. Without an extraction the list is empty. */
export function workPlacesFromExtraction(extraction: Extraction | null | undefined): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of valuesOf(extraction?.extracted?.locations)) {
    const place = value.trim()
    const key = place.toLowerCase()
    if (place === '' || seen.has(key)) continue
    seen.add(key)
    out.push(place)
  }
  return out
}

export function createSemanticEngine(opts: SemanticEngineOptions): Engine {
  const { artifact, embed, exclude, textModel, scoringData } = opts
  if (textModel && !scoringData) throw new Error('scoring_data_required')
  const defaults = loadSettings({})
  // The fit and text ids of the job that ran last, which the worker reads after rank. The embed id is
  // the artifact's, which rank checks against the id the embedder calls when embedModelId is given.
  let used = { fit: opts.fitModelId ?? defaults.fitModel, text: opts.textModelId ?? defaults.textModel }
  return {
    get modelIds(): Record<string, string> {
      return textModel
        ? { embed: artifact.modelVersion, fit: used.fit, text: used.text, index: artifact.indexVersion }
        : { embed: artifact.modelVersion, fit: 'similarity-estimate', index: artifact.indexVersion }
    },
    promptVersion: textModel ? `${FIT_PROMPT_VERSION}+${COMPONENTS_PROMPT_VERSION}+${SUMMARY_PROMPT_VERSION}` : 'none',
    async rank(job: RankJob, ctx: EngineContext): Promise<void> {
      used = { fit: ctx.settings.fitModel, text: ctx.settings.textModel }
      if (!job.jdText || job.jdText.trim() === '') throw new TerminalError('jd_text_required')
      if (opts.embedModelId !== undefined && opts.embedModelId !== artifact.modelVersion) {
        throw new TerminalError('embedding_model_mismatch')
      }
      const extraction = opts.extraction ? await opts.extraction(job.jobDescriptionId) : null
      const queryText = buildQueryText(
        job.jdText,
        mergeExclusions(exclude, exclusionsFromRequirements(job.requirements), exclusionsFromExtraction(extraction)),
      )
      const embedStart = Date.now()
      const vector = await embed(queryText)
      ctx.record('embed_query', { durationMs: Date.now() - embedStart })
      if (vector.length !== artifact.dimensions) throw new TerminalError('embedding_dimension_mismatch')
      if (!vector.every(Number.isFinite)) throw new TerminalError('embedding_not_finite')

      const cap = opts.cap ?? DEFAULT_LIMITS.maxDeepScored
      const searchStart = Date.now()
      const threshold = ctx.settings.threshold
      const result = searchPool(vector, artifact, job.poolIds, {
        threshold,
        cap,
        topFragments: opts.topFragments ?? 5,
      })
      ctx.record('search', { durationMs: Date.now() - searchStart })

      for (const id of result.notIndexed) {
        if (ctx.isDone(id)) continue
        await ctx.fallback(id, 'not_indexed')
      }

      const estimateOf = (candidate: Candidate, capped: boolean): number => {
        const estimate = Math.round(100 * clamp(candidate.similarity, 0, 1))
        return capped ? Math.min(estimate, BELOW_CAP) : estimate
      }
      const belowReason = (c: Candidate): Reason =>
        threshold !== null && c.similarity < threshold ? 'below_threshold' : 'cap'

      const emit = async (candidate: Candidate, capped: boolean, reason: Reason): Promise<void> => {
        if (ctx.isDone(candidate.profileId)) return
        const fit = estimateOf(candidate, capped)
        const out: JdMatchResult = {
          profile_id: candidate.profileId,
          rank: 0,
          fit_score: fit,
          total_score: fit,
          band: bandFor(fit),
          adjustments: [],
          scoring: { weight: 0, earned: 0, possible: 0 },
          must_haves_passed: [],
          narrative: narrativeFor(candidate, reason),
        }
        await ctx.checkpoint(out)
      }

      if (textModel && scoringData) {
        const item = (c: Candidate, shortlisted: boolean): Stage2Item => ({
          candidate: c,
          shortlisted,
          estimate: estimateOf(c, !shortlisted),
          estimateNote: narrativeFor(c, shortlisted ? 'shortlisted' : belowReason(c)),
          beyondFitCap: shortlisted ? { estimate: estimateOf(c, true), note: narrativeFor(c, 'fit_cap') } : undefined,
        })
        await runStage2(
          [...result.shortlist.map((c) => item(c, true)), ...result.below.map((c) => item(c, false))],
          ctx,
          {
            jobId: job.jobId, textModel, scoringData, jdQuery: queryText, workPlaces: workPlacesFromExtraction(extraction),
            requirements: job.requirements, callOptions: opts.callOptions, now: opts.now,
          },
        )
      } else {
        for (const c of result.shortlist) await emit(c, false, 'shortlisted')
        for (const c of result.below) await emit(c, true, belowReason(c))
      }
      if (result.capHit) {
        ctx.record('stage1_cap_hit', { durationMs: 0 })
        log('stage1_cap_hit', { jobId: job.jobId, cap })
      }
    },
  }
}
