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
