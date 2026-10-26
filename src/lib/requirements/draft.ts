import { rankingModeFor } from '../matching/preferences'
import type { ExtractedRequirements, RankingMode, Requirement } from '../matching/types'

// Unsaved edits to a ranking (match rework spec §2.2). After a run, changes to
// Nice to have / Important rows or the JD aren't scored until the manager
// re-runs, and the stored ranking stays exactly as scored. So that leaving and
// returning (Back from a profile, a reload) doesn't lose those edits, they're
// kept here as a per-tab draft keyed by ranking id, and restored with the
// "Requirements changed — Re-run ranking" prompt. Re-run or Clear discards it.
//
// sessionStorage can be unavailable (private windows, blocked storage); every
// access is guarded and the page works without it.

export interface RankingDraft {
  requirements: Requirement[]
  jdText: string
  extracted: ExtractedRequirements | null
  /** The run's mode (priorities or JD). Drafts kept before modes have none: read from the
   *  JD text, as the mode was then. */
  tab: RankingMode
}

const key = (rankingId: string) => `ms_ranking_draft:${rankingId}`

export function readDraft(rankingId: string): RankingDraft | null {
  try {
    const raw = sessionStorage.getItem(key(rankingId))
    if (!raw) return null
    const draft = JSON.parse(raw) as Omit<RankingDraft, 'tab'> & { tab?: RankingMode }
    if (!Array.isArray(draft.requirements) || typeof draft.jdText !== 'string') return null
    return { ...draft, tab: draft.tab ?? rankingModeFor(draft.jdText) }
  } catch {
    return null
  }
}

export function writeDraft(rankingId: string, draft: RankingDraft): void {
  try {
    sessionStorage.setItem(key(rankingId), JSON.stringify(draft))
  } catch {
    // storage unavailable or full: the edits just won't survive navigation
  }
}

export function clearDraft(rankingId: string): void {
  try {
    sessionStorage.removeItem(key(rankingId))
  } catch {
    // nothing to do
  }
}
