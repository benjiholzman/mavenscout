import { VERIFICATION_RULES } from '../config'
import { loadOrgIndex } from '../organizations'
import { supabase } from '../supabase'
import type { AudioTestimonial, Profile } from '../../types/db'
import { loadVerification } from './store'
import { verificationState, type VerificationInput } from './state'

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

/** Everything verificationState needs for one profile, fresh from the
 *  database. */
export async function loadVerificationInput(profileId: string): Promise<VerificationInput | null> {
  const [{ data: profile }, { data: testimonials }, verification, orgs] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', profileId).maybeSingle(),
    supabase.from('audio_testimonials').select('*').eq('profile_id', profileId),
    loadVerification(profileId),
    loadOrgIndex(),
  ])
  if (!profile) return null
  return { profile: profile as Profile, testimonials: (testimonials as AudioTestimonial[]) ?? [], orgs, ...verification }
}

/** Runs a change that can make a profile gain or lose a check (an admin
 *  decision, a testimonial published, withdrawn or removed), then opens or
 *  clears the re-check window to match. */
export async function withRecheck<T>(profileId: string, change: () => Promise<T>): Promise<T> {
  const before = await loadVerificationInput(profileId)
  const result = await change()
  const after = await loadVerificationInput(profileId)
  if (before && after) {
    const patch = recheckPatch(
      after.profile,
      verificationState(before).corePassed,
      verificationState(after).corePassed,
    )
    if (patch) await supabase.from('profiles').update(patch).eq('id', profileId)
  }
  return result
}
