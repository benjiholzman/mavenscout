import type { Gap } from '../completeness'
import type { VerificationState } from './state'

// Verification in the completeness panel (docs/MavenScout-profiles-membership.md
// §10). Two kinds of line:
// - gaps: what the consultant still has to do. Like the minimums, they block
//   Submit for review; a listed profile seeded before verification sees them
//   as warnings and stays listed until the step 5 re-seed.
// - waiting: what MavenScout checks next. They don't block Submit; admin
//   Approve needs every required item labelled (lib/verification/state passed).

export function verificationGaps(state: VerificationState): Gap[] {
  return [
    ...state.missing.map((message) => ({ section: 'verification' as const, message: `Verification: ${message}` })),
    ...state.required
      .filter((i) => i.status === 'action')
      .map((i) => ({ section: 'verification' as const, message: `${i.title}: ${i.note}` })),
  ]
}

export function verificationWaiting(state: VerificationState): string[] {
  return state.required
    .filter((i) => i.status === 'waiting')
    .map((i) => `${i.title}${i.kind === 'certification' ? ` (${i.summary})` : ''}: ${i.note}`)
}
