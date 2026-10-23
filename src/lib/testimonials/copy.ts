import { TESTIMONIAL_DEADLINE_DAYS, TESTIMONIAL_REQUIRED } from '../config'

// What we promise about verification and testimonials, in one place
// (docs/MavenScout-profiles-membership.md §0, §3.2). It follows the settings:
// a level's experts are only "vouched for" while that level requires a
// testimonial before listing (no TESTIMONIAL_DEADLINE_DAYS, which lets a
// profile list first). Identity and credentials are checked for everyone.

const beforeListing = TESTIMONIAL_DEADLINE_DAYS === null

/** Every listed expert has a published audio testimonial. */
export const EVERY_EXPERT_VOUCHED_FOR = TESTIMONIAL_REQUIRED.member && TESTIMONIAL_REQUIRED.featured && beforeListing

/** Every listed Featured Member has one (Members may). */
export const EVERY_FEATURED_VOUCHED_FOR = TESTIMONIAL_REQUIRED.featured && beforeListing

/** One sentence for referee-facing pages (the testimonial page, the request
 *  message). */
export const VOUCHED_FOR_LINE = EVERY_EXPERT_VOUCHED_FOR
  ? 'Every expert listed has their identity and credentials checked, and is vouched for on record by someone they worked with.'
  : EVERY_FEATURED_VOUCHED_FOR
    ? 'Every expert listed has their identity and credentials checked, and many are vouched for on record by someone they worked with: every Featured Member is.'
    : 'Every expert listed has their identity and credentials checked, and many are vouched for on record by someone they worked with.'

/** The testimonial requirement on both levels, for the consultant's billing
 *  page; null when it differs by level (TESTIMONIAL_MATRIX says it). */
export const TESTIMONIAL_REQUIREMENT_LINE: string | null = EVERY_EXPERT_VOUCHED_FOR
  ? 'At least one audio testimonial from someone you worked with'
  : TESTIMONIAL_DEADLINE_DAYS !== null && TESTIMONIAL_REQUIRED.member && TESTIMONIAL_REQUIRED.featured
    ? `At least one audio testimonial from someone you worked with, within ${TESTIMONIAL_DEADLINE_DAYS} days of being listed`
    : null

/** The billing comparison row for audio testimonials. */
export const TESTIMONIAL_MATRIX: { member: string; featured: string } = {
  member: TESTIMONIAL_REQUIRED.member ? 'Required: 1, on a job' : 'Optional: up to 1, on a job',
  featured: TESTIMONIAL_REQUIRED.featured ? 'At least 1 required; one per job or project' : 'Optional: one per job or project',
}

/** For the verification explainer's audio testimonials section. */
export const TESTIMONIAL_COVERAGE_LINE: string | null = EVERY_EXPERT_VOUCHED_FOR
  ? 'Every expert has at least one.'
  : EVERY_FEATURED_VOUCHED_FOR
    ? 'Every Featured Member has at least one, and many Members do too.'
    : null

/** What every listed expert has been through (§3.2): the one statement for
 *  the directory header, the About page, the verification explainer, the
 *  manager sign-up and the referee's "about MavenScout" page. */
export const VERIFIED_STATEMENT = EVERY_EXPERT_VOUCHED_FOR
  ? 'Every expert on MavenScout has had their identity, most recent employer, most recent degree and certifications checked, and has been vouched for on record by someone they worked with.'
  : EVERY_FEATURED_VOUCHED_FOR
    ? 'Every expert on MavenScout has had their identity, most recent employer, most recent degree and certifications checked. Every Featured Member, and many Members, also has an audio testimonial on record from someone they worked with.'
    : 'Every expert on MavenScout has had their identity, most recent employer, most recent degree and certifications checked.'
