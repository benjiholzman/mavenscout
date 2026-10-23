import { EXPERTISE_TIER_LIMITS, PROFILE_LIMITS, TESTIMONIAL_DEADLINE_DAYS } from './config'
import { expertiseTags } from './expertise'
import { spokenLanguages } from './languages'
import { membershipLimits } from './membership'
import { fmtDate } from './dates'
import { isActive, isLegacy, publishedEmployerTestimonials, testimonialRequired } from './testimonials/rules'
import type { AudioTestimonial, ExpertiseTier, Profile } from '../types/db'

// Profile minimums and maximums (docs/MavenScout-profiles-membership.md §7.1).
//
// One rule table, three uses:
// - completenessGaps: everything below a minimum or above a maximum — the
//   editor's completeness panel and the admin review queue.
// - checkSectionSave: a section save is refused when it
//     · goes over a maximum (data already over it may be edited as long as
//       it doesn't get further over), or
//     · on a listed profile, takes a section below a minimum it meets, or
//       further below one it already misses. Demo profiles seeded before
//       these minimums stay listed and editable.
//   Drafts can be saved below the minimums while they're built up.
// - Submitting for review needs no gaps; neither does admin Approve.
//
// The audio testimonial rule (spec §4.1, §4.4): a published testimonial on
// an employer entry is needed to go live, where config TESTIMONIAL_REQUIRED
// says so for the level. It isn't a section save, so only
// the panel, Submit and Approve check it. With TESTIMONIAL_DEADLINE_DAYS set
// it doesn't block Submit or Approve: approval starts the deadline instead
// (testimonial_grace_until), and the panel shows it.

/** Editor sections the rules belong to (the section ids in Onboarding). */
export type RuleSection = 'basics' | 'bio' | 'tags' | 'accreditations' | 'history' | 'portfolio' | 'testimonials' | 'verification'

export interface CompletenessInput {
  profile: Profile
  /** Saved portfolio items (their own table). */
  portfolioCount: number
  /** The profile's testimonials and requests, any status (their own table). */
  testimonials: AudioTestimonial[]
}

interface Rule {
  section: RuleSection
  label: string
  /** What's counted, for messages: [singular, plural]. */
  unit: [string, string]
  metric: (c: CompletenessInput) => number
  min?: (c: CompletenessInput) => number
  max?: (c: CompletenessInput) => number
  /** Replaces the standard message when the rule isn't met. */
  message?: (c: CompletenessInput) => string
  /** Whether a gap here blocks Submit and Approve (default true). */
  blocking?: boolean
}

/** "none published yet (waiting for Dr. Bello)"; the deadline after a withdrawal. */
function testimonialMessage(c: CompletenessInput): string {
  const open = c.testimonials.filter((t) => isActive(t) && !isLegacy(t) && t.work_history_entry_id)
  const waiting = open.find((t) => t.status !== 'published')
  const status = waiting
    ? waiting.submitted_at
      ? `${waiting.reference_name} recorded it, publish it`
      : `waiting for ${waiting.reference_name}`
    : 'request one from someone who supervised or contracted you'
  const withdrawn = c.testimonials.some((t) => t.withdrawn_at)
  const deadline = c.profile.testimonial_grace_until
    ? `; ${withdrawn ? 'replace it' : 'publish one'} by ${fmtDate(c.profile.testimonial_grace_until)} to stay listed`
    : TESTIMONIAL_DEADLINE_DAYS !== null && c.profile.approval_status !== 'approved'
      ? `; you can be listed first, then have ${TESTIMONIAL_DEADLINE_DAYS} days to publish one`
      : ''
  return `Audio testimonial on an employer entry: none published (${status}${deadline})`
}

const tierCount = (tier: ExpertiseTier) => (c: CompletenessInput) =>
  expertiseTags(c.profile).filter((t) => t.tier === tier).length

const fixed = (n: number) => () => n
const P = PROFILE_LIMITS

const RULES: Rule[] = [
  { section: 'bio', label: 'Professional summary', unit: ['character', 'characters'], metric: (c) => (c.profile.detailed_bio ?? '').trim().length, min: fixed(P.bio.min), max: fixed(P.bio.max) },
  { section: 'basics', label: 'Languages', unit: ['language', 'languages'], metric: (c) => spokenLanguages(c.profile).length, min: fixed(P.languages.min), max: fixed(P.languages.max) },
  ...(['core', 'strong', 'working'] as const).map(
    (tier): Rule => ({
      section: 'tags',
      label: { core: 'Core expertise', strong: 'Strong expertise', working: 'Working knowledge' }[tier],
      unit: ['item', 'items'],
      metric: tierCount(tier),
      min: fixed(EXPERTISE_TIER_LIMITS[tier].min),
      max: fixed(EXPERTISE_TIER_LIMITS[tier].max),
    }),
  ),
  { section: 'accreditations', label: 'Certifications', unit: ['certification', 'certifications'], metric: (c) => c.profile.accreditations.length, max: fixed(P.certifications.max) },
  { section: 'history', label: 'Work history', unit: ['entry', 'entries'], metric: (c) => c.profile.work_history.length, min: fixed(P.workHistory.min), max: fixed(P.workHistory.max) },
  { section: 'history', label: 'Education', unit: ['entry', 'entries'], metric: (c) => c.profile.education_history.length, min: fixed(P.education.min), max: fixed(P.education.max) },
  {
    section: 'history',
    label: 'Education entries without a degree',
    unit: ['entry', 'entries'],
    metric: (c) => c.profile.education_history.filter((e) => !e.degree_or_course?.trim()).length,
    max: fixed(0),
  },
  // Member: exactly 3; Featured Member: 3 to 10 (spec §2.2).
  { section: 'portfolio', label: 'Portfolio', unit: ['project', 'projects'], metric: (c) => c.portfolioCount, min: (c) => membershipLimits(c.profile).portfolio.min, max: (c) => membershipLimits(c.profile).portfolio.max },
  // At least 1, on an employer entry, where the level requires it (spec §4.1;
  // config TESTIMONIAL_REQUIRED).
  {
    section: 'testimonials',
    label: 'Audio testimonial on an employer entry',
    unit: ['testimonial', 'testimonials'],
    metric: (c) => publishedEmployerTestimonials(c.profile, c.testimonials).length,
    min: (c) => (testimonialRequired(c.profile) ? 1 : 0),
    message: testimonialMessage,
    blocking: TESTIMONIAL_DEADLINE_DAYS === null,
  },
]

export interface Gap {
  section: RuleSection
  message: string
  /** False: shown, but doesn't block Submit or Approve. */
  blocking?: boolean
}

/** Gaps that block Submit and Approve. */
export function blockingGaps(gaps: Gap[]): Gap[] {
  return gaps.filter((g) => g.blocking !== false)
}

function describe(rule: Rule, n: number, c: CompletenessInput): string | null {
  const min = rule.min?.(c)
  const max = rule.max?.(c)
  if (rule.message && ((min !== undefined && n < min) || (max !== undefined && n > max))) return rule.message(c)
  if (max === 0 && n > 0) return `${rule.label}: ${n} — add the degree to each entry`
  if (min !== undefined && min === max && n !== min) return `${rule.label}: exactly ${min} (you have ${n})`
  const unit = (k: number) => rule.unit[k === 1 ? 0 : 1]
  if (min !== undefined && n < min) return `${rule.label}: at least ${min} ${unit(min)} (you have ${n})`
  if (max !== undefined && n > max) return `${rule.label}: at most ${max} ${unit(max)} (you have ${n})`
  return null
}

/** Every rule the profile doesn't meet, in editor order. */
export function completenessGaps(c: CompletenessInput): Gap[] {
  return RULES.flatMap((rule) => {
    const message = describe(rule, rule.metric(c), c)
    return message ? [{ section: rule.section, message, ...(rule.blocking === false ? { blocking: false } : {}) }] : []
  })
}

/** Listed = approved and publicly browsable; the no-regression rule applies. */
export function isListedProfile(p: Profile): boolean {
  return p.approval_status === 'approved'
}

/** Why a section save is refused, or null. `before` is the saved state,
 *  `after` what the save would write. */
export function checkSectionSave(section: RuleSection, before: CompletenessInput, after: CompletenessInput): string | null {
  const listed = isListedProfile(before.profile)
  for (const rule of RULES.filter((r) => r.section === section)) {
    const was = rule.metric(before)
    const now = rule.metric(after)
    const max = rule.max?.(after)
    const min = rule.min?.(after)
    const overMax = max !== undefined && now > max && now > was
    const underMin = listed && min !== undefined && now < min && now < was
    if (overMax || underMin) return describe(rule, now, after)
  }
  return null
}
