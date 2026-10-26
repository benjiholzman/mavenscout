import type { Band, PreferenceLevel } from './types'

// ============================================================================
// Matching config: every tunable number for ranking lives here
// (docs/MavenScout-match-rework.md §0). All values are TUNABLE: change them
// here and nowhere else. The placeholder engine and the ranking UI both read
// from this file.
// ============================================================================

// ---- Preference adjustments (spec §5.3) ------------------------------------

/** Points a Nice to have or Important row is worth: what it earns when met,
 *  and what it adds to the points possible. Partial outcomes earn points ×
 *  credit; not met earns 0; not applicable rows count toward neither. The
 *  priorities modal tells managers "Nice to have counts 1×, Important 3×", so
 *  keep the ratio in step with that copy. TUNABLE. */
export const PREFERENCE_POINTS: Record<PreferenceLevel, number> = {
  slight: 1,
  strong: 3,
}

/** Credit multipliers for met and partial outcomes (profiles-membership §6,
 *  amending match rework §3.3). A row takes the better of its tag credit and
 *  its text credit, so an untagged mention never outscores a tag. TUNABLE. */
export const CREDIT = {
  /** Tagged as Core expertise → met. */
  core: 1,
  /** Tagged as Strong → met. */
  strong: 0.75,
  /** Tagged as Working knowledge → partial. */
  working: 0.4,
  /** Not tagged, but the item appears in bio / portfolio / accreditations → partial. */
  textEvidence: 0.4,
  /** Any other partial: availability within the grace window, a language at
   *  Working level when Fluent is asked. */
  otherPartial: 0.5,
  /** Not tagged or mentioned, but tagged with another item in the same
   *  expertise group (e.g. asked Nutrition, holds Community Health). */
  sameGroup: 0.3,
  /** Career level one step from the one asked (Senior asked, Mid-career). */
  adjacentCareerLevel: 0.4,
  /** Worked at a peer organization (same type on the canonical list) when
   *  the row counts peers. A Must have row with peers admits this too. */
  peerOrg: 0.6,
  /** Location: in the parent area of the place asked (same country as the
   *  city, same region as the country, same continent as the region). Not
   *  for a continent, which has no parent. */
  locationParent: 0.5,
  /** Location: on the same continent, further away than the parent area. */
  locationContinent: 0.2,
} as const

/** In a job-description run, each preference point possible is worth this
 *  many percent of the score, up to PREFERENCE_CAP_POINTS percent. TUNABLE.
 *  Spec §5.3, rescaled for the 1 / 3 point values:
 *    w = min(possible × PREFERENCE_PERCENT_PER_POINT, PREFERENCE_CAP_POINTS) / 100
 *    total = (1 − w) × Fit + 100 × w × (earned ÷ possible)
 *  so one Nice to have row is worth 2.5% of the score, one Important row
 *  7.5%, and preferences reach 20% at 8+ points possible. With no applicable
 *  preference rows, w = 0 and total = Fit. Preferences-only runs ignore this:
 *  their score is earned ÷ possible. */
export const PREFERENCE_PERCENT_PER_POINT = 2.5

/** The most preferences can weigh in a job-description run, in percent of
 *  the score. TUNABLE. */
export const PREFERENCE_CAP_POINTS = 20

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

/** Max expertise suggestions read from a JD. TUNABLE. */
export const MAX_TAG_ROWS = 10

/** Priorities modal limits: expertise items, languages and employers a
 *  manager can pick. The filter bar's own Must haves aren't capped. TUNABLE. */
export const MAX_EXPERTISE_PRIORITIES = 5
export const MAX_LANGUAGE_PRIORITIES = 3
export const MAX_EMPLOYER_PRIORITIES = 3

/** Below this many candidates meeting the must-haves, the panel warns. TUNABLE. */
export const LOW_POOL_WARNING = 5

/** Delay before the live must-have count recomputes, in ms. TUNABLE. */
export const LIVE_COUNT_DEBOUNCE_MS = 250

// ---- Placeholder extraction (spec §4) --------------------------------------

/** A taxonomy term found this many times or more in the JD is suggested at
 *  Strong; fewer → Slight. TUNABLE. */
export const EXTRACTION_STRONG_MIN_OCCURRENCES = 2

// ---- Placeholder Fit (spec §5.2) -------------------------------------------

/** Internal blend of the placeholder Fit: demonstrated experience vs.
 *  expertise tags. 5 : 6 keeps the old 5/3/3 ratio now that expertise and
 *  skills are one list. Not exposed to managers. TUNABLE. */
export const FIT_BLEND = {
  evidence: 5,
  expertise: 6,
} as const

/** Tag coverage in the placeholder Fit is full once the matched weight of
 *  the JD's expertise terms reaches this many Strong terms (the old lists
 *  each saturated at 2), so a focused specialist isn't penalised for not
 *  tagging everything a long JD mentions. TUNABLE. */
export const TAG_COVERAGE_SATURATION = 4

/** Placeholder Fit calibration. TUNABLE.
 *  - salientTerms: how many of the JD's most frequent terms the evidence is
 *    matched against (stops long JDs from saturating every score).
 *  - steepness: the raw 0–1 blend maps to
 *    100 × (1 − e^(−steepness × raw)) / (1 − e^(−steepness)).
 *  Tuned against a sample M&E ToR and the 15 seeded profiles: clearly
 *  on-topic profiles land at Fit 75–77, related ones ~55, unrelated 13–37,
 *  leaving headroom for the +20 preference cap (2.5 pushed the top four to
 *  Fit 84 and a clamped 100 total, tied). */
export const FIT_CALIBRATION = {
  salientTerms: 40,
  steepness: 1.5,
}

// ---- Availability (spec §3.1) ----------------------------------------------

/** Available within this many months (about 31 days) after the target →
 *  partial. TUNABLE. */
export const AVAILABILITY_GRACE_MONTHS = 1

// ---- Placeholder narrative (spec §6.2) -------------------------------------

/** Fit at or above `strong` is described as strong overlap, at or above
 *  `moderate` as moderate, otherwise limited. TUNABLE. */
export const NARRATIVE_FIT_WORDS = { strong: 70, moderate: 50 } as const
