// ============================================================================
// App config: product rules that are settings, not code
// (docs/MavenScout-profiles-membership.md). Matching numbers live in
// src/lib/matching/config.ts.
// ============================================================================

import type { ExpertiseTier } from '../types/db'

/** Languages a profile can list (spec §7.1). TUNABLE. */
export const LANGUAGE_MAX = 10

/** Expertise tags per tier (spec §6, §7.1): exactly 3 Core and 5 Strong, up
 *  to 10 Working knowledge. The editor enforces the maximums; the minimums
 *  are shown as guidance until the new editor's minimums land (§13 step 2).
 *  TUNABLE. */
export const EXPERTISE_TIER_LIMITS: Record<ExpertiseTier, { min: number; max: number }> = {
  core: { min: 3, max: 3 },
  strong: { min: 5, max: 5 },
  working: { min: 0, max: 10 },
}
