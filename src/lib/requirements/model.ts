import { EMPTY_FILTERS, type FilterState, type SearchMode } from '../filters'
import {
  ALWAYS_PRESENT_KINDS,
  type ExtractedRequirements,
  type ExtractedTag,
  type Level,
  type Requirement,
  type RequirementKind,
  type RequirementOf,
  type RequirementSource,
  type RequirementValueByKind,
  type TagValue,
} from '../matching/types'

// ============================================================================
// The shared requirements state (docs/MavenScout-match-rework.md §2.1).
//
// One list of Requirement rows is the single source of truth for both the
// directory filter bar and the ranking panel's grid. The filter bar is just
// the view of the Must-have rows: mustHavesToFilterState() derives the
// FilterState it renders (and that applyFilters evaluates), and
// applyFilterStateToRequirements() writes a filter-bar change back as rows.
// Outside ranking mode only Must-have rows ever exist, so the directory
// filters exactly as before.
//
// Semantics carried over from the filter bar:
// - Several Must-have rows of the same kind (expertise, skill) mean "any of"
//   (OR), like selecting several items in one filter dropdown. Different kinds
//   combine with AND.
// - Org History has no filter-bar control; its Must-have is evaluated in
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

const TAG_KINDS = ['expertise', 'skill'] as const
type TagKind = (typeof TAG_KINDS)[number]

/** Multi-select kinds and the FilterState field each one is shown in. */
const VALUES_FIELDS = {
  location: 'locations',
  language: 'languages',
  type: 'types',
  career_level: 'careerLevels',
  work_arrangement: 'workArrangements',
} as const satisfies Partial<Record<RequirementKind, keyof FilterState>>
type ValuesKind = keyof typeof VALUES_FIELDS

const TAG_FIELDS = { expertise: 'expertise', skill: 'skills' } as const satisfies Record<
  TagKind,
  keyof FilterState
>

// ---- construction ---------------------------------------------------------

let idCounter = 0
/** Ids for addable rows. Always-present rows use their kind as their id, since
 *  there's exactly one of each. */
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

function defaultRow(kind: RequirementKind): Requirement {
  return { id: kind, kind, level: 'none', source: 'manual', value: defaultValue(kind) } as Requirement
}

/** The eight always-present rows, all at No preference (spec §3.1). */
export function defaultRequirements(): Requirement[] {
  return ALWAYS_PRESENT_KINDS.map((kind) => defaultRow(kind))
}

/** Ensures every always-present row exists exactly once (in display order,
 *  ahead of addable rows). Used when hydrating persisted requirements. */
export function normalizeRequirements(reqs: Requirement[]): Requirement[] {
  const always = ALWAYS_PRESENT_KINDS.map(
    (kind) => reqs.find((r) => r.kind === kind) ?? defaultRow(kind),
  )
  const addable = reqs.filter((r) => r.kind === 'expertise' || r.kind === 'skill')
  return [...always, ...addable]
}

// ---- reading ----------------------------------------------------------------

export function isMust(r: Requirement): boolean {
  return r.level === 'must'
}

/** Must-have rows → the FilterState the filter bar shows and applyFilters
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

/** Must-have rows the filter bar can't show — today just Org History.
 *  Rendered as "+1 must-have: Org history" chips (spec §2.1). */
export function gridOnlyMustHaves(reqs: Requirement[]): RequirementOf<'org_history'>[] {
  return reqs.filter((r): r is RequirementOf<'org_history'> => isMust(r) && isActiveOrgRow(r))
}

// ---- writing from the filter bar -------------------------------------------

function resetRow(r: Requirement): Requirement {
  return defaultRow(r.kind)
}

/**
 * Writes a filter-bar change back into the rows:
 * - a filter that's set becomes (or updates) that kind's Must-have row;
 * - a filter that's cleared removes the Must-have: always-present rows reset to
 *   No preference, and addable expertise/skill rows are deleted;
 * - selecting an expertise/skill that already exists as a Slight/Strong row
 *   raises that row to Must-have rather than duplicating it.
 * Rows below Must-have are otherwise untouched (the filter bar never shows
 * them). The 10-row cap on expertise/skill applies to the grid, not here, so
 * the filter bar keeps working exactly as it always has.
 */
export function applyFilterStateToRequirements(
  reqs: Requirement[],
  next: FilterState,
  tagLevelOf: TagLevelOf,
): { requirements: Requirement[]; search: SearchState } {
  let rows = reqs.map((r): Requirement => {
    switch (r.kind) {
      case 'location':
      case 'language':
      case 'type':
      case 'career_level':
      case 'work_arrangement': {
        const values = next[VALUES_FIELDS[r.kind]]
        if (values.length > 0) return withMust(r, { values: [...values] })
        return isMust(r) ? resetRow(r) : r
      }
      case 'availability':
        if (next.availability) return withMust(r, { ...next.availability })
        return isMust(r) ? resetRow(r) : r
      case 'verified':
        if (next.verifiedOnly) return withMust(r, {})
        return isMust(r) ? resetRow(r) : r
      default:
        return r
    }
  })

  for (const kind of TAG_KINDS) {
    const wanted = next[TAG_FIELDS[kind]]
    // Drop Must-have rows whose selection was removed in the filter bar.
    rows = rows.filter((r) => !(r.kind === kind && isMust(r) && !wanted.includes(r.value.name)))
    for (const name of wanted) {
      const existing = rows.find(
        (r): r is RequirementOf<TagKind> => r.kind === kind && r.value.name === name,
      )
      if (existing) {
        if (!isMust(existing)) rows = rows.map((r) => (r === existing ? { ...existing, level: 'must' } : r))
        continue
      }
      rows.push({
        id: newRequirementId(kind),
        kind,
        level: 'must',
        source: 'filter',
        value: { name, level: tagLevelOf(kind, name) },
      })
    }
  }

  return { requirements: rows, search: { term: next.searchTerm, mode: next.searchMode } }
}

/** Sets a row to Must-have with a new value. A row that wasn't already a
 *  Must-have arrives "from filters". */
function withMust<R extends Requirement>(r: R, value: R['value']): R {
  const source: RequirementSource = isMust(r) ? r.source : 'filter'
  return { ...r, level: 'must' as Level, source, value }
}

/** Clear All in the filter bar: drops every Must-have (Org History included)
 *  and the search term, keeping Slight/Strong preference rows (spec §2.2). */
export function clearMustHaves(reqs: Requirement[]): Requirement[] {
  return reqs
    .filter((r) => !((r.kind === 'expertise' || r.kind === 'skill') && isMust(r)))
    .map((r): Requirement => {
      if (!isMust(r)) return r
      // Org History keeps its typed name and scope; it just stops being required.
      if (r.kind === 'org_history') return { ...r, level: 'none' }
      return resetRow(r)
    })
}

export function isValuesKind(kind: RequirementKind): kind is ValuesKind {
  return kind in VALUES_FIELDS
}

// ---- extraction → grid (spec §2 Step 2, §4) --------------------------------

export function tagRowCount(reqs: Requirement[]): number {
  return reqs.filter((r) => r.kind === 'expertise' || r.kind === 'skill').length
}

/**
 * Merges "Read job description" output into the grid:
 * - re-reading replaces the previous JD suggestions (JD-sourced rows the
 *   manager hasn't made Must-have);
 * - a suggestion that already exists as a row keeps that row as it is — in
 *   particular an existing Must-have stays a Must-have;
 * - new expertise/skill rows arrive at their suggested Slight/Strong level,
 *   tagged "from JD", up to the combined row cap;
 * - locations and languages fill their row at Slight unless the manager (or
 *   the filter bar) has already set that row;
 * - extraction never sets Must-have, and a found hiring organization only
 *   fills an empty Org History name (its level is left alone).
 */
export function mergeExtraction(
  reqs: Requirement[],
  extracted: ExtractedRequirements,
  maxTagRows: number,
): Requirement[] {
  // Drop earlier JD suggestions the manager hasn't promoted to Must-have.
  let rows = reqs.filter(
    (r) => !((r.kind === 'expertise' || r.kind === 'skill') && r.source === 'jd' && !isMust(r)),
  )
  rows = rows.map((r) => {
    if ((r.kind === 'location' || r.kind === 'language') && r.source === 'jd' && !isMust(r))
      return defaultRow(r.kind)
    return r
  })

  const suggestions: { kind: TagKind; tag: ExtractedTag }[] = [
    ...extracted.expertise.map((tag) => ({ kind: 'expertise' as const, tag })),
    ...extracted.skills.map((tag) => ({ kind: 'skill' as const, tag })),
  ]
  for (const { kind, tag } of suggestions) {
    const exists = rows.some((r) => r.kind === kind && r.value.name === tag.name)
    if (exists || tagRowCount(rows) >= maxTagRows) continue
    rows.push({
      id: newRequirementId(kind),
      kind,
      level: tag.suggested,
      source: 'jd',
      value: { name: tag.name, level: tag.level },
    })
  }

  const fill = (kind: 'location' | 'language', values: string[]) => {
    if (values.length === 0) return
    rows = rows.map((r) =>
      r.kind === kind && r.level === 'none' && r.value.values.length === 0
        ? { ...r, level: 'slight', source: 'jd', value: { values: [...values] } }
        : r,
    )
  }
  fill('location', extracted.locations)
  fill('language', extracted.languages)

  if (extracted.hiring_organization) {
    const org = extracted.hiring_organization
    rows = rows.map((r) =>
      r.kind === 'org_history' && r.value.org.trim() === '' ? { ...r, value: { ...r.value, org } } : r,
    )
  }
  return rows
}

/** False for a row that can't constrain or score anything yet (e.g. Location
 *  with no places chosen, Org History with no name, an empty taxonomy pick). */
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
