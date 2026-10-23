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
  await logEvent(testimonialId, 'email_mocked', 'system', { ...email })
}
