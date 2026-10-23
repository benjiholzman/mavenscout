// ---------------------------------------------------------------------------
// Visibility rules (PRD 7.2a) — THE single source of truth.
// Two independent rules stack: a SURFACE rule (/site vs /profile) and an
// AUTH rule (logged in or not) on the platform. This is a fixed rule set by
// route + auth state — never a per-profile setting.
// ---------------------------------------------------------------------------

export type Surface = 'site' | 'platform'

/** 'shown' — render normally. 'gated' — render an inviting sign-up prompt
 *  in its place (PRD 7.9a). 'hidden' — strip entirely, no trace. */
export type Visibility = 'shown' | 'gated' | 'hidden'

export interface VisibilityRules {
  /** Header, bio, portfolio, experience/education, skills — always full. */
  coreContent: 'shown'
  /** Availability in At-a-Glance: platform-facing, never on the public site. */
  availability: Visibility
  /** Contracting & Work Eligibility (PRD 7.18). */
  contractingEligibility: Visibility
  /** Video Q&As — the 5 standard-question videos, Featured Members only
   *  (profiles-membership §5). Never public; never on the personal site. */
  videoQnas: Visibility
  /** Audio testimonials, inline on employer entries and portfolio items
   *  (profiles-membership §4.4), and the Overview summary line. */
  audioTestimonials: Visibility
  /** Favorite / Top Pick save actions. */
  saveActions: Visibility
  /** Whether the Video Q&As tab can exist at all (Featured Members only).
   *  There is no separate Audio Testimonials tab (spec §2.2). */
  videoTabExists: boolean
}

export function visibilityFor(surface: Surface, isLoggedIn: boolean): VisibilityRules {
  if (surface === 'site') {
    // Public personal website: gated/richer material is stripped entirely —
    // wherever attached (employer entry or portfolio item), regardless of viewer.
    return {
      coreContent: 'shown',
      availability: 'hidden',
      contractingEligibility: 'hidden',
      videoQnas: 'hidden',
      audioTestimonials: 'hidden',
      saveActions: 'hidden',
      videoTabExists: false,
    }
  }
  const gate: Visibility = isLoggedIn ? 'shown' : 'gated'
  return {
    coreContent: 'shown',
    availability: 'shown', // shown on /profile even logged out (PRD 7.2a table)
    contractingEligibility: gate,
    videoQnas: gate,
    audioTestimonials: gate,
    saveActions: gate,
    videoTabExists: true,
  }
}
