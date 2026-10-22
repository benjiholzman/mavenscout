import { formatMultiplier, formatPoints, type ScoreBreakdown } from '../../lib/matching/display'
import type { Outcome } from '../../lib/matching/types'

// Outcome marks for adjustments (match rework spec §7.2): ✓ met, ◐ partial,
// ✗ not met, – not applicable — each with a screen-reader label.

const MARKS: Record<Outcome, { glyph: string; label: string; className: string }> = {
  met: { glyph: '✓', label: 'Met', className: 'text-brand-600' },
  partial: { glyph: '◐', label: 'Partly met', className: 'text-gold-700' },
  not_met: { glyph: '✗', label: 'Not met', className: 'text-ink-faint' },
  not_applicable: { glyph: '–', label: 'Not applicable', className: 'text-ink-faint' },
}

export function OutcomeIcon({ outcome }: { outcome: Outcome }) {
  const m = MARKS[outcome]
  return (
    <span className={`inline-block w-4 text-center font-semibold ${m.className}`} title={m.label}>
      <span aria-hidden>{m.glyph}</span>
      <span className="sr-only">{m.label}</span>
    </span>
  )
}

/** "+8", "0", "−21" — displayed (already rounded) points. */
export function pointsLabel(points: number): string {
  if (points > 0) return `+${points}`
  if (points < 0) return `−${Math.abs(points)}`
  return '0'
}

/** The score equation (spec §7.2, §7.3), from the displayed build-up so it
 *  always adds up: "Fit 80 × 0.92 → 74 · preferences 5 of 8 → +5 · Total 79",
 *  or "Total = Fit 83" when no preference row applies. Each segment wraps as a
 *  unit on narrow cards. */
export function ScoreEquation({ b, className = '' }: { b: ScoreBreakdown; className?: string }) {
  if (b.scoring.weight === 0)
    return (
      <p className={`tabular-nums ${className}`}>
        <span className="font-semibold">Total = Fit {b.total}</span>
      </p>
    )
  return (
    <p className={`flex flex-wrap gap-x-1.5 tabular-nums ${className}`}>
      <span className="whitespace-nowrap">
        Fit {b.fit} × {formatMultiplier(b.fitMultiplier)} → {b.fitPart}
      </span>
      <span aria-hidden>·</span>
      <span className="whitespace-nowrap">
        preferences {formatPoints(b.scoring.earned)} of {formatPoints(b.scoring.possible)} → {pointsLabel(b.preferencePart)}
      </span>
      <span aria-hidden>·</span>
      <span className="whitespace-nowrap font-semibold">Total {b.total}</span>
    </p>
  )
}
