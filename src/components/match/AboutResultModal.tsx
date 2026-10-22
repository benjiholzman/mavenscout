import { Check, ChevronDown } from 'lucide-react'
import { BAND_LABELS, PREFERENCE_CAP_POINTS, PREFERENCE_POINTS } from '../../lib/matching/config'
import { formatMultiplier, formatPoints, preferencePercent, scoreBreakdown } from '../../lib/matching/display'
import type { MatchResult } from '../../lib/matching/types'
import type { Profile } from '../../types/db'
import { Modal } from '../ui/Modal'
import { OutcomeIcon, pointsLabel, ScoreEquation } from './outcome'
import { BAND_STYLES } from './RankStrip'

// "About this result" (match rework spec §7.3): the full score build-up for
// one ranked candidate. Every number comes from scoreBreakdown (largest-
// remainder rounding), so the table always adds up to the total:
// Fit part + Σ preference rows = Total.

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
                  <span className="block text-xs text-ink-faint">
                    The engine's judgment of fit — not adjustable
                    {b.scoring.weight > 0 && (
                      <>
                        {' · '}
                        <span className="tabular-nums">
                          Fit {b.fit} × {formatMultiplier(b.fitMultiplier)}
                        </span>
                      </>
                    )}
                  </span>
                </td>
                <td className="py-2 text-right font-semibold tabular-nums text-ink">{b.fitPart}</td>
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
                    <span className="block text-xs text-ink-faint">
                      {a.detail}
                      {' · '}
                      <span className="tabular-nums">
                        {a.outcome === 'not_applicable'
                          ? 'not counted'
                          : `${formatPoints(a.points)} of ${PREFERENCE_POINTS[a.level]} pts`}
                      </span>
                    </span>
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
              {b.rows.length > 0 && b.scoring.weight === 0 && (
                <tr className="border-b border-line-soft">
                  <td colSpan={3} className="py-2 text-xs text-ink-faint">
                    None of these rows apply to this candidate — the total is the Fit score.
                  </td>
                </tr>
              )}
              {b.scoring.weight > 0 && (
                <tr className="border-b border-line">
                  <td />
                  <td className="py-2 pr-2 text-ink-soft">
                    Preferences: {formatPoints(b.scoring.earned)} of {formatPoints(b.scoring.possible)} points
                    <span className="block text-xs text-ink-faint">
                      Worth {preferencePercent(b.scoring)} of the score
                    </span>
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums text-ink-soft">
                    {pointsLabel(b.preferencePart)}
                  </td>
                </tr>
              )}
              <tr>
                <td className="pt-2.5 pr-2 font-semibold text-ink" colSpan={2}>
                  Total
                  {b.scoring.weight > 0 ? (
                    <ScoreEquation b={b} className="mt-0.5 text-xs font-normal text-ink-faint" />
                  ) : (
                    <span className="ml-2 font-normal tabular-nums text-ink-faint">= Fit {b.fit}</span>
                  )}
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
              Preferences carry weight equal to their points, up to {PREFERENCE_CAP_POINTS}% of the score. A{' '}
              <b className="font-medium text-ink">Nice to have</b> row is worth {PREFERENCE_POINTS.slight} points and an{' '}
              <b className="font-medium text-ink">Important</b> row {PREFERENCE_POINTS.strong}; partial matches earn part
              of a row's points. One Important row alone makes preferences {PREFERENCE_POINTS.strong}% of the score, so Fit
              counts × {formatMultiplier(1 - PREFERENCE_POINTS.strong / 100)}.
            </li>
            <li>
              A candidate's preference score is the points they earned out of the points possible. Rows that don't
              apply to them (career level for a firm) don't count. With no Nice to have or Important rows, the total
              is the Fit score.
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
