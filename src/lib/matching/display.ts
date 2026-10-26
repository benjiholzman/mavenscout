import { PREFERENCE_POINTS } from './config'
import { preferenceScoring } from './total'
import type { Adjustment, JdMatchResult, PreferenceLevel, PreferenceMatchResult, Scoring } from './types'

// Displayed score build-up (match rework spec §5.3, §7).
//
//   total = (1 − w) × Fit + 100 × w × (earned ÷ possible)      (total.ts)
//
// Shown as "Fit 83 × 0.8 → 66 · preferences 5.4 of 8 pts → +14 · Total 80".
// Each preference row shows only its own points ("3 of 3 pts", "1.5 of 3
// pts"); rows are never converted to score points. The conversion appears once,
// at the preferences subtotal, and the build-up adds up exactly at that level:
// - Fit part = round((1 − w) × Fit), from the displayed Fit;
// - preference part = total − Fit part (always 0 … 100w, because the total is
//   computed from the displayed Fit — see total.ts);
// - so Fit part + preference part = total, in whole numbers.

export interface BreakdownRow {
  adjustment: Adjustment
  /** Points this row earned (met: full, partial: × credit, else 0). */
  earned: number
  /** Points this row is worth — its share of the points possible. 0 when the
   *  row doesn't apply to this candidate (not counted). From config (or the
   *  old values, for a run scored under them); the subtotal and total always
   *  come from the stored scoring. */
  possible: number
}

export interface ScoreBreakdown {
  fit: number
  /** 1 − w: what Fit is multiplied by (1 with no applicable preference rows). */
  fitMultiplier: number
  /** round((1 − w) × Fit). */
  fitPart: number
  rows: BreakdownRow[] // same order as result.adjustments
  /** total − fitPart: what the preferences subtotal converts to. */
  preferencePart: number
  scoring: Scoring
  total: number
}

/** Point values runs were scored with before Nice to have / Important became
 *  1 / 3. A saved run's stored points stay on that scale. */
const LEGACY_PREFERENCE_POINTS: Record<PreferenceLevel, number> = { slight: 3, strong: 8 }

/** The point values a result was scored with: today's, unless its stored
 *  points possible only add up under the old values. */
function pointsFor(adjustments: Adjustment[], scoring?: Scoring | null): Record<PreferenceLevel, number> {
  if (!scoring) return PREFERENCE_POINTS
  const sum = (pts: Record<PreferenceLevel, number>) =>
    adjustments.filter((a) => a.outcome !== 'not_applicable').reduce((s, a) => s + pts[a.level], 0)
  return sum(PREFERENCE_POINTS) !== scoring.possible && sum(LEGACY_PREFERENCE_POINTS) === scoring.possible
    ? LEGACY_PREFERENCE_POINTS
    : PREFERENCE_POINTS
}

/** One row per adjustment, with its own points earned and possible. Pass the
 *  result's stored scoring so a run saved under the old point values shows
 *  its rows on that scale. */
export function breakdownRows(adjustments: Adjustment[], scoring?: Scoring | null): BreakdownRow[] {
  const points = pointsFor(adjustments, scoring)
  return adjustments.map((adjustment) => ({
    adjustment,
    earned: adjustment.outcome === 'not_applicable' ? 0 : Math.max(0, adjustment.points),
    possible: adjustment.outcome === 'not_applicable' ? 0 : points[adjustment.level],
  }))
}

export function scoreBreakdown(
  result: Pick<JdMatchResult, 'fit_score' | 'total_score' | 'adjustments'> & { scoring?: Scoring | null },
): ScoreBreakdown {
  // Legacy rows (scored before 008) carry no scoring; derive it from the
  // adjustments so the screen still renders until 008 removes them.
  const scoring = result.scoring ?? preferenceScoring(result.adjustments)
  const fitMultiplier = 1 - scoring.weight
  const fitPart = scoring.weight === 0 ? result.fit_score : Math.round(fitMultiplier * result.fit_score)
  return {
    fit: result.fit_score,
    fitMultiplier,
    fitPart,
    rows: breakdownRows(result.adjustments, scoring),
    preferencePart: result.total_score - fitPart,
    scoring,
    total: result.total_score,
  }
}

/** Rows in the order the Match face lists them: heaviest rows first
 *  (Important before Nice to have), then most points earned, then grid order. */
export function rowsByWeight(rows: BreakdownRow[]): BreakdownRow[] {
  return rows
    .map((r, i) => ({ r, i }))
    .sort((x, y) => y.r.possible - x.r.possible || y.r.earned - x.r.earned || x.i - y.i)
    .map(({ r }) => r)
}

/** 0.92, 0.8, 1 — the Fit multiplier without trailing zeros. */
export function formatMultiplier(m: number): string {
  return String(Math.round(m * 100) / 100)
}

/** Points earned/possible, rounded to two decimals: 3, 1.5, 0.9, 2.25. */
export function formatPoints(p: number): string {
  return String(Math.round(p * 100) / 100)
}

/** "3 of 3 pts", "1.5 of 3 pts", "not counted" — one row's own points. */
export function rowPointsLabel(r: BreakdownRow): string {
  return r.adjustment.outcome === 'not_applicable' ? 'not counted' : `${formatPoints(r.earned)} of ${formatPoints(r.possible)} pts`
}

/** Preferences' share of the score, as a whole percent (8%, 20%). */
export function preferencePercent(s: Scoring): string {
  return `${Math.round(s.weight * 100)}%`
}

/** A preferences-only result's score (spec §11), from the stored scoring:
 *  "Meets 23 of 46 preference points (50%)", or compact "Meets 23 of 46 pts
 *  (50%)" for card rank strips, where the full form doesn't fit. */
export function preferenceScoreLabel(
  result: Pick<PreferenceMatchResult, 'scoring' | 'total_score'>,
  opts: { compact?: boolean } = {},
): string {
  const { earned, possible } = result.scoring
  if (possible === 0) return 'No preferences apply'
  const pts = `Meets ${formatPoints(earned)} of ${formatPoints(possible)}`
  return opts.compact ? `${pts} pts (${result.total_score}%)` : `${pts} preference points (${result.total_score}%)`
}
