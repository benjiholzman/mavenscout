import { expertiseTags, matchesExpertiseSelection, type ExpertiseIndex } from './expertise'
import { speaks, spokenLanguages } from './languages'
import type { AvailabilityTrack, PortfolioItem, Proficiency, Profile } from '../types/db'

// Directory filtering (PRD 7.1): AND across filters, OR within a multi-select
// filter. Expertise follows the unified list's rule (profiles-membership §6):
// OR within a kind (sector / theme / method), AND across kinds, counting Core
// and Strong tags unless Working knowledge is included (lib/expertise).

export type EngagementType = 'part_time' | 'full_time' | 'either'

export interface AvailabilityFilter {
  engagement: EngagementType
  /** Month window as 'YYYY-MM' strings; null = "any time, just available". */
  fromMonth: string | null
  untilMonth: string | null
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
  verifiedOnly: boolean
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
  verifiedOnly: false,
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
    f.verifiedOnly ||
    f.searchTerm.trim() !== ''
  )
}

/** True when the Type filter is set and contains only firm types (PRD 7.19 —
 *  the Career Level filter disables in that case). */
export function firmsOnlySelected(types: string[]): boolean {
  return types.length > 0 && types.every((t) => t === 'Small Firm' || t === 'Large Firm')
}

// ---- availability (PRD 7.16) ----------------------------------------------

function monthStart(ym: string): Date {
  return new Date(`${ym}-01T00:00:00`)
}
function monthEnd(ym: string): Date {
  const d = monthStart(ym)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
}

function trackMatches(track: AvailabilityTrack, filter: AvailabilityFilter): boolean {
  if (!track || track.status === 'unavailable') return false
  const availableFrom =
    track.status === 'available_now' ? new Date() : track.from ? new Date(track.from) : null
  if (!availableFrom) return false

  if (!filter.fromMonth && !filter.untilMonth) return true // any time

  const windowFrom = filter.fromMonth ? monthStart(filter.fromMonth) : new Date()
  const windowTo = filter.untilMonth
    ? monthEnd(filter.untilMonth)
    : filter.fromMonth
      ? monthEnd(filter.fromMonth)
      : null

  // Candidate must become available by the end of the window (already-available
  // candidates match a future window — PRD 7.1 acceptance criterion)...
  if (windowTo && availableFrom > windowTo) return false
  // ...and their availability must not have ended before the window starts.
  if (track.until && new Date(track.until) < windowFrom) return false
  return true
}

export function matchesAvailability(p: Profile, filter: AvailabilityFilter): boolean {
  const pt = () => trackMatches(p.part_time_availability, filter)
  const ft = () => trackMatches(p.full_time_availability, filter)
  if (filter.engagement === 'part_time') return pt()
  if (filter.engagement === 'full_time') return ft()
  return pt() || ft()
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
  const inNames = p.name.toLowerCase().includes(q) || p.headline.toLowerCase().includes(q)
  if (mode === 'names') return inNames
  if (inNames) return true
  const haystack = [
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
    if (f.verifiedOnly && p.verification_status !== 'verified') return false
    if (!matchesSearch(p, portfolioByProfile.get(p.id) ?? [], f.searchTerm, f.searchMode))
      return false
    return true
  })
}

// ---- location (two-tier: country → city) ----------------------------------
// profiles.location stays free text, conventionally "City, Country". The
// country is the last comma-separated segment. In the filter, a country is
// selected by its bare name ("Nigeria") and a city by the full location
// string ("Lagos, Nigeria"), so same-named cities in different countries
// never collide.

export function locationCountry(location: string): string {
  return location.split(',').pop()!.trim()
}

/** Display label for a location filter value: cities show without the country. */
export function locationLabel(value: string): string {
  const i = value.lastIndexOf(',')
  return i === -1 ? value : value.slice(0, i).trim()
}

/** Country selections match every profile in that country; city selections
 *  match only that city. OR within the selection. */
export function matchesLocation(location: string | null, selected: string[]): boolean {
  if (!location) return false
  const loc = location.trim()
  return selected.some((sel) => sel === loc || sel === locationCountry(loc))
}

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
  languages: string[]
} {
  const languages = [...new Set(profiles.flatMap((p) => spokenLanguages(p).map((l) => l.name)))].sort()
  return { locations: deriveLocationGroups(profiles), languages }
}

// ---- facet counts (filter dropdown item counts) ----------------------------

export type FacetKey =
  | 'types'
  | 'expertise'
  | 'careerLevels'
  | 'workArrangements'
  | 'locations'
  | 'languages'

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
