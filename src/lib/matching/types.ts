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

/** How much a row matters. 'must' rows pre-filter the pool and add no points;
 *  'slight'/'strong' rows adjust the score; 'none' rows are ignored. */
export type Level = 'none' | 'slight' | 'strong' | 'must'
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

/** Rows that are always in the grid, in display order (spec §3.1). */
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
  suggested: PreferenceLevel
}

/** What the engine read from the JD. Extraction never suggests 'must', and
 *  hiring_organization only fills the Org History row's name (its level stays
 *  'none'). Persisted on job_descriptions.extracted. */
export interface ExtractedRequirements {
  expertise: ExtractedTag[]
  skills: ExtractedTag[]
  locations: string[] // suggested at 'slight'
  languages: string[] // suggested at 'slight'
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
  points: number // signed, after credit, before the cap
  detail: string // e.g. "Tagged as secondary expertise"; org: "Same org" / "Peer org: ADB"
}

export interface MatchResult {
  profile_id: string
  rank: number
  total_score: number // 0–100, after cap and clamp
  band: Band
  fit_score: number // 0–100
  adjustments: Adjustment[]
  adjustments_capped: boolean
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
