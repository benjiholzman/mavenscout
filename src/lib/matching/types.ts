import type { AvailabilityFilter } from '../filters'
import type { Profile, TaxonomyCategory, TaxonomyItem } from '../../types/db'

// ============================================================================
// Matching contract (docs/MavenScout-match-rework.md §6.1).
//
// The UI talks to the engine ONLY through these types and the two entry points
// at the bottom of this file. Today a placeholder implements them; Loop8's
// engine replaces the implementation without touching the UI.
// ============================================================================

// ---- Requirements (the grid rows) --------------------------------------------

/** How much a row matters. Shown to managers as Nice to have / Important /
 *  Required. 'must' rows pre-filter the pool and add no points; 'slight' and
 *  'strong' rows adjust the score. There is no "no preference" level: a row
 *  only exists once it's added, and removing it means no preference. */
export type Level = 'slight' | 'strong' | 'must'
export type PreferenceLevel = 'slight' | 'strong'

export type RequirementKind =
  | 'expertise'
  | 'skill'
  | 'org_history'
  | 'location'
  | 'language'
  | 'type'
  | 'availability'
  | 'career_level'
  | 'verified'
  | 'work_arrangement'

/** Where a row came from: the JD extraction, a filter-bar control, or the
 *  manager adding it in the grid. Shown as the row's source tag. */
export type RequirementSource = 'jd' | 'filter' | 'manual'

export type OrgScope = 'current' | 'ever' | 'ever_or_peer'

export interface OrgHistoryValue {
  org: string
  scope: OrgScope
  /** Peer organizations, used only with scope 'ever_or_peer'. Empty in the
   *  placeholder unless the manager adds names; the real engine suggests them. */
  peers: string[]
}

/** One taxonomy category or item (expertise and skill rows). */
export interface TagValue {
  name: string
  level: 'category' | 'item'
}

/** A multi-select value ("any of"). Location values use the filter's own
 *  format — a bare country ("Kenya") or a full "City, Country" string.
 *  Career level values are the stored ones: 'early_career' | 'mid_career' |
 *  'senior'. Branch 2 swaps the location and language pickers, not this shape. */
export interface ValuesValue {
  values: string[]
}

export interface RequirementValueByKind {
  expertise: TagValue
  skill: TagValue
  org_history: OrgHistoryValue
  location: ValuesValue
  language: ValuesValue
  type: ValuesValue
  /** Same shape as the filter bar's availability filter, so the two stay one
   *  state. "Available by [month]" in the grid edits untilMonth. */
  availability: AvailabilityFilter
  career_level: ValuesValue
  verified: Record<string, never>
  work_arrangement: ValuesValue
}

export type RequirementValue = RequirementValueByKind[RequirementKind]

/** A grid row. Discriminated by `kind`, so `value` narrows with it. */
export type Requirement = {
  [K in RequirementKind]: {
    id: string
    kind: K
    level: Level
    source: RequirementSource
    value: RequirementValueByKind[K]
  }
}[RequirementKind]

export type RequirementOf<K extends RequirementKind> = Extract<Requirement, { kind: K }>

/** Single-instance rows ("Other requirements"), in display order (spec §3.1).
 *  None exist until the manager adds one (or sets its filter); there's at most
 *  one of each. */
export const ALWAYS_PRESENT_KINDS = [
  'org_history',
  'location',
  'language',
  'type',
  'availability',
  'career_level',
  'verified',
  'work_arrangement',
] as const satisfies readonly RequirementKind[]

/** Rows added from the JD or with "+ Add expertise" / "+ Add skill" (§3.2). */
export const ADDABLE_KINDS = ['expertise', 'skill'] as const satisfies readonly RequirementKind[]

// ---- Extraction (spec §4) -----------------------------------------------------

export interface ExtractedTag extends TagValue {
  /** How strongly the JD leans on it (feeds the placeholder Fit). The grid
   *  always adds a suggestion at Nice to have; the manager adjusts. */
  suggested: PreferenceLevel
  /** How many times the JD mentions it — shown on the suggestion chip. */
  mentions: number
}

export interface ExtractedValue {
  value: string // a location filter value or a language
  mentions: number
}

/** What the engine read from the JD. These are SUGGESTIONS: nothing is added
 *  to the grid until the manager adds it, and extraction never suggests
 *  Required. Persisted on job_descriptions.extracted. */
export interface ExtractedRequirements {
  expertise: ExtractedTag[]
  skills: ExtractedTag[]
  locations: ExtractedValue[]
  languages: ExtractedValue[]
  hiring_organization: string | null
}

export interface ExtractionContext {
  taxonomy: { categories: TaxonomyCategory[]; items: TaxonomyItem[] }
  /** Known location filter values: country names and "City, Country" strings. */
  locationOptions: string[]
  languageOptions: string[]
}

// ---- Results (spec §6.1) ------------------------------------------------------

export type Outcome = 'met' | 'partial' | 'not_met' | 'not_applicable'
export type Band = 'strong' | 'good' | 'partial' | 'weak'

/** One Slight/Strong row's effect on the score. */
export interface Adjustment {
  requirement_id: string
  label: string // e.g. "Based in Kenya"
  level: PreferenceLevel
  outcome: Outcome
  points: number // earned: PREFERENCE_POINTS[level] × credit when met/partial, else 0
  detail: string // e.g. "Tagged as secondary expertise"; org: "Same org" / "Peer org: ADB"
}

/** How preferences were weighed for one result (spec §5.3). Stored with the
 *  result so a saved run displays the same build-up if config changes. */
export interface Scoring {
  /** w = min(possible, PREFERENCE_CAP_POINTS) / 100; 0 when no applicable rows. */
  weight: number
  /** Σ points earned by applicable Nice to have / Important rows. */
  earned: number
  /** Σ full points of those rows (not-applicable rows excluded). */
  possible: number
}

export interface MatchResult {
  profile_id: string
  rank: number
  total_score: number // 0–100: round((1 − w) × fit_score + 100 × w × earned ÷ possible)
  band: Band
  fit_score: number // 0–100
  adjustments: Adjustment[]
  scoring: Scoring
  must_haves_passed: { requirement_id: string; label: string }[]
  narrative: string // ~100 words, PLACEHOLDER template
}

// ---- Engine entry points (placeholder now, Loop8 later) ------------------------

/** Reads the JD once and suggests grid rows. */
export type ExtractRequirementsFn = (
  jdText: string,
  ctx: ExtractionContext,
) => Promise<ExtractedRequirements>

/** Scores a pool that has already passed the must-haves. Receives the stored
 *  JD by id plus the requirements, never the full JD text per candidate. */
export type RankPoolFn = (
  jobDescriptionId: string,
  requirements: Requirement[],
  pool: Profile[],
) => Promise<MatchResult[]>
