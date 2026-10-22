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
// Multi-value kinds (location, language, type, career level, work
// arrangement) may have TWO rows: one Required row (what the filter bar shows)
// and one preference row (Nice to have / Important) — e.g. Required: French
// plus Nice to have: English. Other single-instance kinds (availability,
// verified, org history) have at most one row.
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

export type ValuesKind = keyof typeof VALUES_FIELDS
export const isValuesKind = (kind: RequirementKind): kind is ValuesKind => kind in VALUES_FIELDS

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

/** A new row. Availability / verified / org history (one row at most) get
 *  their kind as id; expertise/skill and multi-value rows (which can have a
 *  Required and a preference row) get a fresh id. Rows added in the grid
 *  start at Nice to have. */
export function makeRow<K extends RequirementKind>(
  kind: K,
  value: RequirementValueByKind[K] = defaultValue(kind),
  opts: { level?: Level; source?: RequirementSource } = {},
): Requirement {
  return {
    id: isTagKind(kind) || isValuesKind(kind) ? newRequirementId(kind) : kind,
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

/** Enforces the row limits and puts rows in display order: expertise/skill
 *  rows first, then the other kinds in canonical order — for a multi-value
 *  kind, its Required row before its preference row. Extra rows beyond the
 *  limits are dropped, and a value lives in only one of a kind's two rows
 *  (see withoutRequiredValues). */
export function normalizeRequirements(reqs: Requirement[]): Requirement[] {
  const tags = reqs.filter((r) => isTagKind(r.kind))
  const singles = ALWAYS_PRESENT_KINDS.flatMap((k) => {
    const ofKind = reqs.filter((r) => r.kind === k)
    if (!isValuesKind(k)) return ofKind.slice(0, 1)
    return [ofKind.find(isMust), ofKind.find((r) => !isMust(r))].filter((r): r is Requirement => !!r)
  })
  return withoutRequiredValues([...tags, ...singles])
}

/**
 * A value lives in only one of a multi-value kind's two rows. The preference
 * row's picker can't select a value that's already Required ("already
 * required"); and when a value becomes Required (a filter, or the Required
 * row's own picker) it moves there — it's removed from the preference row,
 * which is dropped if nothing is left in it. This keeps a preference from
 * re-scoring what the Required row already guarantees.
 */
export function withoutRequiredValues(reqs: Requirement[]): Requirement[] {
  let rows = reqs
  for (const kind of Object.keys(VALUES_FIELDS) as ValuesKind[]) {
    const req = requiredRowOf(rows, kind)
    const pref = preferenceRowOf(rows, kind)
    if (!req || !pref || !('values' in req.value) || !('values' in pref.value)) continue
    const required = req.value.values
    const kept = pref.value.values.filter((v) => !required.includes(v))
    if (kept.length === pref.value.values.length) continue
    rows =
      kept.length === 0 && pref.value.values.length > 0
        ? rows.filter((r) => r !== pref)
        : rows.map((r) => (r === pref ? ({ ...pref, value: { ...pref.value, values: kept } } as Requirement) : r))
  }
  return rows
}

/** The Required row of a kind, and its preference row (multi-value kinds). */
export function requiredRowOf(reqs: Requirement[], kind: RequirementKind): Requirement | undefined {
  return reqs.find((r) => r.kind === kind && isMust(r))
}
export function preferenceRowOf(reqs: Requirement[], kind: RequirementKind): Requirement | undefined {
  return reqs.find((r) => r.kind === kind && !isMust(r))
}

/** Whether the grid's add chip for a kind should show: multi-value kinds can
 *  still get a preference row while only a Required row exists. */
export function canAddKind(reqs: Requirement[], kind: SingleKind): boolean {
  return isValuesKind(kind) ? !preferenceRowOf(reqs, kind) : !reqs.some((r) => r.kind === kind)
}

/** Adds a row unless it would break the limits (a second row of a
 *  single-instance kind, or a second Required / preference row of a
 *  multi-value kind). */
export function addRowChecked(reqs: Requirement[], row: Requirement): Requirement[] {
  if (reqs.some((r) => r.id === row.id)) return reqs
  if (!isTagKind(row.kind)) {
    const clash = isValuesKind(row.kind)
      ? reqs.some((r) => r.kind === row.kind && isMust(r) === isMust(row))
      : reqs.some((r) => r.kind === row.kind)
    if (clash) return reqs
  }
  return normalizeRequirements([...reqs, row])
}

const unionValues = (a: string[], b: string[]) => [...a, ...b.filter((v) => !a.includes(v))]

/**
 * Changes a row's level. For a multi-value kind, a level change that would
 * create a second Required (or second preference) row merges into the one
 * that's already there instead:
 * - raising the preference row to Required adds its values to the Required
 *   row (the manager is explicitly making them required);
 * - lowering the Required row adds its values to the preference row, which
 *   takes the chosen level.
 */
export function setRowLevel(reqs: Requirement[], id: string, level: Level): Requirement[] {
  const row = reqs.find((r) => r.id === id)
  if (!row || row.level === level) return reqs
  if (isValuesKind(row.kind) && isMust(row) !== (level === 'must')) {
    const other = level === 'must' ? requiredRowOf(reqs, row.kind) : preferenceRowOf(reqs, row.kind)
    if (other && other.id !== row.id && 'values' in other.value && 'values' in row.value) {
      const merged = {
        ...other,
        level: level === 'must' ? other.level : level,
        // The surviving row keeps its own settings (a language row's minimum).
        value: { ...other.value, values: unionValues(other.value.values, row.value.values) },
      } as Requirement
      return reqs.filter((r) => r.id !== row.id).map((r) => (r.id === other.id ? merged : r))
    }
  }
  return reqs.map((r) => (r.id === id ? ({ ...r, level } as Requirement) : r))
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
      case 'language':
        f.languages = [...r.value.values]
        f.languageLevel = r.value.min ?? 'working'
        break
      case 'location':
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
 * - a filter that's set creates that kind's Required row or updates it. For
 *   multi-value kinds the preference row (if any) is a separate row and is
 *   left alone; availability and verified (one row at most) turn their row
 *   Required;
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

  for (const kind of Object.keys(VALUES_FIELDS) as ValuesKind[]) {
    const values = next[VALUES_FIELDS[kind]]
    const required = requiredRowOf(rows, kind)
    if (values.length > 0) {
      const value = kind === 'language' ? { values: [...values], min: next.languageLevel } : { values: [...values] }
      if (required) rows = rows.map((r) => (r === required ? ({ ...r, value } as Requirement) : r))
      else rows.push(makeRow(kind, value, { level: 'must', source: 'filter' }))
    } else if (required) {
      rows = rows.filter((r) => r !== required)
    }
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

  return { requirements: normalizeRequirements(rows), search: { term: next.searchTerm, mode: next.searchMode } }
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

/** True when the suggestion is already in the grid (in any row, any level —
 *  e.g. a language that's already Required). */
export function isSuggestionAdded(reqs: Requirement[], s: Suggestion): boolean {
  if ('tag' in s) return reqs.some((r) => isTagKind(r.kind) && r.kind === s.kind && (r.value as TagValue).name === s.tag.name)
  return reqs.some(
    (r) => (r.kind === 'location' || r.kind === 'language') && r.kind === s.kind && r.value.values.includes(s.item.value),
  )
}

/**
 * Adds one "Found in your JD" suggestion, at Nice to have, tagged "from JD".
 * Expertise/skill suggestions become their own row (respecting the combined
 * row cap). A location or language goes to that kind's PREFERENCE row —
 * joining it (which keeps its level) or creating it at Nice to have. A
 * Required row is never touched, so a suggestion can't widen a filter.
 */
export function addSuggestion(reqs: Requirement[], s: Suggestion, maxTagRows: number): Requirement[] {
  if (isSuggestionAdded(reqs, s)) return reqs
  if ('tag' in s) {
    if (tagRowCount(reqs) >= maxTagRows) return reqs
    return [...reqs, makeRow(s.kind, { name: s.tag.name, level: s.tag.level }, { source: 'jd' })]
  }
  const pref = preferenceRowOf(reqs, s.kind) as RequirementOf<'location' | 'language'> | undefined
  if (pref)
    return reqs.map((r) =>
      r === pref ? ({ ...pref, value: { ...pref.value, values: [...pref.value.values, s.item.value] } } as Requirement) : r,
    )
  return normalizeRequirements([...reqs, makeRow(s.kind, { values: [s.item.value] }, { source: 'jd' })])
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
