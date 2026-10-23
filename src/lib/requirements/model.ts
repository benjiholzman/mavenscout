import { FIRMS_ENABLED } from '../config'
import {
  DEFAULT_AVAILABILITY,
  EMPTY_FILTERS,
  isDefaultAvailability,
  normalizeAvailability,
  type FilterState,
  type SearchMode,
} from '../filters'
import { orgTargets } from './match'
import {
  ALWAYS_PRESENT_KINDS,
  type ExtractedRequirements,
  type ExtractedTag,
  type ExtractedValue,
  type Level,
  type Requirement,
  type RequirementKind,
  type RequirementOf,
  type RequirementSource,
  type RequirementValueByKind,
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
// video Q&As, org history) have at most one row. "Video Q&As only"
// is Required only (isRequiredOnly): Featured membership never scores.
//
// Semantics carried over from the filter bar:
// - Several Required expertise rows follow the unified list's rule
//   (profiles-membership §6): OR within a kind (sector / theme / method), AND
//   across kinds, counting Core and Strong tags unless the manager includes
//   Working knowledge. Different requirement kinds combine with AND.
// - Org History's Required row at "Ever at" is the Previous employers filter
//   (several organizations = any of them). At another scope it has no
//   filter-bar control and shows as a chip at the end of the filter bar.
//   Either way it's evaluated in mustHaves.ts, with the organizations list.
// ============================================================================

export interface SearchState {
  term: string
  mode: SearchMode
}

export const EMPTY_SEARCH: SearchState = { term: '', mode: 'names' }

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

const isTagKind = (kind: RequirementKind): kind is 'expertise' => kind === 'expertise'

// ---- construction ---------------------------------------------------------

let idCounter = 0
/** Ids for expertise rows. Single-instance rows use their kind as their
 *  id, since there's at most one of each. */
export function newRequirementId(kind: RequirementKind): string {
  idCounter += 1
  return `${kind}-${Date.now().toString(36)}-${idCounter.toString(36)}`
}

export function defaultValue<K extends RequirementKind>(kind: K): RequirementValueByKind[K] {
  const defaults: { [P in RequirementKind]: () => RequirementValueByKind[P] } = {
    expertise: () => ({ name: '' }),
    org_history: () => ({ org: '', scope: 'ever', peers: [] }),
    location: () => ({ values: [] }),
    language: () => ({ values: [] }),
    type: () => ({ values: [] }),
    availability: () => ({ ...DEFAULT_AVAILABILITY }),
    career_level: () => ({ values: [] }),
    video_qna: () => ({}),
    audio_testimonial: () => ({}),
    work_arrangement: () => ({ values: [] }),
  }
  return defaults[kind]()
}

/** A new row. Availability / video Q&A / org history (one row at
 *  most) get their kind as id; expertise and multi-value rows (which can have
 *  a Required and a preference row) get a fresh id. Rows added in the grid
 *  start at Nice to have, except Required-only kinds. */
export function makeRow<K extends RequirementKind>(
  kind: K,
  value: RequirementValueByKind[K] = defaultValue(kind),
  opts: { level?: Level; source?: RequirementSource } = {},
): Requirement {
  return {
    id: isTagKind(kind) || isValuesKind(kind) ? newRequirementId(kind) : kind,
    kind,
    level: isRequiredOnly(kind) ? 'must' : (opts.level ?? 'slight'),
    source: opts.source ?? 'manual',
    value,
  } as Requirement
}

/** Kinds that only filter and are never scored: "Video Q&As only" is Featured
 *  membership, and payment must never add points (profiles-membership §2.2);
 *  "Audio testimonials only" likewise stays out of the score (§4.1: testimonials
 *  never feed ranking). */
export function isRequiredOnly(kind: RequirementKind): boolean {
  return kind === 'video_qna' || kind === 'audio_testimonial'
}

/** No rows: no preferences, nothing required (spec §3). */
export function defaultRequirements(): Requirement[] {
  return []
}

/** Enforces the row limits and puts rows in display order: expertise
 *  rows first, then the other kinds in canonical order — for a multi-value
 *  kind, its Required row before its preference row. Extra rows beyond the
 *  limits are dropped, and a value lives in only one of a kind's two rows
 *  (see withoutRequiredValues). */
export function normalizeRequirements(input: Requirement[]): Requirement[] {
  // Availability rows saved in the old window shape are read in the new one.
  const reqs = input.map((r) =>
    r.kind === 'availability' ? ({ ...r, value: normalizeAvailability(r.value) } as Requirement) : r,
  )
  const tags = reqs.filter((r) => isTagKind(r.kind))
  const singles = ALWAYS_PRESENT_KINDS.flatMap((k) => {
    const ofKind = reqs.filter((r) => r.kind === k)
    // A Required-only row is Required whatever was stored or set.
    if (isRequiredOnly(k)) return ofKind.slice(0, 1).map((r) => ({ ...r, level: 'must' }) as Requirement)
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
  if (!row || row.level === level || isRequiredOnly(row.kind)) return reqs
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

/** Kinds a saved run or draft may hold that the app no longer offers: Type
 *  while firm listings are off (spec §1), and Verified, removed because
 *  everyone listed is verified (profiles-membership §2.2). */
const HIDDEN_KINDS: Record<string, string> = { ...(FIRMS_ENABLED ? {} : { type: 'Type' }), verified: 'Verified' }
const hiddenKind = (kind: string): boolean => kind in HIDDEN_KINDS

/** Drops rows of kinds the grid no longer offers from a saved run or draft.
 *  The stored rows and scores stay as they were; `dropped` names the rows
 *  left out, for a notice. */
export function withoutHiddenKinds(reqs: Requirement[]): { requirements: Requirement[]; dropped: string[] } {
  const dropped = reqs.filter((r) => hiddenKind(r.kind))
  if (dropped.length === 0) return { requirements: reqs, dropped: [] }
  return { requirements: reqs.filter((r) => !hiddenKind(r.kind)), dropped: [...new Set(dropped.map((r) => HIDDEN_KINDS[r.kind]))] }
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
    careerLevels: [],
    workArrangements: [],
    locations: [],
    languages: [],
    previousEmployers: [],
    searchTerm: search.term,
    searchMode: search.mode,
  }
  for (const r of reqs) {
    if (!isMust(r)) continue
    switch (r.kind) {
      case 'expertise':
        f.expertise.push(r.value.name)
        if (r.value.includeWorking) f.expertiseIncludeWorking = true
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
        f.availability = isDefaultAvailability(r.value) ? null : { ...r.value }
        break
      case 'video_qna':
        f.hasVideoQnas = true
        break
      case 'audio_testimonial':
        f.hasAudioTestimonial = true
        break
      case 'org_history':
        if (isEmployersRow(r)) f.previousEmployers = orgTargets(r.value).map((o) => o.org)
        break
    }
  }
  return f
}

/** An Org History row only constrains anything once it names an organization. */
export function isActiveOrgRow(r: Requirement): r is RequirementOf<'org_history'> {
  return r.kind === 'org_history' && orgTargets(r.value).length > 0
}

/** The Required Org History row the Previous employers filter shows: "Ever at". */
function isEmployersRow(r: Requirement): r is RequirementOf<'org_history'> {
  return isMust(r) && isActiveOrgRow(r) && r.value.scope === 'ever'
}

/** Every Required Org History row that names an organization (mustHaves.ts). */
export function orgMustHaves(reqs: Requirement[]): RequirementOf<'org_history'>[] {
  return reqs.filter((r): r is RequirementOf<'org_history'> => isMust(r) && isActiveOrgRow(r))
}

/** Required rows the filter bar can't show: Org History at a scope other than
 *  "Ever at" (Currently at, or a peer). Rendered as "+1 required: Org history"
 *  chips (spec §2.1); the Previous employers filter is locked meanwhile. */
export function gridOnlyMustHaves(reqs: Requirement[]): RequirementOf<'org_history'>[] {
  return orgMustHaves(reqs).filter((r) => r.value.scope !== 'ever')
}

/** False for a row that can't constrain or score anything yet (e.g. Location
 *  with no places chosen, Org History with no name). */
export function rowHasValue(r: Requirement): boolean {
  switch (r.kind) {
    case 'expertise':
      return r.value.name !== ''
    case 'org_history':
      return orgTargets(r.value).length > 0
    case 'location':
    case 'language':
    case 'type':
    case 'career_level':
    case 'work_arrangement':
      return r.value.values.length > 0
    case 'availability':
      return !isDefaultAvailability(r.value)
    case 'video_qna':
    case 'audio_testimonial':
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
 *   left alone; availability and video Q&As (one row at most) turn their row
 *   Required;
 * - a filter that's cleared deletes its Required row (no row = no preference);
 * - selecting an expertise item that already exists as a Nice to have /
 *   Important row raises that row to Required rather than duplicating it;
 * - the "Include Working knowledge" toggle is written to every Required
 *   expertise row (one setting, kept on the rows so a saved run restores it).
 * Rows below Required are otherwise untouched (the filter bar never shows
 * them). The 10-row cap on expertise applies to the grid, not here, so the
 * filter bar keeps working exactly as it always has.
 */
export function applyFilterStateToRequirements(
  reqs: Requirement[],
  next: FilterState,
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
  setSingle(
    'availability',
    next.availability && !isDefaultAvailability(next.availability) ? { ...next.availability } : null,
  )
  setSingle('video_qna', next.hasVideoQnas ? {} : null)
  setSingle('audio_testimonial', next.hasAudioTestimonial ? {} : null)
  rows = withPreviousEmployers(rows, next.previousEmployers)

  const wanted = next.expertise
  const withWorking = (name: string) => (next.expertiseIncludeWorking ? { name, includeWorking: true } : { name })
  // Drop Required rows whose selection was removed in the filter bar.
  rows = rows.filter((r) => !(r.kind === 'expertise' && isMust(r) && !wanted.includes(r.value.name)))
  for (const name of wanted) {
    const existing = rows.find((r): r is RequirementOf<'expertise'> => r.kind === 'expertise' && r.value.name === name)
    if (existing) {
      // Raised to Required, or already Required: carries the Working setting.
      rows = rows.map((r) => (r === existing ? { ...existing, level: 'must', value: withWorking(name) } : r))
      continue
    }
    rows.push(makeRow('expertise', withWorking(name), { level: 'must', source: 'filter' }))
  }

  return { requirements: normalizeRequirements(rows), search: { term: next.searchTerm, mode: next.searchMode } }
}

/**
 * The Previous employers filter → the Org History row. Picks write a Required
 * "Ever at" row (any of them; ids kept for names already in it), turning a
 * preference row Required as other single-instance filters do. Clearing the
 * picks deletes that Required row. A row at another scope, or one still
 * being typed in the grid (no name yet), isn't the filter's, so it's left
 * alone. Unchanged picks leave the row untouched.
 */
function withPreviousEmployers(rows: Requirement[], names: string[]): Requirement[] {
  const row = rows.find((r): r is RequirementOf<'org_history'> => r.kind === 'org_history')
  const current = row && isEmployersRow(row) ? orgTargets(row.value) : []
  if (names.length === current.length && names.every((n, i) => n === current[i].org)) return rows
  if (names.length === 0) return row && isEmployersRow(row) ? rows.filter((r) => r !== row) : rows
  if (row && isMust(row) && isActiveOrgRow(row) && row.value.scope !== 'ever') return rows
  const known = row ? orgTargets(row.value) : []
  const refs = names.map((org) => ({ org, org_id: known.find((k) => k.org === org)?.org_id ?? null }))
  const value: RequirementValueByKind['org_history'] = {
    org: refs[0].org,
    org_id: refs[0].org_id,
    ...(refs.length > 1 ? { also: refs.slice(1) } : {}),
    scope: 'ever',
    peers: [],
  }
  return row
    ? rows.map((r) => (r === row ? withMust(r, value) : r))
    : [...rows, makeRow('org_history', value, { level: 'must', source: 'filter' })]
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
  | { kind: 'expertise'; tag: ExtractedTag }
  | { kind: 'location' | 'language'; item: ExtractedValue }

/** True when the suggestion is already in the grid (in any row, any level —
 *  e.g. a language that's already Required). */
export function isSuggestionAdded(reqs: Requirement[], s: Suggestion): boolean {
  if ('tag' in s) return reqs.some((r) => r.kind === 'expertise' && r.value.name === s.tag.name)
  return reqs.some(
    (r) => (r.kind === 'location' || r.kind === 'language') && r.kind === s.kind && r.value.values.includes(s.item.value),
  )
}

/**
 * Adds one "Found in your JD" suggestion, at Nice to have, tagged "from JD".
 * Expertise suggestions become their own row (respecting the combined
 * row cap). A location or language goes to that kind's PREFERENCE row —
 * joining it (which keeps its level) or creating it at Nice to have. A
 * Required row is never touched, so a suggestion can't widen a filter.
 */
export function addSuggestion(reqs: Requirement[], s: Suggestion, maxTagRows: number): Requirement[] {
  if (isSuggestionAdded(reqs, s)) return reqs
  if ('tag' in s) {
    if (tagRowCount(reqs) >= maxTagRows) return reqs
    return [...reqs, makeRow('expertise', { name: s.tag.name }, { source: 'jd' })]
  }
  const pref = preferenceRowOf(reqs, s.kind) as RequirementOf<'location' | 'language'> | undefined
  if (pref)
    return reqs.map((r) =>
      r === pref ? ({ ...pref, value: { ...pref.value, values: [...pref.value.values, s.item.value] } } as Requirement) : r,
    )
  return normalizeRequirements([...reqs, makeRow(s.kind, { values: [s.item.value] }, { source: 'jd' })])
}

/** Everything "Read job description" found, grouped. */
export function suggestionsFrom(extracted: ExtractedRequirements): { title: string; items: Suggestion[] }[] {
  return [
    { title: 'Expertise', items: extracted.expertise.map((tag) => ({ kind: 'expertise' as const, tag })) },
    { title: 'Locations', items: extracted.locations.map((item) => ({ kind: 'location' as const, item })) },
    { title: 'Languages', items: extracted.languages.map((item) => ({ kind: 'language' as const, item })) },
  ].filter((g) => g.items.length > 0)
}

/** What "Read job description" pre-fills: the places and languages the JD
 *  states, at Nice to have, "from JD". Never expertise (pending a decision on
 *  double counting with Fit) and never Must have. */
export function jdPrefills(extracted: ExtractedRequirements): Suggestion[] {
  return suggestionsFrom(extracted)
    .flatMap((g) => g.items)
    .filter((s) => s.kind !== 'expertise')
}

/** Places and languages the JD pre-filled that are still in a preference row. */
export function jdSuggestedValues(
  reqs: Requirement[],
  extracted: ExtractedRequirements | null,
): { kind: 'location' | 'language'; value: string }[] {
  if (!extracted) return []
  return jdPrefills(extracted).flatMap((s) => {
    if ('tag' in s) return []
    const pref = preferenceRowOf(reqs, s.kind)
    return pref && 'values' in pref.value && pref.value.values.includes(s.item.value)
      ? [{ kind: s.kind, value: s.item.value }]
      : []
  })
}

/** "Clear suggestions": takes the JD's places and languages back out of the
 *  preference rows, dropping a row left empty. */
export function clearJdSuggestions(reqs: Requirement[], extracted: ExtractedRequirements | null): Requirement[] {
  if (!extracted) return reqs
  const found = new Set(jdPrefills(extracted).map((s) => ('tag' in s ? '' : `${s.kind}:${s.item.value}`)))
  return reqs.flatMap((r) => {
    if (isMust(r) || (r.kind !== 'location' && r.kind !== 'language')) return [r]
    const kept = r.value.values.filter((v) => !found.has(`${r.kind}:${v}`))
    if (kept.length === r.value.values.length) return [r]
    return kept.length === 0 ? [] : [{ ...r, value: { ...r.value, values: kept } } as Requirement]
  })
}

/**
 * Sets one of a kind's rows from the priority editors: its Must have row
 * (`must`) or its preference row. A null value, or no values, removes that
 * row (no row = no preference); otherwise the row is updated, or created at
 * `level` (Nice to have unless given).
 */
export function setKindRow(
  reqs: Requirement[],
  kind: SingleKind,
  must: boolean,
  value: Requirement['value'] | null,
  level: Level = must ? 'must' : 'slight',
): Requirement[] {
  const row = must ? requiredRowOf(reqs, kind) : isValuesKind(kind) ? preferenceRowOf(reqs, kind) : reqs.find((r) => r.kind === kind)
  const empty = !value || ('values' in value && value.values.length === 0)
  if (empty) return row ? reqs.filter((r) => r !== row) : reqs
  if (row) return reqs.map((r) => (r === row ? ({ ...r, value } as Requirement) : r))
  return normalizeRequirements([...reqs, makeRow(kind, value as never, { level })])
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
