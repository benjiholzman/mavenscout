import type { Band, PreferenceLevel } from './types'

// ============================================================================
// Matching config: every tunable number for ranking lives here
// (docs/MavenScout-match-rework.md §0). All values are TUNABLE: change them
// here and nowhere else. The placeholder engine and the ranking UI both read
// from this file.
// ============================================================================

// ---- Preference adjustments (spec §5.3) ------------------------------------

/** Points a Slight or Strong row adds when it's met. Partial outcomes earn
 *  points × credit; not met and not applicable earn 0. TUNABLE. */
export const PREFERENCE_POINTS: Record<PreferenceLevel, number> = {
  slight: 3,
  strong: 8,
}

/** Credit multipliers for met and partial outcomes (spec §3.3). TUNABLE. */
export const CREDIT = {
  /** Tagged as the requested item (or category), primary tier → met. */
  primaryTag: 1,
  /** Tagged as the requested item (or category), secondary tier → met. */
  secondaryTag: 0.75,
  /** Requested an item; candidate tagged only its parent category → partial. */
  parentTag: 0.5,
  /** Not tagged, but the term appears in bio / portfolio / accreditations → partial. */
  textEvidence: 0.5,
  /** Any other partial: peer org, availability within the grace window. */
  otherPartial: 0.5,
} as const

/** Cap on the total POSITIVE adjustment. Preferences reorder close candidates;
 *  they can't lift a weak Fit past a strong one by more than this. TUNABLE. */
export const ADJUSTMENT_CAP = 20

// ---- Bands (spec §5.4) -----------------------------------------------------

/** Minimum total score for each band, checked from the top. TUNABLE. */
export const BAND_THRESHOLDS: { band: Band; min: number }[] = [
  { band: 'strong', min: 80 },
  { band: 'good', min: 65 },
  { band: 'partial', min: 50 },
  { band: 'weak', min: 0 },
]

export const BAND_LABELS: Record<Band, string> = {
  strong: 'Strong match',
  good: 'Good match',
  partial: 'Partial match',
  weak: 'Weak match',
}

export function bandFor(totalScore: number): Band {
  return (BAND_THRESHOLDS.find((t) => totalScore >= t.min) ?? BAND_THRESHOLDS[BAND_THRESHOLDS.length - 1]).band
}

// ---- Job description input (spec §2, Step 1) -------------------------------

/** Character limits for the pasted JD. TUNABLE. */
export const JD_MIN_CHARS = 200
export const JD_MAX_CHARS = 15_000

// ---- Requirements grid (spec §2, §3.2) -------------------------------------

/** Max expertise + skill rows combined, from the JD and added by hand. TUNABLE. */
export const MAX_TAG_ROWS = 10

/** Below this many candidates meeting the must-haves, the panel warns. TUNABLE. */
export const LOW_POOL_WARNING = 5

/** Delay before the live must-have count recomputes, in ms. TUNABLE. */
export const LIVE_COUNT_DEBOUNCE_MS = 250

// ---- Placeholder extraction (spec §4) --------------------------------------

/** A taxonomy term found this many times or more in the JD is suggested at
 *  Strong; fewer → Slight. TUNABLE. */
export const EXTRACTION_STRONG_MIN_OCCURRENCES = 2

// ---- Placeholder Fit (spec §5.2) -------------------------------------------

/** Internal blend of the placeholder Fit: demonstrated experience vs. expertise
 *  tags vs. skill tags, at the old 5/3/3 ratio. Not exposed to managers. TUNABLE. */
export const FIT_BLEND = {
  evidence: 5,
  expertise: 3,
  skills: 3,
} as const

/** Placeholder Fit calibration. TUNABLE — set in Stage 4 against a sample JD so
 *  a clearly on-topic profile lands ≥ 70 instead of clustering in the 40s.
 *  - salientTerms: how many of the JD's most frequent terms the evidence is
 *    matched against (stops long JDs from saturating every score).
 *  - steepness: the raw 0–1 blend maps to 100 × (1 − e^(−steepness × raw)). */
export const FIT_CALIBRATION = {
  salientTerms: 40,
  steepness: 2.5,
} as const

// ---- Availability (spec §3.1) ----------------------------------------------

/** Available within this many months after the target → partial. TUNABLE. */
export const AVAILABILITY_GRACE_MONTHS = 1
