import type { ExpertiseIndex } from '../expertise'
import { applyFilters } from '../filters'
import type { Requirement } from '../matching/types'
import type { OrgIndex } from '../organizations'
import type { PortfolioItem, Profile } from '../../types/db'
import { passesOrgMustHave } from './match'
import { mustHavesToFilterState, orgMustHaves, type SearchState } from './model'

// Must-have pre-filter (docs/MavenScout-match-rework.md §5.1 step 2).
// Candidates failing any Must-have are excluded before scoring and never
// scored. Evaluation reuses the directory filter logic exactly
// (src/lib/filters.ts applyFilters), plus Org History (the Previous employers
// filter among them), which needs the organizations list.
//
// TODO(server-side): the spec asks for this as a database query. Today the
// whole approved pool is loaded and filtered in the browser (expertise kinds,
// "City, Country" parsing and availability windows all live in filters.ts); this function is the one place to move to a query when the
// pool outgrows that.

/** Profiles that pass every Org History Must-have (all others pass through). */
export function applyOrgMustHaves(profiles: Profile[], reqs: Requirement[], orgs: OrgIndex): Profile[] {
  const orgRows = orgMustHaves(reqs)
  if (orgRows.length === 0) return profiles
  return profiles.filter((p) => orgRows.every((r) => passesOrgMustHave(p, r.value, orgs)))
}

/** Profiles that meet every Must-have row and the search term. */
export function applyMustHaves(
  profiles: Profile[],
  portfolioByProfile: Map<string, PortfolioItem[]>,
  reqs: Requirement[],
  search: SearchState,
  expertise: ExpertiseIndex,
  orgs: OrgIndex,
): Profile[] {
  return applyFilters(
    applyOrgMustHaves(profiles, reqs, orgs),
    portfolioByProfile,
    mustHavesToFilterState(reqs, search),
    expertise,
  )
}
