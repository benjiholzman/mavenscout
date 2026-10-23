import { DEMO_HIRING_MANAGER_ID } from '../session'
import { supabase } from '../supabase'
import type { JobDescription, MatchResultRow, Profile } from '../../types/db'
import { orderPreferenceResults, rankByPreferences } from './preferences'
import { orderResults, rankPool } from './score'
import { preferenceScoring } from './total'
import {
  isPreferenceResult,
  type ExtractedRequirements,
  type JdMatchResult,
  type MatchResult,
  type RankingMode,
  type Requirement,
} from './types'

// Ranking runs in the database (match rework spec §2.2, §6.3).
//
// Every run is a job_descriptions row, so ?ranking=<id> can restore it:
// - opening_id set → a durable ranking for that opening (re-running replaces
//   the opening's previous ranking);
// - opening_id null → an ad-hoc directory ranking: unlisted and transient.
//   Starting a new ad-hoc run deletes the manager's previous unsaved ones;
//   "Save ranking to opening" keeps one by attaching it to an opening.
// The row also stores the extraction and the requirements the run was scored
// against; later Must-have edits are written back to it without re-scoring.
// Its mode (019) says how it was scored: 'jd' through the engine (rankPool),
// 'preferences' app-side (preferences.ts) — the engine is never called
// without a JD.

export interface RankingRecord {
  jd: JobDescription
  results: MatchResult[] // best-first
}

function fromRow(r: MatchResultRow, mode: RankingMode): MatchResult {
  const base = {
    profile_id: r.profile_id,
    rank: r.rank ?? 0,
    total_score: r.total_score,
    adjustments: r.adjustments ?? [],
    // Legacy rows (pre-008) have no scoring; 008 deletes them.
    scoring: r.scoring ?? preferenceScoring(r.adjustments ?? []),
    must_haves_passed: r.must_haves_passed ?? [],
    narrative: r.narrative ?? '',
  }
  if (mode === 'preferences') return { ...base, band: null, fit_score: null }
  return { ...base, band: r.band ?? 'weak', fit_score: r.fit_score ?? r.total_score }
}

function toRow(jobDescriptionId: string, r: MatchResult) {
  return {
    job_description_id: jobDescriptionId,
    profile_id: r.profile_id,
    total_score: r.total_score,
    rank: r.rank,
    band: r.band,
    fit_score: r.fit_score,
    adjustments: r.adjustments,
    scoring: r.scoring,
    must_haves_passed: r.must_haves_passed,
    narrative: r.narrative,
  }
}

/** Creates the run's job_descriptions row, first deleting the run it replaces
 *  (the opening's previous ranking, or the manager's previous unsaved ad-hoc
 *  runs). Results cascade; video requests keep their row with a null link. */
export async function createRun(args: {
  openingId: string | null
  mode: RankingMode
  rawText: string
  extracted: ExtractedRequirements | null
  requirements: Requirement[]
}): Promise<JobDescription> {
  const replace = supabase.from('job_descriptions').delete().eq('hiring_manager_id', DEMO_HIRING_MANAGER_ID)
  const { error: delErr } = await (args.openingId ? replace.eq('opening_id', args.openingId) : replace.is('opening_id', null))
  if (delErr) throw new Error(delErr.message)
  const { data, error } = await supabase
    .from('job_descriptions')
    .insert({
      hiring_manager_id: DEMO_HIRING_MANAGER_ID,
      opening_id: args.openingId,
      // Sent only for preferences runs, so JD runs work before 019 has run.
      ...(args.mode === 'preferences' ? { mode: args.mode } : {}),
      raw_text: args.rawText,
      extracted: args.extracted,
      requirements: args.requirements,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as JobDescription
}

/** Writes a run's results. Replaces them unless `append` (which upserts). */
export async function saveResults(
  jobDescriptionId: string,
  results: MatchResult[],
  opts: { append?: boolean } = {},
): Promise<void> {
  if (!opts.append) {
    const { error } = await supabase.from('match_results').delete().eq('job_description_id', jobDescriptionId)
    if (error) throw new Error(error.message)
  }
  if (results.length === 0) return
  const { error } = await supabase
    .from('match_results')
    .upsert(results.map((r) => toRow(jobDescriptionId, r)), { onConflict: 'job_description_id,profile_id' })
  if (error) throw new Error(error.message)
}

/** Writes edited requirements back to the run without re-scoring — e.g. a
 *  tightened Must-have, so a reload keeps it. */
export async function updateRunRequirements(jobDescriptionId: string, requirements: Requirement[]): Promise<void> {
  const { error } = await supabase.from('job_descriptions').update({ requirements }).eq('id', jobDescriptionId)
  if (error) throw new Error(error.message)
}

export async function loadRanking(jobDescriptionId: string): Promise<RankingRecord | null> {
  const { data: jd } = await supabase.from('job_descriptions').select('*').eq('id', jobDescriptionId).maybeSingle()
  if (!jd || !jd.requirements) return null // missing, or a legacy pre-rework row
  const { data: rows } = await supabase
    .from('match_results')
    .select('*')
    .eq('job_description_id', jobDescriptionId)
    .order('rank')
  const mode: RankingMode = jd.mode ?? 'jd'
  return { jd: jd as JobDescription, results: ((rows as MatchResultRow[]) ?? []).map((r) => fromRow(r, mode)) }
}

export async function loadLatestForOpening(openingId: string): Promise<RankingRecord | null> {
  const { data } = await supabase
    .from('job_descriptions')
    .select('id')
    .eq('opening_id', openingId)
    .not('requirements', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? loadRanking(data.id) : null
}

/** "Save ranking to opening": the ad-hoc run becomes that opening's ranking,
 *  replacing any ranking the opening had. The ?ranking=<id> URL stays valid. */
export async function attachToOpening(jobDescriptionId: string, openingId: string): Promise<void> {
  const { error: delErr } = await supabase
    .from('job_descriptions')
    .delete()
    .eq('opening_id', openingId)
    .neq('id', jobDescriptionId)
  if (delErr) throw new Error(delErr.message)
  const { error } = await supabase.from('job_descriptions').update({ opening_id: openingId }).eq('id', jobDescriptionId)
  if (error) throw new Error(error.message)
}

/** Scores a pool for a run: through the engine with a JD, app-side without. */
function scoreFor(mode: RankingMode, jobDescriptionId: string, requirements: Requirement[], pool: Profile[]) {
  return mode === 'jd' ? rankPool(jobDescriptionId, requirements, pool) : rankByPreferences(requirements, pool)
}

/** A full run: create the row, score the (already must-have-filtered) pool,
 *  store the results. A preferences run stores raw_text '' and no extraction. */
export async function runRanking(args: {
  openingId: string | null
  mode: RankingMode
  rawText: string
  extracted: ExtractedRequirements | null
  requirements: Requirement[]
  pool: Profile[]
}): Promise<RankingRecord> {
  const jd = await createRun(args)
  const results = await scoreFor(args.mode, jd.id, args.requirements, args.pool)
  await saveResults(jd.id, results)
  return { jd, results }
}

/**
 * After a Must-have is loosened: score only the newly eligible candidates,
 * merge them into the existing results and re-rank (spec §2.2).
 *
 * LOOP8 NOTE: this relies on scores being independent per candidate. If the
 * real engine normalizes scores across the pool (e.g. percentile scaling),
 * newcomers change everyone's score and this must become a full re-run.
 */
export async function scoreNewcomers(args: {
  jobDescriptionId: string
  mode: RankingMode
  requirements: Requirement[]
  newcomers: Profile[]
  existing: MatchResult[]
  profilesById: Map<string, Pick<Profile, 'id' | 'availability_updated_at'>>
}): Promise<MatchResult[]> {
  const fresh: MatchResult[] = await scoreFor(args.mode, args.jobDescriptionId, args.requirements, args.newcomers)
  const all = [...args.existing, ...fresh]
  const merged: MatchResult[] =
    args.mode === 'jd'
      ? orderResults(all.filter((r): r is JdMatchResult => !isPreferenceResult(r)), args.profilesById)
      : orderPreferenceResults(all.filter(isPreferenceResult), args.profilesById)
  await saveResults(args.jobDescriptionId, merged)
  await updateRunRequirements(args.jobDescriptionId, args.requirements)
  return merged
}
