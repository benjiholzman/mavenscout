import { EMPTY_FILTERS, type FilterState, type SearchMode } from '../filters'
import {
  ALWAYS_PRESENT_KINDS,
  type ExtractedTag,
  type ExtractedValue,
  type Level,
  type Requirement,
  type RequirementKind,
  type RequirementOf,
  type RequirementSource,
  type RequirementValueByKind,
  type TagValue,
} from '../matching/types'

// ============================================================================
// The shared requirements state (docs/MavenScout-match-rework.md §2.1, §3).
//
// One list of Requirement rows is the single source of truth for both the
// directory filter bar and the ranking panel's grid. The filter bar is just
// the view of the Required rows: mustHavesToFilterState() derives the
// FilterState it renders (and that applyFilters evaluates), and
// applyFilterStateToRequirements() writes a filter-bar change back as rows.
//
// A row only exists once it's added — from the grid's add chips, from a JD
// suggestion, or by setting a filter (which creates a Required row). Removing
// a row means "no preference". Outside ranking mode only Required rows ever
// exist, so the directory filters exactly as before.
//
// Semantics carried over from the filter bar:
// - Several Required rows of the same kind (expertise, skill) mean "any of"
//   (OR), like selecting several items in one filter dropdown. Different kinds
//   combine with AND.
// - Org History has no filter-bar control; its Required row is evaluated in
//   mustHaves.ts and shown as a chip at the end of the filter bar.
// ============================================================================

export interface SearchState {
  term: string
  mode: SearchMode
}

export const EMPTY_SEARCH: SearchState = { term: '', mode: 'names' }

/** Taxonomy level of a selected name, so a filter-bar selection can become a
 *  typed expertise/skill row. Usually backed by TaxonomyTree.categoryNames. */
export type TagLevelOf = (kind: 'expertise' | 'skill', name: string) => TagValue['level']

export type TagKind = 'expertise' | 'skill'
export type SingleKind = (typeof ALWAYS_PRESENT_KINDS)[number]

/** Multi-select kinds and the FilterState field each one is shown in. */
const VALUES_FIELDS = {
  location: 'locations',
  language: 'languages',
  type: 'types',
  career_level: 'careerLevels',
  work_arrangement: 'workArrangements',
} as const satisfies Partial<Record<RequirementKind, keyof FilterState>>

const TAG_FIELDS = { expertise: 'expertise', skill: 'skills' } as const satisfies Record<
  TagKind,
  keyof FilterState
>

const isTagKind = (kind: RequirementKind): kind is TagKind => kind === 'expertise' || kind === 'skill'

// ---- construction ---------------------------------------------------------

let idCounter = 0
/** Ids for expertise/skill rows. Single-instance rows use their kind as their
 *  id, since there's at most one of each. */
export function newRequirementId(kind: RequirementKind): string {
  idCounter += 1
  return `${kind}-${Date.now().toString(36)}-${idCounter.toString(36)}`
}

export function defaultValue<K extends RequirementKind>(kind: K): RequirementValueByKind[K] {
  const defaults: { [P in RequirementKind]: () => RequirementValueByKind[P] } = {
    expertise: () => ({ name: '', level: 'item' }),
    skill: () => ({ name: '', level: 'item' }),
    org_history: () => ({ org: '', scope: 'ever', peers: [] }),
    location: () => ({ values: [] }),
    language: () => ({ values: [] }),
    type: () => ({ values: [] }),
    availability: () => ({ engagement: 'either', fromMonth: null, untilMonth: null }),
    career_level: () => ({ values: [] }),
    verified: () => ({}),
    work_arrangement: () => ({ values: [] }),
  }
  return defaults[kind]()
}

/** A new row. Single-instance kinds get their kind as id; expertise/skill rows
 *  get a fresh id. Rows added in the grid start at Nice to have. */
export function makeRow<K extends RequirementKind>(
  kind: K,
  value: RequirementValueByKind[K] = defaultValue(kind),
  opts: { level?: Level; source?: RequirementSource } = {},
): Requirement {
  return {
    id: isTagKind(kind) ? newRequirementId(kind) : kind,
    kind,
    level: opts.level ?? 'slight',
    source: opts.source ?? 'manual',
    value,
  } as Requirement
}

/** No rows: no preferences, nothing required (spec §3). */
export function defaultRequirements(): Requirement[] {
  return []
}

/** Keeps at most one row per single-instance kind and puts rows in display
 *  order: expertise/skill rows first, then single-instance rows in their
 *  canonical order. Used when hydrating persisted requirements. */
export function normalizeRequirements(reqs: Requirement[]): Requirement[] {
  const tags = reqs.filter((r) => isTagKind(r.kind))
  const singles = ALWAYS_PRESENT_KINDS.map((k) => reqs.find((r) => r.kind === k)).filter(
    (r): r is Requirement => !!r,
  )
  return [...tags, ...singles]
}

// ---- reading ----------------------------------------------------------------

export function isMust(r: Requirement): boolean {
  return r.level === 'must'
}

/** Required rows → the FilterState the filter bar shows and applyFilters
 *  evaluates. Org History is skipped (no filter-bar control; see mustHaves.ts). */
export function mustHavesToFilterState(reqs: Requirement[], search: SearchState): FilterState {
  const f: FilterState = {
    ...EMPTY_FILTERS,
    types: [],
    expertise: [],
    skills: [],
    careerLevels: [],
    workArrangements: [],
    locations: [],
    languages: [],
    searchTerm: search.term,
    searchMode: search.mode,
  }
  for (const r of reqs) {
    if (!isMust(r)) continue
    switch (r.kind) {
      case 'expertise':
        f.expertise.push(r.value.name)
        break
      case 'skill':
        f.skills.push(r.value.name)
        break
      case 'location':
      case 'language':
      case 'type':
      case 'career_level':
      case 'work_arrangement':
        f[VALUES_FIELDS[r.kind]] = [...r.value.values]
        break
      case 'availability':
        f.availability = { ...r.value }
        break
      case 'verified':
        f.verifiedOnly = true
        break
      case 'org_history':
        break
    }
  }
  return f
}

/** An Org History row only constrains anything once it names an organization. */
export function isActiveOrgRow(r: Requirement): r is RequirementOf<'org_history'> {
  return r.kind === 'org_history' && r.value.org.trim() !== ''
}

/** Required rows the filter bar can't show — today just Org History.
 *  Rendered as "+1 required: Org history" chips (spec §2.1). */
export function gridOnlyMustHaves(reqs: Requirement[]): RequirementOf<'org_history'>[] {
  return reqs.filter((r): r is RequirementOf<'org_history'> => isMust(r) && isActiveOrgRow(r))
}

/** False for a row that can't constrain or score anything yet (e.g. Location
 *  with no places chosen, Org History with no name). */
export function rowHasValue(r: Requirement): boolean {
  switch (r.kind) {
    case 'expertise':
    case 'skill':
      return r.value.name !== ''
    case 'org_history':
      return r.value.org.trim() !== ''
    case 'location':
    case 'language':
    case 'type':
    case 'career_level':
    case 'work_arrangement':
      return r.value.values.length > 0
    case 'availability':
    case 'verified':
      return true
  }
}

export function tagRowCount(reqs: Requirement[]): number {
  return reqs.filter((r) => isTagKind(r.kind)).length
}

// ---- writing from the filter bar -------------------------------------------

/**
 * Writes a filter-bar change back into the rows:
 * - a filter that's set creates that kind's Required row, or makes the
 *   existing row Required with the filter's value;
 * - a filter that's cleared deletes its Required row (no row = no preference);
 * - selecting an expertise/skill that already exists as a Nice to have /
 *   Important row raises that row to Required rather than duplicating it.
 * Rows below Required are otherwise untouched (the filter bar never shows
 * them). The 10-row cap on expertise/skill applies to the grid, not here, so
 * the filter bar keeps working exactly as it always has.
 */
export function applyFilterStateToRequirements(
  reqs: Requirement[],
  next: FilterState,
  tagLevelOf: TagLevelOf,
): { requirements: Requirement[]; search: SearchState } {
  let rows = [...reqs]

  const setSingle = (kind: SingleKind, wanted: Requirement['value'] | null) => {
    const existing = rows.find((r) => r.kind === kind)
    if (wanted) {
      if (existing) rows = rows.map((r) => (r === existing ? withMust(r, wanted) : r))
      else rows.push(makeRow(kind, wanted as never, { level: 'must', source: 'filter' }))
    } else if (existing && isMust(existing)) {
      rows = rows.filter((r) => r !== existing)
    }
  }

  for (const kind of Object.keys(VALUES_FIELDS) as (keyof typeof VALUES_FIELDS)[]) {
    const values = next[VALUES_FIELDS[kind]]
    setSingle(kind, values.length > 0 ? { values: [...values] } : null)
  }
  setSingle('availability', next.availability ? { ...next.availability } : null)
  setSingle('verified', next.verifiedOnly ? {} : null)

  for (const kind of ['expertise', 'skill'] as const) {
    const wanted = next[TAG_FIELDS[kind]]
    // Drop Required rows whose selection was removed in the filter bar.
    rows = rows.filter((r) => !(r.kind === kind && isMust(r) && !wanted.includes(r.value.name)))
    for (const name of wanted) {
      const existing = rows.find((r): r is RequirementOf<TagKind> => r.kind === kind && r.value.name === name)
      if (existing) {
        if (!isMust(existing)) rows = rows.map((r) => (r === existing ? { ...existing, level: 'must' } : r))
        continue
      }
      rows.push(makeRow(kind, { name, level: tagLevelOf(kind, name) }, { level: 'must', source: 'filter' }))
    }
  }

  return { requirements: rows, search: { term: next.searchTerm, mode: next.searchMode } }
}

/** Sets a row to Required with a new value. A row that wasn't already
 *  Required arrives "from filters". */
function withMust(r: Requirement, value: Requirement['value']): Requirement {
  const source: RequirementSource = isMust(r) ? r.source : 'filter'
  return { ...r, level: 'must', source, value } as Requirement
}

/** Clear All in the filter bar: deletes every Required row (Org History
 *  included) and the search term, keeping Nice to have / Important rows. */
export function clearMustHaves(reqs: Requirement[]): Requirement[] {
  return reqs.filter((r) => !isMust(r))
}

/** Clear in the ranking banner: the preference rows go, the Required rows
 *  stay on as plain filters (spec §2.2). */
export function dropPreferences(reqs: Requirement[]): Requirement[] {
  return reqs.filter(isMust)
}

// ---- JD suggestions → grid (spec §2 Step 2, §4) ----------------------------

export type Suggestion =
  | { kind: TagKind; tag: ExtractedTag }
  | { kind: 'location' | 'language'; item: ExtractedValue }

/** True when the suggestion is already in the grid (in any row, any level). */
export function isSuggestionAdded(reqs: Requirement[], s: Suggestion): boolean {
  if ('tag' in s) return reqs.some((r) => isTagKind(r.kind) && r.kind === s.kind && (r.value as TagValue).name === s.tag.name)
  return reqs.some(
    (r) => (r.kind === 'location' || r.kind === 'language') && r.kind === s.kind && r.value.values.includes(s.item.value),
  )
}

/** A location/language suggestion can't join that kind's row while the row is
 *  Required: adding a value would silently widen a filter the manager set. */
export function isSuggestionBlocked(reqs: Requirement[], s: Suggestion): boolean {
  if ('tag' in s || isSuggestionAdded(reqs, s)) return false
  return reqs.some((r) => r.kind === s.kind && isMust(r))
}

/**
 * Adds one "Found in your JD" suggestion, at Nice to have, tagged "from JD".
 * Expertise/skill suggestions become their own row (respecting the combined
 * row cap). A location or language joins that kind's single row — created at
 * Nice to have if there isn't one; an existing Nice to have / Important row
 * keeps its level, and a Required row is never changed by a suggestion.
 */
export function addSuggestion(reqs: Requirement[], s: Suggestion, maxTagRows: number): Requirement[] {
  if (isSuggestionAdded(reqs, s) || isSuggestionBlocked(reqs, s)) return reqs
  if ('tag' in s) {
    if (tagRowCount(reqs) >= maxTagRows) return reqs
    return [...reqs, makeRow(s.kind, { name: s.tag.name, level: s.tag.level }, { source: 'jd' })]
  }
  const existing = reqs.find((r): r is RequirementOf<'location' | 'language'> => r.kind === s.kind)
  if (existing)
    return reqs.map((r) =>
      r === existing ? { ...existing, value: { values: [...existing.value.values, s.item.value] } } : r,
    )
  return [...reqs, makeRow(s.kind, { values: [s.item.value] }, { source: 'jd' })]
}

// ---- after a run (spec §2.2) ------------------------------------------------

const byId = (a: Requirement, b: Requirement) => a.id.localeCompare(b.id)

/** JSON with object keys sorted. Rows round-trip through Postgres jsonb, which
 *  reorders keys, so plain JSON.stringify would see changes that aren't there. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`)
      .join(',')}}`
  return JSON.stringify(value)
}

/** Order-insensitive equality of two row lists. */
export function sameRows(a: Requirement[], b: Requirement[]): boolean {
  return stableJson([...a].sort(byId)) === stableJson([...b].sort(byId))
}

/** A stable key for the rows that adjust the score (Nice to have /
 *  Important, with a value). If it differs from the run's, the ranking is
 *  stale and the manager is offered a re-run. */
export function preferenceKey(reqs: Requirement[]): string {
  return stableJson(
    reqs
      .filter((r) => !isMust(r) && rowHasValue(r))
      .sort(byId)
      .map((r) => ({ id: r.id, kind: r.kind, level: r.level, value: r.value })),
  )
}

/** What a run stores after Required rows change: the current Required rows
 *  (so a reload keeps a tightening) plus the preference rows the results were
 *  scored with (so the stored snapshot still matches the scores). */
export function withRunPreferences(current: Requirement[], runRows: Requirement[]): Requirement[] {
  const musts = current.filter(isMust)
  const mustIds = new Set(musts.map((r) => r.id))
  return [...musts, ...runRows.filter((r) => !isMust(r) && !mustIds.has(r.id))]
}
