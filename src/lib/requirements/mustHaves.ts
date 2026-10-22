import { applyFilters, type TaxonomyTree } from '../filters'
import type { Requirement } from '../matching/types'
import type { PortfolioItem, Profile } from '../../types/db'
import { passesOrgMustHave } from './match'
import { gridOnlyMustHaves, mustHavesToFilterState, type SearchState } from './model'

// Must-have pre-filter (docs/MavenScout-match-rework.md §5.1 step 2).
// Candidates failing any Must-have are excluded before scoring and never
// scored. Evaluation reuses the directory filter logic exactly
// (src/lib/filters.ts applyFilters), plus Org History, which has no
// filter-bar control.
//
// TODO(server-side): the spec asks for this as a database query. Today the
// whole approved pool is loaded and filtered in the browser (taxonomy parent
// expansion, "City, Country" parsing and availability windows all live in
// filters.ts); this function is the one place to move to a query when the
// pool outgrows that.

export interface TaxonomyTrees {
  expertise: TaxonomyTree
  skills: TaxonomyTree
}

/** Profiles that pass every Org History Must-have (all others pass through). */
export function applyOrgMustHaves(profiles: Profile[], reqs: Requirement[]): Profile[] {
  const orgRows = gridOnlyMustHaves(reqs)
  if (orgRows.length === 0) return profiles
  return profiles.filter((p) => orgRows.every((r) => passesOrgMustHave(p, r.value)))
}

/** Profiles that meet every Must-have row and the search term. */
export function applyMustHaves(
  profiles: Profile[],
  portfolioByProfile: Map<string, PortfolioItem[]>,
  reqs: Requirement[],
  search: SearchState,
  trees: TaxonomyTrees,
): Profile[] {
  return applyFilters(
    applyOrgMustHaves(profiles, reqs),
    portfolioByProfile,
    mustHavesToFilterState(reqs, search),
    trees.expertise,
    trees.skills,
  )
}
