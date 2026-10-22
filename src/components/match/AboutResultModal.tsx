import { Check, ChevronDown } from 'lucide-react'
import { ADJUSTMENT_CAP, BAND_LABELS, PREFERENCE_POINTS } from '../../lib/matching/config'
import { scoreBreakdown } from '../../lib/matching/display'
import type { MatchResult } from '../../lib/matching/types'
import type { Profile } from '../../types/db'
import { Modal } from '../ui/Modal'
import { OutcomeIcon, pointsLabel } from './outcome'
import { BAND_STYLES } from './RankStrip'

// "About this result" (match rework spec §7.3): the full score build-up for
// one ranked candidate. Every number comes from scoreBreakdown (largest-
// remainder rounding), so the table always adds up to the total.

const LEVEL_NAMES = { slight: 'Nice to have', strong: 'Important' } as const

export function AboutResultModal({
  open,
  onClose,
  profile,
  result,
  rank,
}: {
  open: boolean
  onClose: () => void
  profile: Profile | null
  result: MatchResult | null
  /** Rank as displayed where the modal was opened. */
  rank: number
}) {
  if (!profile || !result) return null
  const b = scoreBreakdown(result)
  const style = BAND_STYLES[result.band]

  return (
    <Modal open={open} onClose={onClose} title="About this result" wide fullScreenMobile>
      <div className="space-y-5 text-sm">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold leading-6 text-ink">{profile.name}</p>
            <p className="truncate text-xs text-ink-faint">{profile.headline}</p>
          </div>
          <p className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${style.strip} ${style.text}`}>
            <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden />#{rank} · {result.total_score} ·{' '}
            {BAND_LABELS[result.band]}
          </p>
        </header>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Score build-up</h3>
          <table className="w-full border-collapse text-left text-[13px]">
            <tbody>
              <tr className="border-b border-line">
                <td className="py-2 pr-2" colSpan={2}>
                  <span className="font-medium text-ink">Fit to the job description</span>
                  <span className="block text-xs text-ink-faint">The engine's judgment of fit — not adjustable</span>
                </td>
                <td className="py-2 text-right font-semibold tabular-nums text-ink">{b.fit}</td>
              </tr>
              {b.rows.map(({ adjustment: a, points }) => (
                <tr key={a.requirement_id} className="border-b border-line-soft align-top">
                  <td className="w-6 py-2 pr-1">
                    <OutcomeIcon outcome={a.outcome} />
                  </td>
                  <td className="py-2 pr-2">
                    <span className="text-ink">{a.label}</span>
                    <span className="ml-1.5 rounded-full bg-paper px-1.5 py-px text-[11px] text-ink-faint">
                      {LEVEL_NAMES[a.level]}
                    </span>
                    <span className="block text-xs text-ink-faint">{a.detail}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums text-ink-soft">{pointsLabel(points)}</td>
                </tr>
              ))}
              {b.rows.length === 0 && (
                <tr className="border-b border-line-soft">
                  <td colSpan={3} className="py-2 text-xs text-ink-faint">
                    No Nice to have or Important rows — the total is the Fit score.
                  </td>
                </tr>
              )}
              {b.capRow !== null && (
                <tr className="border-b border-line-soft">
                  <td />
                  <td className="py-2 pr-2 text-ink-soft">Preference bonus capped at +{ADJUSTMENT_CAP}</td>
                  <td className="py-2 text-right tabular-nums text-ink-soft">{pointsLabel(b.capRow)}</td>
                </tr>
              )}
              {b.clampRow !== null && (
                <tr className="border-b border-line-soft">
                  <td />
                  <td className="py-2 pr-2 text-ink-soft">Total capped at 100</td>
                  <td className="py-2 text-right tabular-nums text-ink-soft">{pointsLabel(b.clampRow)}</td>
                </tr>
              )}
              <tr>
                <td className="pt-2.5 pr-2 font-semibold text-ink" colSpan={2}>
                  Total
                  <span className="ml-2 font-normal text-ink-faint">
                    Fit {b.fit} {b.bonus >= 0 ? '+' : '−'} {Math.abs(b.bonus)} = {b.total}
                  </span>
                </td>
                <td className="pt-2.5 text-right text-base font-bold tabular-nums text-ink">{b.total}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {result.must_haves_passed.length > 0 && (
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Required rows met
            </h3>
            <ul className="space-y-1">
              {result.must_haves_passed.map((m) => (
                <li key={m.requirement_id} className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                  <Check size={14} className="text-brand-600" aria-hidden /> {m.label}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Summary
            <span className="rounded-full bg-gold-300/25 px-1.5 py-px text-[10.5px] font-semibold normal-case tracking-normal text-gold-700">
              placeholder
            </span>
          </h3>
          <p className="text-[13.5px] leading-relaxed text-ink-soft">{result.narrative}</p>
        </section>

        <details className="group rounded-lg border border-line bg-paper/60 px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-medium text-ink">
            How scoring works
            <ChevronDown size={15} className="text-ink-faint transition group-open:rotate-180" aria-hidden />
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[12.5px] leading-snug text-ink-soft">
            <li>
              <b className="font-medium text-ink">Fit</b> (0–100) is the engine's judgment of how well the candidate's
              evidence — portfolio, bio, accreditations, video and audio transcripts, and tags — fits the job
              description. You can't adjust it.
            </li>
            <li>
              Rows marked <b className="font-medium text-ink">Nice to have</b> add {PREFERENCE_POINTS.slight} points
              when met and <b className="font-medium text-ink">Important</b> rows add {PREFERENCE_POINTS.strong};
              partial matches earn part of that. Together they add at most +{ADJUSTMENT_CAP}, so preferences reorder
              close candidates but can't lift a weak fit past a strong one.
            </li>
            <li>
              Rows marked <b className="font-medium text-ink">Required</b> exclude candidates before anything is
              scored; they add no points.
            </li>
            <li>Ties go to the higher Fit, then the more recently updated availability, then a fixed order.</li>
            <li>Premium membership never affects ranked order.</li>
            <li>
              This build uses a clearly labeled <b className="font-medium text-ink">placeholder</b> scorer; the real
              engine replaces it behind the same interface.
            </li>
          </ul>
        </details>
      </div>
    </Modal>
  )
}
