import { buildExpertiseIndex, type ExpertiseIndex } from '../expertise'
import { loadOrgIndex, type OrgIndex } from '../organizations'
import { isMust, rowHasValue } from '../requirements/model'
import { supabase } from '../supabase'
import { computeAdjustments, mustHavesPassed } from './adjustments'
import type { CandidateInput } from './fit'
import { preferenceScoring } from './total'
import type { Adjustment, PreferenceMatchResult, RankingMode, Requirement, Scoring } from './types'
import type { PortfolioItem, Profile, TaxonomyCategory, TaxonomyItem } from '../../types/db'

// ============================================================================
// Preferences-only ranking (docs/MavenScout-match-rework.md §11).
//
// With no job description there is no Fit, so nothing calls the engine:
// rankPool / extractRequirements are only used for JD runs. This file is
// app-side and stays when Loop8's engine replaces score.ts. It reuses the
// preference rows' outcomes and credits from adjustments.ts:
//   total = round(100 × earned ÷ possible)   (0 when no row applies)
// Order: exact earned ÷ possible ↓, availability freshness ↓, id ↑.
// Membership level never enters into it.
// ============================================================================

/** The mode a draft or run saved before modes were stored implies: any JD
 *  text meant a JD run. Today the modal's step decides. */
export function rankingModeFor(jdText: string): RankingMode {
  return jdText.trim() ? 'jd' : 'preferences'
}

/** Nice to have / Important rows with a value — what a preferences run scores. */
export function hasPreferenceRows(requirements: Requirement[]): boolean {
  return requirements.some((r) => !isMust(r) && rowHasValue(r))
}

/** Why Run (or Re-run) is disabled, or null when it can run. */
export function runBlockerFor(args: {
  /** Priorities (step 1) or job description (step 2). */
  mode: RankingMode
  jdText: string
  /** Whether the current JD has been read. */
  read: boolean
  requirements: Requirement[]
  poolCount: number
}): string | null {
  if (args.mode === 'jd') {
    if (!args.jdText.trim()) return 'Paste a job description, or go back and rank by your priorities.'
    if (!args.read) return 'Read the job description first.'
  } else if (!hasPreferenceRows(args.requirements))
    return 'Set at least one priority to Nice to have or Important to rank.'
  if (args.poolCount === 0) return 'No candidates meet everything marked Must have.'
  return null
}

const share = (s: Scoring) => (s.possible > 0 ? s.earned / s.possible : 0)

export function preferenceTotal(s: Scoring): number {
  return Math.round(100 * share(s))
}

const or = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')}, ${xs[xs.length - 1]}`)

/** The one-line summary that replaces the narrative:
 *  "Meets 4 of 6 preferences (1 partly); missing: Speaks French fluently, Available by Mar 2027." */
export function preferenceSummary(adjustments: Adjustment[]): string {
  const applicable = adjustments.filter((a) => a.outcome !== 'not_applicable')
  if (applicable.length === 0) return 'None of your preferences apply to this candidate.'
  const partly = applicable.filter((a) => a.outcome === 'partial').length
  const missing = applicable.filter((a) => a.outcome === 'not_met').map((a) => a.label)
  const meets = applicable.length - missing.length
  const head =
    meets === applicable.length && partly === 0
      ? `Meets all ${applicable.length} preference${applicable.length === 1 ? '' : 's'}`
      : `Meets ${meets} of ${applicable.length} preference${applicable.length === 1 ? '' : 's'}${partly ? ` (${partly} partly)` : ''}`
  return missing.length ? `${head}; missing: ${or(missing)}.` : `${head}.`
}

/** Sorts preference results and assigns ranks 1..n. Also used to merge newly
 *  eligible candidates into an existing preferences run. */
export function orderPreferenceResults(
  results: PreferenceMatchResult[],
  profilesById: Map<string, Pick<Profile, 'id' | 'availability_updated_at'>>,
): PreferenceMatchResult[] {
  const fresh = (id: string) => profilesById.get(id)?.availability_updated_at ?? ''
  return [...results]
    .sort(
      (a, b) =>
        share(b.scoring) - share(a.scoring) ||
        fresh(b.profile_id).localeCompare(fresh(a.profile_id)) ||
        a.profile_id.localeCompare(b.profile_id),
    )
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

/** Pure scoring for one pool (already past the Required rows). */
export function scorePreferences(args: {
  requirements: Requirement[]
  candidates: CandidateInput[]
  expertise: ExpertiseIndex
  orgs: OrgIndex
}): PreferenceMatchResult[] {
  const { requirements, candidates, expertise, orgs } = args
  const results = candidates.map((c): PreferenceMatchResult => {
    const adjustments = computeAdjustments(c, requirements, expertise, orgs)
    const scoring = preferenceScoring(adjustments)
    return {
      profile_id: c.profile.id,
      rank: 0,
      total_score: preferenceTotal(scoring),
      band: null,
      fit_score: null,
      adjustments,
      scoring,
      must_haves_passed: mustHavesPassed(c, requirements, orgs),
      narrative: preferenceSummary(adjustments),
    }
  })
  return orderPreferenceResults(results, new Map(candidates.map((c) => [c.profile.id, c.profile])))
}

/** Loads what the preference rows read (portfolio for expertise text
 *  evidence, the expertise list, organizations) and scores the pool. */
export async function rankByPreferences(requirements: Requirement[], pool: Profile[]): Promise<PreferenceMatchResult[]> {
  if (pool.length === 0) return []
  const [portfolioRes, catsRes, itemsRes, orgs] = await Promise.all([
    supabase.from('portfolio_items').select('*').in('profile_id', pool.map((p) => p.id)).order('sort_order'),
    supabase.from('taxonomy_categories').select('*'),
    supabase.from('taxonomy_items').select('*'),
    loadOrgIndex(),
  ])
  const portfolioBy = new Map<string, PortfolioItem[]>()
  for (const item of (portfolioRes.data as PortfolioItem[]) ?? [])
    portfolioBy.set(item.profile_id, [...(portfolioBy.get(item.profile_id) ?? []), item])
  return scorePreferences({
    requirements,
    candidates: pool.map((profile) => ({ profile, portfolio: portfolioBy.get(profile.id) ?? [] })),
    expertise: buildExpertiseIndex((catsRes.data as TaxonomyCategory[]) ?? [], (itemsRes.data as TaxonomyItem[]) ?? []),
    orgs,
  })
}
