import { PREFERENCE_CAP_POINTS, PREFERENCE_POINTS } from './config'
import type { Adjustment, Scoring } from './types'

// The total score (match rework spec §5.3) — pure, shared by the scorer and the
// displayed build-up so they can't disagree.
//
//   w     = min(possible, PREFERENCE_CAP_POINTS) / 100
//   total = (1 − w) × Fit + 100 × w × (earned ÷ possible)
//
// Preferences carry weight equal to their points, up to 20% of the score: one
// Nice to have row (3 points possible) is worth ~3%, one Important row 8%.
// Not-applicable rows (career level for a firm) count toward neither earned nor
// possible. No applicable rows → w = 0 → total = Fit. The total is always
// within 0–100, so there is no clamp.
//
// The total is computed from the DISPLAYED (rounded) Fit so the shown equation
// reproduces exactly; ranking still breaks ties on the unrounded Fit.

export function preferenceScoring(adjustments: Adjustment[]): Scoring {
  const applicable = adjustments.filter((a) => a.outcome !== 'not_applicable')
  const possible = applicable.reduce((s, a) => s + PREFERENCE_POINTS[a.level], 0)
  const earned = applicable.reduce((s, a) => s + Math.max(0, a.points), 0)
  return { weight: possible > 0 ? Math.min(possible, PREFERENCE_CAP_POINTS) / 100 : 0, earned, possible }
}

/** The preference term, 100 × w × earned ÷ possible (0 when w = 0). */
export function preferenceTerm(s: Scoring): number {
  return s.weight > 0 && s.possible > 0 ? (100 * s.weight * s.earned) / s.possible : 0
}

export function totalScore(fitScore: number, s: Scoring): number {
  if (s.weight === 0) return fitScore
  return Math.round((1 - s.weight) * fitScore + preferenceTerm(s))
}
