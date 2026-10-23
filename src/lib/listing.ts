import { FIRMS_ENABLED } from './config'
import { graceLapsed } from './testimonials/rules'
import type { Profile } from '../types/db'

// Who is listed (spec §1, PRD 7.1): approved, with an active subscription,
// and an individual while firms are hidden. The directory, search, ranking
// pool and the ranking baseline all read the pool through this one rule.
// Direct /profile and /site links don't go through it, so they still open.
// A profile whose required testimonial was withdrawn stays listed for the
// grace period, then drops out until a replacement is published (§4.5).

export function isListed(p: Profile): boolean {
  return (
    p.approval_status === 'approved' &&
    p.subscription_status === 'active' &&
    (FIRMS_ENABLED || p.consultant_type === 'Individual') &&
    !graceLapsed(p)
  )
}
