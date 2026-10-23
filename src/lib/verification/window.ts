import { VERIFICATION_RULES } from '../config'
import type { Profile } from '../../types/db'

// The re-check window (docs/MavenScout-profiles-membership.md §3, §10; config
// VERIFICATION_RULES.recheckDays). When a listed profile's identity, most
// recent employer or most recent degree loses its check, or a newer job or
// degree becomes the most recent one, the profile stays listed for the window
// while it's re-checked; past it, it's unlisted until the check is done
// (lib/listing). The window clears as soon as those items are labelled again.
//
// It only opens on a loss: a profile that was never verified (the demo
// profiles seeded before verification) doesn't get a deadline, and shows the
// gap as a warning instead (lib/completeness).

/** The verification_recheck_until change a transition calls for, or null. */
export function recheckPatch(
  profile: Pick<Profile, 'approval_status' | 'verification_recheck_until'>,
  corePassedBefore: boolean,
  corePassedAfter: boolean,
  now = new Date(),
): Pick<Profile, 'verification_recheck_until'> | null {
  if (corePassedAfter) return profile.verification_recheck_until ? { verification_recheck_until: null } : null
  if (profile.approval_status !== 'approved' || !corePassedBefore || profile.verification_recheck_until) return null
  return { verification_recheck_until: new Date(now.getTime() + VERIFICATION_RULES.recheckDays * 86_400_000).toISOString() }
}

export function recheckLapsed(p: Pick<Profile, 'verification_recheck_until'>, now = new Date()): boolean {
  return !!p.verification_recheck_until && Date.parse(p.verification_recheck_until) < now.getTime()
}
