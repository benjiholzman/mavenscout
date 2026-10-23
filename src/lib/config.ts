// ============================================================================
// App config: product rules that are settings, not code
// (docs/MavenScout-profiles-membership.md). Matching numbers live in
// src/lib/matching/config.ts.
// ============================================================================

import type { ExpertiseTier } from '../types/db'

/** Firm listings (spec §1). While false, firms are left out of the directory,
 *  search and ranking, and the Type filter, the Type requirement row and the
 *  firm onboarding options are hidden. Firm code, columns and data stay so
 *  firm listings can return. Direct /profile and /site links still open. */
export const FIRMS_ENABLED = false

/** Profile minimums and maximums (spec §7.1). Maximums are checked on every
 *  section save; minimums when a profile is submitted, and for listed
 *  profiles a save can't take a section below a minimum it meets (lib/
 *  completeness). Expertise and portfolio limits are below. TUNABLE. */
export const PROFILE_LIMITS = {
  bio: { min: 300, max: 1500 }, // characters
  workHistory: { min: 1, max: 10 },
  education: { min: 1, max: 5 }, // each entry names its degree
  certifications: { min: 0, max: 10 },
  languages: { min: 1, max: 10 },
} as const

/** Languages a profile can list (spec §7.1). */
export const LANGUAGE_MAX = PROFILE_LIMITS.languages.max

/** Expertise tags per tier (spec §6, §7.1): exactly 3 Core and 5 Strong, up
 *  to 10 Working knowledge. Enforced like PROFILE_LIMITS. TUNABLE. */
export const EXPERTISE_TIER_LIMITS: Record<ExpertiseTier, { min: number; max: number }> = {
  core: { min: 3, max: 3 },
  strong: { min: 5, max: 5 },
  working: { min: 0, max: 10 },
}

/** What each membership level allows (spec §2.2, §7.1). `featured` applies
 *  once Featured status is active — the member chose Featured and every
 *  standard Video Q&A is in (lib/membership isFeatured); until then the
 *  profile is a Member everywhere. TUNABLE. */
export const MEMBERSHIP_LIMITS = {
  member: { portfolio: { min: 3, max: 3 }, socialLinks: 2, customDomain: false },
  featured: { portfolio: { min: 3, max: 10 }, socialLinks: 5, customDomain: true },
} as const

/** Portfolio item fields (spec §7.2). TUNABLE. */
export const PORTFOLIO_FIELD_LIMITS = {
  description: 1000,
  results: 500,
  images: 3,
  links: 3,
} as const
