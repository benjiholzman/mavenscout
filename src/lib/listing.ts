import { FIRMS_ENABLED } from './config'
import type { Profile } from '../types/db'

// Who is listed (spec §1, PRD 7.1): approved, with an active subscription,
// and an individual while firms are hidden. The directory, search, ranking
// pool and the ranking baseline all read the pool through this one rule.
// Direct /profile and /site links don't go through it, so they still open.

export function isListed(p: Profile): boolean {
  return (
    p.approval_status === 'approved' &&
    p.subscription_status === 'active' &&
    (FIRMS_ENABLED || p.consultant_type === 'Individual')
  )
}
