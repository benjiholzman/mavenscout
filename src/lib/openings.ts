import { DEMO_HIRING_MANAGER_ID } from './session'
import { supabase } from './supabase'
import type { CandidateNoteScore, Opening, OpeningEntry } from '../types/db'

// Openings data operations (PRD 7.4). All writes act as the mocked demo
// hiring manager; real per-user identity lands with the developer's auth pass.

/** What the app calls an opening: the default quick-save opening is
 *  "General" whatever name it was stored with (older rows say "Saved"). */
export function openingDisplayName(o: Pick<Opening, 'name' | 'is_default'>): string {
  return o.is_default ? 'General' : o.name
}

/** The always-present quick-save opening ("General") — created on demand if missing. */
export async function ensureDefaultOpening(): Promise<Opening> {
  const { data } = await supabase
    .from('openings')
    .select('*')
    .eq('hiring_manager_id', DEMO_HIRING_MANAGER_ID)
    .eq('is_default', true)
    .maybeSingle()
  if (data) return data as Opening
  const { data: created, error } = await supabase
    .from('openings')
    .insert({ hiring_manager_id: DEMO_HIRING_MANAGER_ID, name: 'General', is_default: true })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return created as Opening
}

export async function createOpening(input: {
  name: string
  description?: string | null
  deadline?: string | null
}): Promise<Opening> {
  const { data, error } = await supabase
    .from('openings')
    .insert({ hiring_manager_id: DEMO_HIRING_MANAGER_ID, ...input })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Opening
}

/** Save a candidate into an opening. Saving as top_pick from anywhere also
 *  means long-list membership — one row, list_tag records the tier. */
export async function saveToOpening(
  openingId: string,
  profileId: string,
  tag: 'favorite' | 'top_pick',
): Promise<OpeningEntry> {
  const { data: existing } = await supabase
    .from('opening_entries')
    .select('*')
    .eq('opening_id', openingId)
    .eq('profile_id', profileId)
    .maybeSingle()
  if (existing) {
    // Upgrading favorite → top_pick keeps the row; never silently downgrade.
    if (existing.list_tag === 'favorite' && tag === 'top_pick') {
      const { data } = await supabase
        .from('opening_entries')
        .update({ list_tag: 'top_pick' })
        .eq('id', existing.id)
        .select('*')
        .single()
      return data as OpeningEntry
    }
    return existing as OpeningEntry
  }
  const { data, error } = await supabase
    .from('opening_entries')
    .insert({ opening_id: openingId, profile_id: profileId, list_tag: tag })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as OpeningEntry
}

/** Demote to long list, or remove entirely (removing from the long list
 *  removes from the short list too — they're one row). */
export async function setListTag(entryId: string, tag: 'favorite' | 'top_pick') {
  await supabase.from('opening_entries').update({ list_tag: tag }).eq('id', entryId)
}

export async function removeEntry(entryId: string) {
  await supabase.from('opening_entries').delete().eq('id', entryId)
}

export async function setOutreachTag(
  entryId: string,
  tag: OpeningEntry['outreach_tag'],
) {
  await supabase.from('opening_entries').update({ outreach_tag: tag }).eq('id', entryId)
}

export async function savePostInterview(
  entryId: string,
  note: string | null,
  score: number | null,
) {
  await supabase
    .from('opening_entries')
    .update({ post_interview_note: note, post_interview_score: score })
    .eq('id', entryId)
}

/** One note/score row per (entry, author) — upsert on that pair (PRD 7.4). */
export async function upsertNoteScore(
  entryId: string,
  authorId: string,
  note: string | null,
  score: number | null,
) {
  const { error } = await supabase.from('candidate_notes_scores').upsert(
    {
      opening_entry_id: entryId,
      author_id: authorId,
      note,
      score,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'opening_entry_id,author_id' },
  )
  if (error) throw new Error(error.message)
}

/** Clear an opening's candidates (the fill-then-reset affordance). */
export async function clearOpening(openingId: string) {
  await supabase.from('opening_entries').delete().eq('opening_id', openingId)
}

export async function deleteOpening(openingId: string) {
  await supabase.from('openings').delete().eq('id', openingId)
}

// ---- sharing ----------------------------------------------------------------

export async function createShare(openingId: string): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
  const { error } = await supabase
    .from('opening_shares')
    .insert({ opening_id: openingId, share_token: token })
  if (error) throw new Error(error.message)
  return token
}

export async function revokeShare(shareId: string) {
  await supabase
    .from('opening_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareId)
}

// ---- reviewers ----------------------------------------------------------------

export async function grantReviewer(openingId: string, reviewerId: string) {
  await supabase.from('opening_reviewers').insert({ opening_id: openingId, reviewer_id: reviewerId })
}

export async function revokeReviewer(grantId: string) {
  await supabase.from('opening_reviewers').delete().eq('id', grantId)
}

// ---- team stats ----------------------------------------------------------------

export interface TeamStats {
  /** entry id → average score across authors (null if no scores) */
  averages: Map<string, number | null>
  /** entry id → 1-based team rank by average (ties share order of avg desc) */
  ranks: Map<string, number>
}

export function computeTeamStats(
  entries: OpeningEntry[],
  notes: CandidateNoteScore[],
): TeamStats {
  const averages = new Map<string, number | null>()
  for (const e of entries) {
    const scores = notes
      .filter((n) => n.opening_entry_id === e.id && n.score !== null)
      .map((n) => n.score as number)
    averages.set(
      e.id,
      scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
    )
  }
  const ranked = [...entries]
    .filter((e) => averages.get(e.id) !== null)
    .sort((a, b) => (averages.get(b.id) ?? 0) - (averages.get(a.id) ?? 0))
  const ranks = new Map<string, number>()
  ranked.forEach((e, i) => ranks.set(e.id, i + 1))
  return { averages, ranks }
}
