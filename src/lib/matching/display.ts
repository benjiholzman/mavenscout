import { ADJUSTMENT_CAP } from './config'
import type { Adjustment, MatchResult } from './types'

// Displayed score build-up (match rework spec §5.3, §7).
//
// Scores are computed in floats; only displayed numbers are rounded. To make
// the build-up always add up exactly — "Fit 72 + 10 = 82", and every table
// row summing to the total — the displayed adjustment points use
// LARGEST-REMAINDER rounding: each value is floored, and the leftover whole
// points go to the values with the largest fractional parts, so the rounded
// values sum to an exact target.
//
// Target for the adjustment rows:
// - no cap: exactly (displayed total − displayed Fit);
// - cap or 100-clamp applied: the rounded uncapped sum, followed by a cap row
//   ("Preference bonus capped at +20") and, if the total hit 100, a clamp row,
//   which together bring the build-up to exactly (total − Fit).

export interface BreakdownRow {
  adjustment: Adjustment
  points: number // integer, as displayed
}

export interface ScoreBreakdown {
  fit: number
  rows: BreakdownRow[] // same order as result.adjustments
  /** Negative points removed by the +20 cap; null when the cap didn't bite. */
  capRow: number | null
  /** Negative points removed because the total can't exceed 100; else null. */
  clampRow: number | null
  /** The preference term of the equation: Σ rows + capRow + clampRow. */
  bonus: number
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

export function scoreBreakdown(result: Pick<MatchResult, 'fit_score' | 'total_score' | 'adjustments' | 'adjustments_capped'>): ScoreBreakdown {
  const target = result.total_score - result.fit_score
  const raw = result.adjustments.map((a) => a.points)
  const sum = raw.reduce((s, v) => s + v, 0)
  const clamped = result.fit_score + Math.min(sum, ADJUSTMENT_CAP) > 100 + 0.5
  const exact = !result.adjustments_capped && !clamped

  const rowTarget = exact ? target : Math.round(sum)
  const points = raw.length ? largestRemainder(raw, rowTarget) : []
  const rowSum = points.reduce((s, v) => s + v, 0)

  let capRow: number | null = null
  let clampRow: number | null = null
  if (!exact) {
    const afterCap = result.adjustments_capped ? Math.min(rowSum, ADJUSTMENT_CAP) : rowSum
    if (result.adjustments_capped && afterCap !== rowSum) capRow = afterCap - rowSum
    const rest = target - afterCap
    if (rest !== 0) clampRow = rest
  }

  return {
    fit: result.fit_score,
    rows: result.adjustments.map((adjustment, i) => ({ adjustment, points: points[i] ?? 0 })),
    capRow,
    clampRow,
    bonus: target,
    total: result.total_score,
  }
}
