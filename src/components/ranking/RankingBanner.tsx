import { RefreshCw, SlidersHorizontal, Sparkles, UserPlus, X } from 'lucide-react'
import type { RankingMode } from '../../lib/matching/types'

// Results header for ranking mode (match rework spec §7.4, §2.2): what was
// ranked, how many Required rows excluded, and the prompts that appear when
// requirements change after a run. Nothing re-runs on its own. A
// preferences-only run (§11) reads "Sorted by your preferences."

export function RankingBanner({
  mode,
  rankedCount,
  excludedCount,
  linkedOpeningName,
  onEdit,
  onSave,
  onClear,
  newcomerCount,
  onScoreNewcomers,
  scoringNewcomers,
  requirementsChanged,
  onRerun,
  rerunning,
  rerunBlocker,
}: {
  mode: RankingMode
  rankedCount: number
  excludedCount: number
  linkedOpeningName: string | null
  onEdit: () => void
  /** Absent when linked to an opening — those runs save automatically. */
  onSave?: () => void
  onClear: () => void
  newcomerCount: number
  onScoreNewcomers: () => void
  scoringNewcomers: boolean
  requirementsChanged: boolean
  onRerun: () => void
  rerunning: boolean
  rerunBlocker: string | null
}) {
  return (
    <div className="mt-5 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-ink/15 bg-ink px-4 py-3 text-sm text-white">
        <div className="min-w-0">
          {linkedOpeningName && (
            <p className="text-xs font-medium text-gold-300">Ranking for: {linkedOpeningName}</p>
          )}
          <p>
            <Sparkles size={14} className="mr-1.5 inline text-gold-300" aria-hidden />
            {mode === 'preferences' ? (
              <>
                Sorted by your preferences.
                <span className="text-white/70">
                  {' '}
                  {rankedCount} candidate{rankedCount === 1 ? '' : 's'}
                </span>
              </>
            ) : (
              <>Ranked {rankedCount} candidate{rankedCount === 1 ? '' : 's'} against your JD</>
            )}
            {excludedCount > 0 && (
              <span className="text-white/70"> · {excludedCount} excluded by Must haves</span>
            )}
            {mode === 'jd' && <span className="ml-2 text-white/50">placeholder scorer</span>}
          </p>
        </div>
        <span className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/10"
          >
            <SlidersHorizontal size={13} aria-hidden /> Edit requirements
          </button>
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-white/90"
            >
              Save ranking to opening…
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-white/70 hover:text-white"
          >
            <X size={13} aria-hidden /> Clear
          </button>
        </span>
      </div>

      {newcomerCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm">
          <p className="flex items-center gap-1.5 text-ink">
            <UserPlus size={14} className="text-brand-600" aria-hidden />
            {newcomerCount} more candidate{newcomerCount === 1 ? '' : 's'} now qualif{newcomerCount === 1 ? 'ies' : 'y'}.
          </p>
          <button
            type="button"
            disabled={scoringNewcomers}
            onClick={onScoreNewcomers}
            className="rounded-full bg-brand-500 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {scoringNewcomers ? 'Scoring…' : newcomerCount === 1 ? 'Score them' : `Score them (${newcomerCount})`}
          </button>
        </div>
      )}

      {requirementsChanged && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-gold-300 bg-gold-300/15 px-4 py-2.5 text-sm">
          <p className="flex items-center gap-1.5 text-ink">
            <RefreshCw size={14} className="text-gold-700" aria-hidden />
            Requirements changed since this ranking ran.
          </p>
          <button
            type="button"
            disabled={rerunning || !!rerunBlocker}
            title={rerunBlocker ?? undefined}
            onClick={onRerun}
            className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-white hover:bg-ink/85 disabled:opacity-50"
          >
            {rerunning ? 'Ranking…' : 'Re-run ranking'}
          </button>
        </div>
      )}
    </div>
  )
}
