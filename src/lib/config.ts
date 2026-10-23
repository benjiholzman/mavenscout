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
  member: {
    portfolio: { min: 3, max: 3 },
    socialLinks: 2,
    customDomain: false,
    // Exactly 1, on an employer entry (spec §2.2, §4.1).
    testimonials: { total: 1, onPortfolio: false },
  },
  featured: {
    portfolio: { min: 3, max: 10 },
    socialLinks: 5,
    customDomain: true,
    // One per entry, any employer entry or portfolio item; at least one on an
    // employer entry. `total: null` = no overall cap.
    testimonials: { total: null, onPortfolio: true },
  },
} as const

/** Portfolio item fields (spec §7.2). TUNABLE. */
export const PORTFOLIO_FIELD_LIMITS = {
  description: 1000,
  results: 500,
  images: 3,
  links: 3,
} as const

/** Whether each membership level needs a published audio testimonial on an
 *  employer entry to be listed (spec §2.1, §4.1). Read through
 *  lib/testimonials/rules testimonialRequired by the completeness rule (the
 *  editor panel, Submit and admin Approve), the replace-only rule, the
 *  withdrawal grace period and the listing check; the "vouched for" copy
 *  follows it (lib/testimonials/copy). TUNABLE. */
export const TESTIMONIAL_REQUIRED: Record<'member' | 'featured', boolean> = {
  member: true,
  featured: true,
}

/** Audio testimonial flow (spec §4.3, §4.5, §4.6). TUNABLE. */
export const TESTIMONIAL_RULES = {
  /** "Confirm it's me" code: single-use, valid this long. */
  codeTtlMinutes: 10,
  /** Wrong entries before the code is void (a new one can be sent). */
  codeMaxAttempts: 5,
  /** Codes one request can send in total. */
  codeMaxSends: 3,
  /** Recording cap, seconds (same as lib/media AUDIO_MAX_SECONDS). */
  maxSeconds: 120,
  /** After the required testimonial is withdrawn: days to replace it before
   *  the profile is unlisted. */
  graceDays: 30,
  /** A referee with more testimonials than this in the window is flagged. */
  volumeFlag: { max: 5, windowDays: 365 },
  /** Organizations added to the list this recently go to admin review. */
  newOrgDays: 90,
  /** Shared mailboxes, never a person (local part before @). */
  genericMailboxes: [
    'info', 'admin', 'administrator', 'projects', 'project', 'contact', 'office', 'hello',
    'team', 'hr', 'jobs', 'careers', 'support', 'mail', 'enquiries', 'enquiry', 'inquiries',
    'inquiry', 'secretariat', 'reception', 'general', 'noreply', 'no-reply', 'communications',
    'media', 'press', 'webmaster', 'postmaster', 'registry', 'procurement', 'finance',
  ],
} as const

/** Verification (spec §3, §10). TUNABLE. */
export const VERIFICATION_RULES = {
  /** A listed profile whose required item (identity, most recent employer,
   *  most recent degree) loses its check, or gains a newer job or degree,
   *  stays listed this long while it's re-checked; then it's unlisted until
   *  the check is done (same pattern as TESTIMONIAL_RULES.graceDays). */
  recheckDays: 30,
} as const

/** Hiring-manager sign-up (spec §9). The email code is mocked in this build
 *  (shown on screen), like the referee's. TUNABLE. */
export const MANAGER_SIGNUP_RULES = {
  /** Email code: single-use, valid this long. */
  codeTtlMinutes: 10,
  /** Wrong entries before the code is void (a new one can be sent). */
  codeMaxAttempts: 5,
  /** Codes one sign-up can send in total. */
  codeMaxSends: 3,
  /** Turnaround target for exception requests, as told to the requester. */
  exceptionTurnaround: 'usually within a day',
} as const
