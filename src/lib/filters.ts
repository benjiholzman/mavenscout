import { expertiseTags, matchesExpertiseSelection, type ExpertiseIndex } from './expertise'
import { speaks, spokenLanguages } from './languages'
import { buildLocationTree, placeMatches, placeOf, type Place } from './locations'
import { isFeatured } from './membership'
import { AVAILABILITY_FRESH_DAYS } from './config'
import type { TreeNode } from './tree'
import type { AvailabilityTrack, PortfolioItem, Proficiency, Profile } from '../types/db'

// Directory filtering (PRD 7.1): AND across filters, OR within a multi-select
// filter. Expertise follows the unified list's rule (profiles-membership §6):
// OR within a kind (sector / theme / method), AND across kinds, counting Core
// and Strong tags unless Working knowledge is included (lib/expertise).

/** When the expert must be available (PRD 7.16). 'any' = no timing
 *  constraint. The modal's shortcuts: 'now_1m' / 'now_3m' / 'now_6m' =
 *  available now and through the next 1 / 3 / 6 months; 'now_open' =
 *  available now with no end date. 'dates' reads `fromDate` (open by then)
 *  and `untilDate` (still open then; optional). The rest are older choices a
 *  saved ranking may still hold: 'by_month' reads `byMonth`; 'between' reads
 *  `fromMonth` and `untilMonth`. */
export type AvailabilityWhen =
  | 'any'
  | 'now'
  | 'within_1m'
  | 'within_3m'
  | 'by_month'
  | 'between'
  | 'now_1m'
  | 'now_3m'
  | 'now_6m'
  | 'now_open'
  | 'dates'

export interface AvailabilityFilter {
  /** Tracks that count (either = both). At least one is always on. */
  partTime: boolean
  fullTime: boolean
  when: AvailabilityWhen
  /** 'YYYY-MM' when `when` is 'by_month', else null. */
  byMonth: string | null
  /** 'YYYY-MM' start and end months when `when` is 'between', else null. */
  fromMonth: string | null
  untilMonth: string | null
  /** 'YYYY-MM-DD' when `when` is 'dates', else null (untilDate may be null). */
  fromDate?: string | null
  untilDate?: string | null
}

/** Both tracks, any time: no constraint, so the filter is off. */
export const DEFAULT_AVAILABILITY: AvailabilityFilter = {
  partTime: true,
  fullTime: true,
  when: 'any',
  byMonth: null,
  fromMonth: null,
  untilMonth: null,
  fromDate: null,
  untilDate: null,
}

export function isDefaultAvailability(f: AvailabilityFilter): boolean {
  return f.partTime && f.fullTime && f.when === 'any'
}

/** Reads a stored availability value, converting the old shape
 *  ({ engagement, fromMonth, untilMonth }) a saved ranking may hold: the
 *  engagement becomes the track chips; a from–to window stays a start–end
 *  window, and a single month becomes "By <month>". */
export function normalizeAvailability(raw: unknown): AvailabilityFilter {
  const v = (raw ?? {}) as Partial<AvailabilityFilter> & {
    engagement?: 'part_time' | 'full_time' | 'either'
    fromMonth?: string | null
    untilMonth?: string | null
  }
  const none = { byMonth: null, fromMonth: null, untilMonth: null }
  if (v.when) {
    const partTime = v.partTime !== false
    const fullTime = v.fullTime !== false
    const tracks = { partTime: partTime || !fullTime, fullTime }
    if (v.when === 'by_month')
      return v.byMonth ? { ...tracks, when: 'by_month', ...none, byMonth: v.byMonth } : { ...tracks, when: 'any', ...none }
    if (v.when === 'dates')
      return v.fromDate
        ? { ...tracks, when: 'dates', ...none, fromDate: v.fromDate, untilDate: v.untilDate ?? null }
        : { ...tracks, when: 'any', ...none }
    if (v.when === 'between')
      return v.fromMonth && v.untilMonth
        ? { ...tracks, when: 'between', ...none, fromMonth: v.fromMonth, untilMonth: v.untilMonth }
        : { ...tracks, when: 'any', ...none }
    return { ...tracks, when: v.when, ...none }
  }
  const tracks = { partTime: v.engagement !== 'full_time', fullTime: v.engagement !== 'part_time' }
  if (v.fromMonth && v.untilMonth && v.fromMonth !== v.untilMonth)
    return { ...tracks, when: 'between', ...none, fromMonth: v.fromMonth, untilMonth: v.untilMonth }
  const month = v.untilMonth || v.fromMonth || null
  return month ? { ...tracks, when: 'by_month', ...none, byMonth: month } : { ...tracks, when: 'any', ...none }
}

export type SearchMode = 'names' | 'full'

export interface FilterState {
  types: string[]              // consultant_type values
  expertise: string[]          // selected item names from the unified list
  /** Also count Working knowledge tags (default: Core and Strong only). */
  expertiseIncludeWorking: boolean
  careerLevels: string[]
  workArrangements: string[]
  locations: string[]
  languages: string[]
  /** Minimum proficiency for `languages`: 'working' = Working or above
   *  (Fluent satisfies it), 'fluent' = Fluent only. */
  languageLevel: Proficiency
  availability: AvailabilityFilter | null
  /** Featured Members with every standard Video Q&A in (spec §2.2): the
   *  Must have video Q&A row. (In the priorities modal it can also be Nice to
   *  have or Important.) */
  hasVideoQnas: boolean
  /** At least one published audio testimonial (spec §4). Off by default: the
   *  Must have audio testimonial row. */
  hasAudioTestimonial: boolean
  /** Previous employers: the Required Org History rows at "Ever at", any of
   *  these organizations. Evaluated with the organizations list in
   *  requirements/mustHaves.ts, not by applyFilters. */
  previousEmployers: string[]
  searchTerm: string
  searchMode: SearchMode
}

export const EMPTY_FILTERS: FilterState = {
  types: [],
  expertise: [],
  expertiseIncludeWorking: false,
  careerLevels: [],
  workArrangements: [],
  locations: [],
  languages: [],
  languageLevel: 'working',
  availability: null,
  hasVideoQnas: false,
  hasAudioTestimonial: false,
  previousEmployers: [],
  searchTerm: '',
  searchMode: 'names',
}

export function hasActiveFilters(f: FilterState): boolean {
  return (
    f.types.length > 0 ||
    f.expertise.length > 0 ||
    f.careerLevels.length > 0 ||
    f.workArrangements.length > 0 ||
    f.locations.length > 0 ||
    f.languages.length > 0 ||
    f.availability !== null ||
    f.hasVideoQnas ||
    f.hasAudioTestimonial ||
    f.previousEmployers.length > 0 ||
    f.searchTerm.trim() !== ''
  )
}

/** True when the Type filter is set and contains only firm types (PRD 7.19 —
 *  the Career Level filter disables in that case). */
export function firmsOnlySelected(types: string[]): boolean {
  return types.length > 0 && types.every((t) => t === 'Small Firm' || t === 'Large Firm')
}

// ---- availability (PRD 7.16) ----------------------------------------------
// Timed choices (Available now, Within 1/3 months, By a month) count a track
// only if the expert updated their availability within
// AVAILABILITY_FRESH_DAYS, the same rule as the Recommended sort; staler
// availability is unknown. "Any time" just needs the track to be open.

const DAY_MS = 24 * 60 * 60 * 1000

export function availabilityFresh(p: Profile, now = Date.now()): boolean {
  if (!p.availability_updated_at) return false
  return now - new Date(p.availability_updated_at).getTime() <= AVAILABILITY_FRESH_DAYS * DAY_MS
}

function addMonthsTo(d: Date, n: number): Date {
  const out = new Date(d)
  out.setMonth(out.getMonth() + n)
  return out
}

/** The latest moment a track may open for this filter, `graceMonths` later
 *  (ranking's partial credit); null = no timing constraint. */
export function availabilityDeadline(f: AvailabilityFilter, graceMonths = 0, now = new Date()): Date | null {
  switch (f.when) {
    case 'any':
      return null
    case 'now':
      return graceMonths ? addMonthsTo(now, graceMonths) : now
    case 'within_1m':
      return addMonthsTo(now, 1 + graceMonths)
    case 'within_3m':
      return addMonthsTo(now, 3 + graceMonths)
    case 'by_month':
      return f.byMonth ? monthEndPlus(f.byMonth, graceMonths) : null
    case 'between':
      // Open by the end of the start month.
      return f.fromMonth ? monthEndPlus(f.fromMonth, graceMonths) : null
    case 'now_1m':
    case 'now_3m':
    case 'now_6m':
    case 'now_open':
      return graceMonths ? addMonthsTo(now, graceMonths) : now
    case 'dates':
      return f.fromDate ? addMonthsTo(dayEnd(f.fromDate), graceMonths) : null
  }
}

function monthEndPlus(ym: string, months: number): Date {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m + months, 0, 23, 59, 59) // end of that month
}

const dayEnd = (ymd: string) => new Date(`${ymd}T23:59:59`)

const NOW_MONTHS = { now_1m: 1, now_3m: 3, now_6m: 6 } as const

/** The date the track must still be open on (null = no end constraint;
 *  'now_open' is handled in trackMatches: no end date at all). */
function windowEndStart(f: AvailabilityFilter, now: Date): Date | null {
  if (f.when === 'between') return f.untilMonth ? new Date(`${f.untilMonth}-01T00:00:00`) : null
  if (f.when === 'dates') return f.untilDate ? new Date(`${f.untilDate}T00:00:00`) : null
  if (f.when in NOW_MONTHS) return addMonthsTo(now, NOW_MONTHS[f.when as keyof typeof NOW_MONTHS])
  return null
}

function trackMatches(
  track: AvailabilityTrack,
  deadline: Date | null,
  mustLastTo: Date | null,
  now: Date,
  openEnded = false,
): boolean {
  if (!track || track.status === 'unavailable') return false
  if (openEnded && track.until) return false
  // An availability that has already ended is closed; for a start–end window
  // it must still be open in the end month.
  if (track.until && new Date(track.until) < (mustLastTo ?? now)) return false
  const opens = track.status === 'available_now' ? now : track.from ? new Date(track.from) : null
  if (!opens) return false
  // Already-available experts match any later deadline (PRD 7.1).
  return !deadline || opens <= deadline
}

export function matchesAvailability(p: Profile, f: AvailabilityFilter, graceMonths = 0): boolean {
  const now = new Date()
  const deadline = availabilityDeadline(f, graceMonths, now)
  if (deadline && !availabilityFresh(p, now.getTime())) return false
  const lastTo = windowEndStart(f, now)
  const openEnded = f.when === 'now_open'
  return (
    (f.partTime && trackMatches(p.part_time_availability, deadline, lastTo, now, openEnded)) ||
    (f.fullTime && trackMatches(p.full_time_availability, deadline, lastTo, now, openEnded))
  )
}

const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

/** "Mar – Jun 2027", "Dec 2026 – Mar 2027", "Mar 2027". */
export function monthRangeLabel(from: string, until: string): string {
  if (from === until) return monthLabel(from)
  const short = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short' })
  return from.slice(0, 4) === until.slice(0, 4)
    ? `${short(from)} – ${monthLabel(until)}`
    : `${monthLabel(from)} – ${monthLabel(until)}`
}

const dayLabel = (ymd: string) =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

/** "Mar 3, 2027 – Jun 30, 2027", or "From Mar 3, 2027". */
export function dateRangeLabel(from: string, until: string | null): string {
  return until ? `${dayLabel(from)} – ${dayLabel(until)}` : `From ${dayLabel(from)}`
}

function trackLabel(f: AvailabilityFilter): string | null {
  return f.partTime && f.fullTime ? null : f.partTime ? 'Part-time' : 'Full-time'
}

/** Short form for the filter chip: "Available now", "By Mar 2027",
 *  "Part-time, within 3 months", "Full-time". */
export function availabilitySummary(f: AvailabilityFilter): string {
  const when = {
    any: null,
    now: 'Available now',
    within_1m: 'Within 1 month',
    within_3m: 'Within 3 months',
    by_month: f.byMonth ? `By ${monthLabel(f.byMonth)}` : null,
    between: f.fromMonth && f.untilMonth ? monthRangeLabel(f.fromMonth, f.untilMonth) : null,
    now_1m: 'Now, next month',
    now_3m: 'Now, next 3 months',
    now_6m: 'Now, next 6 months',
    now_open: 'Now, open-ended',
    dates: f.fromDate ? dateRangeLabel(f.fromDate, f.untilDate ?? null) : null,
  }[f.when]
  const track = trackLabel(f)
  const keepCase = f.when === 'between' || f.when === 'dates'
  if (track && when) return `${track}, ${keepCase ? when : `${when.charAt(0).toLowerCase()}${when.slice(1)}`}`
  return track ?? when ?? 'Availability'
}

/** Sentence form for requirement labels: "Available now", "Available
 *  part-time by Mar 2027". */
export function availabilityLabel(f: AvailabilityFilter): string {
  const track = trackLabel(f)
  const when = {
    any: '',
    now: ' now',
    within_1m: ' within 1 month',
    within_3m: ' within 3 months',
    by_month: f.byMonth ? ` by ${monthLabel(f.byMonth)}` : '',
    between: f.fromMonth && f.untilMonth ? ` ${monthRangeLabel(f.fromMonth, f.untilMonth)}` : '',
    now_1m: ' now for the next month',
    now_3m: ' now for the next 3 months',
    now_6m: ' now for the next 6 months',
    now_open: ' now, open-ended',
    dates: f.fromDate ? ` ${dateRangeLabel(f.fromDate, f.untilDate ?? null)}` : '',
  }[f.when]
  return `Available${track ? ` ${track.toLowerCase()}` : ''}${when}`
}

// ---- search (PRD 7.1 two modes) --------------------------------------------

function matchesSearch(
  p: Profile,
  portfolio: PortfolioItem[],
  term: string,
  mode: SearchMode,
): boolean {
  const q = term.trim().toLowerCase()
  if (!q) return true
  const inName = p.name.toLowerCase().includes(q)
  if (mode === 'names') return inName
  if (inName) return true
  const haystack = [
    p.headline,
    p.detailed_bio ?? '',
    ...expertiseTags(p).map((t) => t.name),
    ...portfolio.flatMap((i) => [i.project_name, i.role, i.description, i.results ?? '']),
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

// ---- main entry -------------------------------------------------------------

export function applyFilters(
  profiles: Profile[],
  portfolioByProfile: Map<string, PortfolioItem[]>,
  f: FilterState,
  expertise: ExpertiseIndex,
): Profile[] {
  return profiles.filter((p) => {
    if (f.types.length > 0 && !f.types.includes(p.consultant_type)) return false
    if (!matchesExpertiseSelection(expertiseTags(p), f.expertise, expertise, f.expertiseIncludeWorking)) return false
    // Career level is individual-only (PRD 7.19): firms are "not applicable"
    // and never excluded by it (match rework spec §3.1).
    if (
      f.careerLevels.length > 0 &&
      p.consultant_type === 'Individual' &&
      (!p.career_level || !f.careerLevels.includes(p.career_level))
    )
      return false
    if (
      f.workArrangements.length > 0 &&
      !f.workArrangements.some((w) => p.work_types.includes(w))
    )
      return false
    if (f.locations.length > 0 && !matchesLocation(p.location, f.locations)) return false
    if (f.languages.length > 0 && speaks(p, f.languages, f.languageLevel).length === 0) return false
    if (f.availability && !matchesAvailability(p, f.availability)) return false
    if (f.hasVideoQnas && !isFeatured(p)) return false
    if (f.hasAudioTestimonial && !p.has_audio_testimonial) return false
    if (!matchesSearch(p, portfolioByProfile.get(p.id) ?? [], f.searchTerm, f.searchMode))
      return false
    return true
  })
}

// ---- location (sub-region → country → city; lib/locations) ----------------
// profiles.location stays free text, conventionally "City, Country". Values:
// a sub-region by its M49 name, a country by its bare name ("Nigeria"), a
// city by the full location string ("Lagos, Nigeria").

export function locationCountry(location: string): string {
  return location.split(',').pop()!.trim()
}

/** Display label for a location filter value: cities show without the country. */
export function locationLabel(value: string): string {
  const i = value.lastIndexOf(',')
  return i === -1 ? value : value.slice(0, i).trim()
}

/** Region selections match every profile in its countries, country
 *  selections every profile in that country, city selections only that
 *  city. OR within the selection. */
export function matchesLocation(location: string | null, selected: string[]): boolean {
  return placeMatches(placeOf(location), selected)
}

/** Countries and their cities, as the JD extraction matches them (regions
 *  are picked, not extracted). */
export function deriveLocationGroups(profiles: Profile[]): { label: string; items: string[] }[] {
  const byCountry = new Map<string, Set<string>>()
  for (const p of profiles) {
    const loc = p.location?.trim()
    if (!loc) continue
    const country = locationCountry(loc)
    const cities = byCountry.get(country) ?? new Set<string>()
    if (loc !== country) cities.add(loc)
    byCountry.set(country, cities)
  }
  return [...byCountry.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, cities]) => ({ label, items: [...cities].sort() }))
}

/** Dynamic filter options from what's actually in the data (PRD §8). */
export function deriveOptions(profiles: Profile[]): {
  locations: { label: string; items: string[] }[]
  /** The location picker: continent → sub-region → country → city. */
  locationTree: TreeNode[]
  languages: string[]
} {
  const languages = [...new Set(profiles.flatMap((p) => spokenLanguages(p).map((l) => l.name)))].sort()
  const places = profiles.map((p) => placeOf(p.location)).filter((p): p is Place => p !== null)
  return { locations: deriveLocationGroups(profiles), locationTree: buildLocationTree(places), languages }
}

// ---- facet counts (filter dropdown item counts) ----------------------------

export type FacetKey =
  | 'types'
  | 'expertise'
  | 'careerLevels'
  | 'workArrangements'
  | 'locations'
  | 'languages'

/** Facets the filter bar asks counts for: FacetKey, plus previous employers
 *  (counted with the organizations list, so outside facetCounts). */
export type FilterCountKey = FacetKey | 'previousEmployers'

/** For each option value of one filter, how many profiles it would match
 *  given every OTHER active filter (standard faceted counts: the dropdown's
 *  own selections are ignored, so counts don't collapse as you tick items). */
export function facetCounts(
  profiles: Profile[],
  portfolioByProfile: Map<string, PortfolioItem[]>,
  f: FilterState,
  expertise: ExpertiseIndex,
  key: FacetKey,
  values: string[],
): Map<string, number> {
  const pool = applyFilters(profiles, portfolioByProfile, { ...f, [key]: [] }, expertise)
  const counts = new Map<string, number>()
  for (const value of values) {
    // Counts honour the language level and the Working knowledge toggle: an
    // expertise count is how many experts hold that item at a counted tier.
    const only: FilterState = {
      ...EMPTY_FILTERS,
      [key]: [value],
      languageLevel: f.languageLevel,
      expertiseIncludeWorking: f.expertiseIncludeWorking,
    }
    counts.set(value, applyFilters(pool, portfolioByProfile, only, expertise).length)
  }
  return counts
}
