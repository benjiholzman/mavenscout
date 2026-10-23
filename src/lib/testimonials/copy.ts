import { TESTIMONIAL_REQUIRED } from '../config'

// The "every expert is vouched for" promise, in one place
// (docs/MavenScout-profiles-membership.md §0, §3.2). It follows the setting:
// it's only true while every membership level requires a testimonial.

/** Every listed expert has a published audio testimonial. */
export const EVERY_EXPERT_VOUCHED_FOR = TESTIMONIAL_REQUIRED.member && TESTIMONIAL_REQUIRED.featured

/** One sentence for referee- and manager-facing pages. */
export const VOUCHED_FOR_LINE = EVERY_EXPERT_VOUCHED_FOR
  ? 'Every expert listed is vouched for on record by someone they worked with.'
  : 'Experts can be vouched for on record by someone they worked with.'

/** The membership requirement, for the consultant's billing page; null when
 *  no level requires a testimonial. */
export const TESTIMONIAL_REQUIREMENT_LINE: string | null = EVERY_EXPERT_VOUCHED_FOR
  ? 'At least one audio testimonial from someone you worked with'
  : TESTIMONIAL_REQUIRED.member
    ? 'Members: at least one audio testimonial from someone you worked with'
    : TESTIMONIAL_REQUIRED.featured
      ? 'Featured Members: at least one audio testimonial from someone you worked with'
      : null
