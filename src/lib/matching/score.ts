import { loadOrgIndex, type OrgIndex } from '../organizations'
import { supabase } from '../supabase'
import { buildExpertiseIndex, upgradeLegacyExtracted, type ExpertiseIndex } from '../expertise'
import { computeAdjustments, mustHavesPassed } from './adjustments'
import { bandFor } from './config'
import { scoreBreakdown } from './display'
import { buildJdSignature, computeFit, tagCredit, type CandidateInput } from './fit'
import { buildNarrative } from './narrative'
import { preferenceScoring, totalScore } from './total'
import type { ExtractedRequirements, MatchResult, RankPoolFn, Requirement } from './types'
import type {
  AudioTestimonial,
  PortfolioItem,
  Profile,
  TaxonomyCategory,
  TaxonomyItem,
  VideoResponse,
} from '../../types/db'

// ============================================================================
// ⚠ PLACEHOLDER SCORING ENGINE (docs/MavenScout-match-rework.md §5, §6).
// Loop8 replaces this file's internals; rankPool's signature is the contract.
//
// Pipeline (§5.1): the caller has already applied the Must-have pre-filter
// (src/lib/requirements/mustHaves.ts) — candidates failing a Must-have never
// reach this function. For each survivor (total.ts):
//   w = min(points possible, 20) / 100
//   total = (1 − w) × Fit + 100 × w × (points earned ÷ points possible)
// with total = Fit when no preference row applies; then rank (total ↓, Fit ↓,
// availability freshness ↓, id ↑) and band.
//
// Rounding (§5.3): Fit is computed in floats and rounded for storage/display;
// the total is computed from that displayed Fit and rounded. The displayed
// build-up comes from display.ts (Fit part + preferences = total, exactly).
// ============================================================================

interface Scored extends Omit<MatchResult, 'rank'> {
  fitFloat: number
}

/** Total order for ranked results (§5.5). Premium never enters into it. */
export function compareResults(
  a: { total_score: number; fit: number; profile: Pick<Profile, 'id' | 'availability_updated_at'> },
  b: { total_score: number; fit: number; profile: Pick<Profile, 'id' | 'availability_updated_at'> },
): number {
  return (
    b.total_score - a.total_score ||
    b.fit - a.fit ||
    (b.profile.availability_updated_at ?? '').localeCompare(a.profile.availability_updated_at ?? '') ||
    a.profile.id.localeCompare(b.profile.id)
  )
}

/** Sorts results and assigns ranks 1..n. Used for a fresh run and when newly
 *  eligible candidates are merged into an existing ranking. */
export function orderResults<T extends { profile_id: string; total_score: number; fit_score: number }>(
  results: (T & { fitFloat?: number })[],
  profilesById: Map<string, Pick<Profile, 'id' | 'availability_updated_at'>>,
): (T & { rank: number })[] {
  const keyed = results.map((r) => ({
    r,
    total_score: r.total_score,
    fit: r.fitFloat ?? r.fit_score,
    profile: profilesById.get(r.profile_id) ?? { id: r.profile_id, availability_updated_at: null },
  }))
  keyed.sort(compareResults)
  return keyed.map((k, i) => {
    const { fitFloat: _drop, ...rest } = k.r
    void _drop
    return { ...(rest as T), rank: i + 1 }
  })
}

/** Pure scoring for one pool: no I/O, so it can be tested and calibrated. */
export function scorePool(args: {
  rawText: string
  extracted: ExtractedRequirements | null
  requirements: Requirement[]
  candidates: CandidateInput[]
  expertise: ExpertiseIndex
  orgs: OrgIndex
}): MatchResult[] {
  const { rawText, extracted, requirements, candidates, expertise, orgs } = args
  // The JD is read once per run, here — never per candidate.
  const sig = buildJdSignature(rawText, extracted)

  const scored: Scored[] = candidates.map((c) => {
    const fb = computeFit(c, sig, rawText)
    const adjustments = computeAdjustments(c, requirements, expertise, orgs)
    const scoring = preferenceScoring(adjustments)
    const fit_score = Math.round(fb.fit)
    const total_score = totalScore(fit_score, scoring)
    const band = bandFor(total_score)
    const coveredTerms = sig.expertise
      .map((t) => ({ name: t.name, credit: tagCredit(c.profile, t.name) }))
      .filter((x) => x.credit > 0)
      .sort((a, b) => b.credit - a.credit)
      .map((x) => x.name)
    return {
      profile_id: c.profile.id,
      total_score,
      band,
      fit_score,
      fitFloat: fb.fit,
      adjustments,
      scoring,
      must_haves_passed: mustHavesPassed(c, requirements),
      narrative: buildNarrative({
        profile: c.profile,
        total: total_score,
        band,
        breakdown: scoreBreakdown({ fit_score, total_score, adjustments, scoring }),
        coveredTerms,
      }),
    }
  })

  return orderResults(scored, new Map(candidates.map((c) => [c.profile.id, c.profile])))
}

/** Loads portfolio + transcripts (video Q&As and published testimonials) for
 *  the pool in three queries. */
async function loadEvidence(pool: Profile[]): Promise<CandidateInput[]> {
  const ids = pool.map((p) => p.id)
  const [portfolioRes, videosRes, audioRes] = await Promise.all([
    supabase.from('portfolio_items').select('*').in('profile_id', ids).order('sort_order'),
    supabase.from('video_responses').select('profile_id,transcript').in('profile_id', ids),
    supabase.from('audio_testimonials').select('profile_id,transcript').eq('status', 'published').in('profile_id', ids),
  ])
  const portfolioBy = new Map<string, PortfolioItem[]>()
  for (const item of (portfolioRes.data as PortfolioItem[]) ?? [])
    portfolioBy.set(item.profile_id, [...(portfolioBy.get(item.profile_id) ?? []), item])
  const transcriptsBy = new Map<string, string[]>()
  const rows = [
    ...((videosRes.data as Pick<VideoResponse, 'profile_id' | 'transcript'>[]) ?? []),
    ...((audioRes.data as Pick<AudioTestimonial, 'profile_id' | 'transcript'>[]) ?? []),
  ]
  for (const r of rows)
    if (r.transcript) transcriptsBy.set(r.profile_id, [...(transcriptsBy.get(r.profile_id) ?? []), r.transcript])
  return pool.map((profile) => ({
    profile,
    portfolio: portfolioBy.get(profile.id) ?? [],
    transcripts: transcriptsBy.get(profile.id) ?? [],
  }))
}

/**
 * Engine entry point (spec §6.1). Receives the stored JD by id — it reads the
 * JD text and extraction once per call — plus the requirements and a pool that
 * has already passed the Must-haves. Returns results ranked best-first.
 */
export const rankPool: RankPoolFn = async (jobDescriptionId, requirements, pool) => {
  if (pool.length === 0) return []
  const [jdRes, catsRes, itemsRes, candidates, orgs] = await Promise.all([
    supabase.from('job_descriptions').select('raw_text, extracted').eq('id', jobDescriptionId).single(),
    supabase.from('taxonomy_categories').select('*'),
    supabase.from('taxonomy_items').select('*'),
    loadEvidence(pool),
    loadOrgIndex(),
  ])
  if (jdRes.error) throw new Error(jdRes.error.message)
  const expertise = buildExpertiseIndex((catsRes.data as TaxonomyCategory[]) ?? [], (itemsRes.data as TaxonomyItem[]) ?? [])
  return scorePool({
    rawText: jdRes.data.raw_text,
    // A run saved before the unified list keeps its old extraction; read it
    // through the list (old names → items) when loosening re-scores it.
    extracted: upgradeLegacyExtracted(jdRes.data.extracted as ExtractedRequirements | null, expertise),
    requirements,
    candidates,
    expertise,
    orgs,
  })
}
