import { preferenceScoring } from './total'
import type { Adjustment, MatchResult, Scoring } from './types'

// Displayed score build-up (match rework spec §5.3, §7).
//
//   total = (1 − w) × Fit + 100 × w × (earned ÷ possible)      (total.ts)
//
// Shown as "Fit 80 × 0.92 → 74 · preferences 5 of 8 → +5 · Total 79". Every
// displayed number is a whole number and the build-up adds up EXACTLY:
// - Fit part = round((1 − w) × Fit), from the displayed Fit;
// - preference part = total − Fit part (always 0 … 100w, because the total is
//   computed from the displayed Fit — see total.ts);
// - each row's share of the preference part, 100 × w × points ÷ possible, uses
//   LARGEST-REMAINDER rounding: floor every share, then give the leftover whole
//   points to the shares with the largest fractional parts, so the rows sum to
//   the preference part exactly. Not-applicable rows show 0.

export interface BreakdownRow {
  adjustment: Adjustment
  points: number // integer share of the preference part, as displayed
}

export interface ScoreBreakdown {
  fit: number
  /** 1 − w: what Fit is multiplied by (1 with no applicable preference rows). */
  fitMultiplier: number
  /** round((1 − w) × Fit). */
  fitPart: number
  rows: BreakdownRow[] // same order as result.adjustments
  /** total − fitPart = Σ rows. */
  preferencePart: number
  scoring: Scoring
  total: number
}

/** Integers summing exactly to `target`, as close as possible to `values`
 *  (largest-remainder method). Ties go to the larger value, then the earlier. */
export function largestRemainder(values: number[], target: number): number[] {
  const floors = values.map((v) => Math.floor(v + 1e-9))
  let leftover = target - floors.reduce((s, v) => s + v, 0)
  const order = values
    .map((v, i) => ({ i, frac: v - floors[i], v }))
    .sort((a, b) => b.frac - a.frac || b.v - a.v || a.i - b.i)
  const out = [...floors]
  // Normally 0 ≤ leftover ≤ number of fractional values; the loops also keep
  // the sum exact in any edge case.
  for (let k = 0; leftover > 0; k = (k + 1) % order.length, leftover--) out[order[k].i] += 1
  for (let k = order.length - 1; leftover < 0; k = (k - 1 + order.length) % order.length, leftover++)
    out[order[k].i] -= 1
  return out
}

export function scoreBreakdown(
  result: Pick<MatchResult, 'fit_score' | 'total_score' | 'adjustments'> & { scoring?: Scoring | null },
): ScoreBreakdown {
  // Legacy rows (scored before 008) carry no scoring; derive it from the
  // adjustments so the screen still renders until 008 removes them.
  const scoring = result.scoring ?? preferenceScoring(result.adjustments)
  const fitMultiplier = 1 - scoring.weight
  const fitPart = scoring.weight === 0 ? result.fit_score : Math.round(fitMultiplier * result.fit_score)
  const preferencePart = result.total_score - fitPart
  const shares = result.adjustments.map((a) =>
    a.outcome === 'not_applicable' || scoring.possible === 0
      ? 0
      : (100 * scoring.weight * Math.max(0, a.points)) / scoring.possible,
  )
  const points = shares.length ? largestRemainder(shares, preferencePart) : []
  return {
    fit: result.fit_score,
    fitMultiplier,
    fitPart,
    rows: result.adjustments.map((adjustment, i) => ({ adjustment, points: points[i] ?? 0 })),
    preferencePart,
    scoring,
    total: result.total_score,
  }
}

/** 0.92, 0.8, 1 — the Fit multiplier without trailing zeros. */
export function formatMultiplier(m: number): string {
  return String(Math.round(m * 100) / 100)
}

/** Points earned/possible: whole numbers as-is, otherwise one decimal (4.5). */
export function formatPoints(p: number): string {
  return String(Math.round(p * 10) / 10)
}

/** Preferences' share of the score, as a whole percent (8%, 20%). */
export function preferencePercent(s: Scoring): string {
  return `${Math.round(s.weight * 100)}%`
}
