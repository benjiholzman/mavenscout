import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { BAND_LABELS } from '../../lib/matching/config'
import { breakdownRows, formatPoints, rowsByWeight } from '../../lib/matching/display'
import { isPreferenceResult, type Level, type MatchResult } from '../../lib/matching/types'
import { LEVEL_LABELS } from '../../lib/requirements/labels'

// A ranked card's header (Find an Expert results): the rank, the match %, a
// progress bar and "4 of 6 met ▾", which opens the breakdown inside the card
// — one line per priority with ✓ / ~ / –, its strength and the points it
// earned ("Required" for Must haves). A job-description run shows its band
// beside the % and links to the full assessment (Fit, narrative) in "About
// this result"; a priorities run links to the same popup for its build-up.

const MARKS = {
  met: { mark: '✓', cls: 'bg-brand-100 text-brand-700' },
  partial: { mark: '~', cls: 'bg-[#FEF3C7] text-[#92400E]' },
  not_met: { mark: '–', cls: 'bg-[#F1EDE7] text-ink-faint' },
} as const

/** Three small bars, filled to the strength: 1 Nice to have, 2 Important,
 *  3 Must have. */
function StrengthBars({ level }: { level: Level }) {
  const n = level === 'slight' ? 1 : level === 'strong' ? 2 : 3
  const fill = level === 'must' ? 'bg-ink' : 'bg-brand-500'
  return (
    <span className="inline-flex h-[11px] shrink-0 items-end gap-[2px]" title={LEVEL_LABELS[level]} aria-label={LEVEL_LABELS[level]}>
      {[5, 8, 11].map((h, i) => (
        <span key={h} className={`w-[3px] rounded-[1px] ${i < n ? fill : 'bg-[#E1DCD3]'}`} style={{ height: h }} />
      ))}
    </span>
  )
}

export function RankHeader({
  rank,
  result,
  onAbout,
}: {
  rank: number
  result: MatchResult
  onAbout: () => void
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const rows = rowsByWeight(breakdownRows(result.adjustments, result.scoring)).filter((r) => r.adjustment.outcome !== 'not_applicable')
  const met = rows.filter((r) => r.adjustment.outcome === 'met').length
  const musts = result.must_haves_passed
  const total = rows.length + musts.length
  const pct = result.total_score
  const prefs = isPreferenceResult(result)

  return (
    <div className="shrink-0 rounded-t-card border-b border-[#EFEAE3] bg-[#F7FBFC] px-[18px] py-3">
      <div className="flex items-center gap-2.5">
        <span className="text-[13px] font-semibold tabular-nums text-ink-faint">#{rank}</span>
        <span className="font-display text-[22px] font-bold leading-none tabular-nums text-brand-700">{pct}%</span>
        <span className="text-[12.5px] font-semibold text-brand-700">match</span>
        {!prefs && <span className="truncate text-xs text-ink-faint">· {BAND_LABELS[result.band]}</span>}
        <span className="flex-1" />
        {total > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex shrink-0 items-center gap-0.5 text-[13px] text-brand-700 hover:text-brand-800"
          >
            {met + musts.length} of {total} met
            <ChevronDown size={13} strokeWidth={2.4} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        )}
      </div>
      <div className="mt-[9px] h-1 overflow-hidden rounded-sm bg-[#E1EEF0]">
        <div className="h-full rounded-sm bg-brand-500" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
      {open && (
        <div id={panelId} className="mt-2.5 flex flex-col gap-1.5">
          {!prefs && (
            <div className="flex items-center gap-2 text-[12.5px]">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">J</span>
              <span className="min-w-0 flex-1 truncate text-ink">Fit to the job description</span>
              <span className="w-[58px] shrink-0 text-right text-ink-faint">{result.fit_score} / 100</span>
            </div>
          )}
          {musts.map((m) => (
            <div key={m.requirement_id} className="flex items-center gap-2 text-[12.5px]">
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${MARKS.met.cls}`}>✓</span>
              <span className="min-w-0 flex-1 truncate text-ink" title={m.label}>
                {m.label}
              </span>
              <StrengthBars level="must" />
              <span className="w-[58px] shrink-0 text-right text-ink-faint">Required</span>
            </div>
          ))}
          {rows.map((r) => {
            const a = r.adjustment
            const m = MARKS[a.outcome as keyof typeof MARKS] ?? MARKS.not_met
            return (
              <div key={a.requirement_id} className="flex items-center gap-2 text-[12.5px]">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${m.cls}`}>{m.mark}</span>
                <span className="min-w-0 flex-1 truncate text-ink" title={`${a.label} — ${a.detail}`}>
                  {a.label}
                </span>
                <StrengthBars level={a.level} />
                <span className="w-[58px] shrink-0 text-right tabular-nums text-ink-faint">
                  {formatPoints(r.earned)} / {formatPoints(r.possible)}
                </span>
              </div>
            )
          })}
          <button
            type="button"
            onClick={onAbout}
            className="mt-0.5 self-start text-xs font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-600"
          >
            {prefs ? 'How this score works' : 'Read the full assessment'}
          </button>
        </div>
      )}
    </div>
  )
}
