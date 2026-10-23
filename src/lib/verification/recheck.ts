import { loadOrgIndex } from '../organizations'
import { supabase } from '../supabase'
import type { AudioTestimonial, Profile } from '../../types/db'
import { loadVerification } from './store'
import { verificationState, type VerificationInput } from './state'
import { recheckPatch } from './window'

// Applying the re-check window (lib/verification/window) to changes that
// happen outside the editor: admin decisions and testimonial changes.

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
