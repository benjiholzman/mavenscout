import { supabase } from '../supabase'
import { logEvent } from './audit'

// ============================================================================
// ⚑ MOCKED EMAIL (docs/MavenScout-profiles-membership.md §4.3, §4.4)
//
// Nothing is sent in this build. Each "email" — the referee's code, the
// consultant's new-testimonial notice, the referee's post-publication notice
// with its withdraw link — is written to the testimonial's audit trail as an
// `email_mocked` event, and admin shows them as a Mock outbox. The real pass
// sends from MavenScout's domain with SPF, DKIM and DMARC (§4.6 rule 9).
// The code email's body never contains the code in the audit trail.
//
// ⚑ MUST KEEP when real email is wired (docs/DEVELOPER-HANDOFF.md): nothing
// is ever sent for a testimonial on an is_demo profile. Demo referees carry
// made-up addresses at real organization domains, which could belong to real
// people. Those emails are logged as `email_suppressed_demo` instead (the
// admin outbox still shows them, so demo flows can follow their links). If
// the profile can't be read, the email is suppressed too (fail closed).
// ============================================================================

export type MockEmailKind = 'referee_code' | 'consultant_new_testimonial' | 'referee_published' | 'consultant_withdrawn'

export interface MockEmail {
  kind: MockEmailKind
  to: string
  subject: string
  body: string
  /** The one link the email carries, for the admin outbox. */
  link?: string
}

export async function sendMockEmail(testimonialId: string, email: MockEmail): Promise<void> {
  const demo = await isDemoTestimonial(testimonialId)
  await logEvent(testimonialId, demo ? 'email_suppressed_demo' : 'email_mocked', 'system', { ...email })
}

/** True when the testimonial belongs to an is_demo profile, or when that
 *  can't be established. */
export async function isDemoTestimonial(testimonialId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('audio_testimonials')
    .select('profile:profiles(is_demo)')
    .eq('id', testimonialId)
    .maybeSingle()
  const profile = (data as { profile: { is_demo: boolean } | null } | null)?.profile
  return Boolean(error || !profile || profile.is_demo)
}
