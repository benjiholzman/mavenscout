import { bandFor } from '../../../../src/lib/matching/config'
import { TerminalError } from '../core/errors'
import { log } from '../shared/log'
import { DEFAULT_LIMITS } from '../shared/limits'
import type { Engine, EngineContext, JdMatchResult, RankJob } from '../core/types'
import type { IndexArtifact } from '../search/artifact'
import { searchPool } from '../search/cosine'
import type { Candidate, EmbedText } from '../search/cosine'
import { buildQueryText } from '../search/query'
import type { QueryExclusions } from '../search/query'

export interface SemanticEngineOptions {
  artifact: IndexArtifact
  embed: EmbedText
  exclude?: QueryExclusions
  embedModelId?: string
  cap?: number
  topFragments?: number
}

const BELOW_CAP = 49

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

type Reason = 'shortlisted' | 'below_threshold' | 'cap'

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
  return `${base}${where}`
}

export function createSemanticEngine(opts: SemanticEngineOptions): Engine {
  const { artifact, embed, exclude } = opts
  return {
    modelIds: { embed: artifact.modelVersion, fit: 'similarity-estimate', index: artifact.indexVersion },
    promptVersion: 'none',
    async rank(job: RankJob, ctx: EngineContext): Promise<void> {
      if (!job.jdText || job.jdText.trim() === '') throw new TerminalError('jd_text_required')
      if (opts.embedModelId !== undefined && opts.embedModelId !== artifact.modelVersion) {
        throw new TerminalError('embedding_model_mismatch')
      }
      const queryText = buildQueryText(job.jdText, exclude)
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

      const emit = async (candidate: Candidate, capped: boolean, reason: Reason): Promise<void> => {
        if (ctx.isDone(candidate.profileId)) return
        const estimate = Math.round(100 * clamp(candidate.similarity, 0, 1))
        const fit = capped ? Math.min(estimate, BELOW_CAP) : estimate
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

      for (const c of result.shortlist) await emit(c, false, 'shortlisted')
      for (const c of result.below) {
        const underThreshold = threshold !== null && c.similarity < threshold
        await emit(c, true, underThreshold ? 'below_threshold' : 'cap')
      }
      if (result.capHit) {
        ctx.record('stage1_cap_hit', { durationMs: 0 })
        log('stage1_cap_hit', { jobId: job.jobId, cap })
      }
    },
  }
}
