import { membershipLimits } from '../membership'
import type { AudioTestimonial, PortfolioItem, Profile, WorkHistoryEntry } from '../../types/db'

// Testimonial rules (docs/MavenScout-profiles-membership.md §2.2, §4.1, §4.5):
// where a testimonial can be requested, which one is the required one, and
// the request lifecycle the consultant tracks.

export type TestimonialStage =
  | 'held' // pre-check or integrity flag: waiting for admin, no link yet
  | 'rejected' // admin turned the request down
  | 'link_created'
  | 'opened'
  | 'confirmed' // referee confirmed their email
  | 'recorded' // submitted, waiting for the consultant to publish
  | 'published'
  | 'withdrawn' // by the referee
  | 'removed' // by the consultant (or admin takedown); recording deleted
  | 'cancelled' // request withdrawn by the consultant before recording

export const STAGE_LABELS: Record<TestimonialStage, string> = {
  held: 'Held for review',
  rejected: 'Not approved',
  link_created: 'Link created',
  opened: 'Opened',
  confirmed: 'Email confirmed',
  recorded: 'Recorded — ready to publish',
  published: 'Published',
  withdrawn: 'Withdrawn by referee',
  removed: 'Removed',
  cancelled: 'Cancelled',
}

/** Progress steps shown to the consultant (§4.2 step 4). */
export const PROGRESS_STAGES: TestimonialStage[] = ['link_created', 'opened', 'recorded', 'published']

export function testimonialStage(t: AudioTestimonial): TestimonialStage {
  if (t.withdrawn_at) return 'withdrawn'
  if (t.precheck_status === 'rejected') return 'rejected'
  if (t.status === 'removed') return t.submitted_at || t.audio_path ? 'removed' : 'cancelled'
  if (t.status === 'published') return 'published'
  if (t.submitted_at || t.audio_path) return 'recorded'
  if (!t.submission_token) return 'held'
  if (t.confirmed_at) return 'confirmed'
  if (t.opened_at) return 'opened'
  return 'link_created'
}

const ENDED: TestimonialStage[] = ['rejected', 'withdrawn', 'removed', 'cancelled']

/** Still occupying its entry: anything from held to published. */
export function isActive(t: AudioTestimonial): boolean {
  return !ENDED.includes(testimonialStage(t))
}

/** Made before the referee flow (no confirmed referee email): "general" or
 *  candidate-uploaded references, shown until the step 5 re-seed. */
export function isLegacy(t: AudioTestimonial): boolean {
  return !t.referee_email
}

export type TestimonialTarget =
  | { kind: 'employer'; entry: WorkHistoryEntry }
  | { kind: 'portfolio'; item: PortfolioItem }

export function targetKey(target: TestimonialTarget): string {
  return target.kind === 'employer' ? `w:${target.entry.id}` : `p:${target.item.id}`
}

export function rowTargetKey(t: AudioTestimonial): string | null {
  if (t.work_history_entry_id) return `w:${t.work_history_entry_id}`
  if (t.portfolio_item_id && !isLegacy(t)) return `p:${t.portfolio_item_id}`
  return null
}

/** Published testimonials on an employer entry the profile still has. */
export function publishedEmployerTestimonials(profile: Profile, rows: AudioTestimonial[]): AudioTestimonial[] {
  const ids = new Set(profile.work_history.map((w) => w.id).filter(Boolean))
  return rows.filter(
    (t) => testimonialStage(t) === 'published' && !!t.work_history_entry_id && ids.has(t.work_history_entry_id),
  )
}

/** The required testimonial (§4.5): the only published one on an employer
 *  entry. It can be replaced, never just removed. */
export function isRequired(t: AudioTestimonial, profile: Profile, rows: AudioTestimonial[]): boolean {
  const employer = publishedEmployerTestimonials(profile, rows)
  return employer.length === 1 && employer[0].id === t.id
}

/** An active request replacing this one, if any. */
export function replacementOf(t: AudioTestimonial, rows: AudioTestimonial[]): AudioTestimonial | null {
  return rows.find((r) => r.replaces_id === t.id && isActive(r)) ?? null
}

export type RequestBlock =
  | 'taken' // this entry already has one
  | 'upgrade' // Member with their one testimonial (or request) already
  | 'featured_only' // portfolio items: Featured Members only
  | 'unsaved' // employer entry without an id yet

/** Whether a new request can be made on this entry, or why not. Members get
 *  exactly 1 (an open request counts); Featured Members one per entry.
 *  Replacements go through canReplace instead. */
export function requestBlock(
  target: TestimonialTarget,
  profile: Profile,
  rows: AudioTestimonial[],
): RequestBlock | null {
  if (target.kind === 'employer' && !target.entry.id) return 'unsaved'
  const limits = membershipLimits(profile).testimonials
  if (target.kind === 'portfolio' && !limits.onPortfolio) return 'featured_only'
  // Legacy references don't take a slot: they're what the flow replaces.
  const active = rows.filter((t) => isActive(t) && !isLegacy(t))
  if (active.some((t) => rowTargetKey(t) === targetKey(target))) return 'taken'
  if (limits.total !== null && active.length >= limits.total) return 'upgrade'
  return null
}

/** The required testimonial can be replaced while no replacement is under way. */
export function canReplace(t: AudioTestimonial, profile: Profile, rows: AudioTestimonial[]): boolean {
  return isRequired(t, profile, rows) && !replacementOf(t, rows)
}

/** Employer entries a replacement can go on: free ones, or the replaced one's. */
export function replacementTargets(t: AudioTestimonial, profile: Profile, rows: AudioTestimonial[]): WorkHistoryEntry[] {
  const taken = new Set(rows.filter(isActive).map(rowTargetKey))
  return profile.work_history.filter((w) => w.id && (w.id === t.work_history_entry_id || !taken.has(`w:${w.id}`)))
}

/** "Supervised" / "Contracted" — the verb for a confirmation line. */
export function relationshipVerb(relationship: string | null): string {
  return relationship === 'client' ? 'Contracted' : 'Supervised'
}

export function periodLabel(start: number | null, end: number | null): string | null {
  if (!start) return null
  if (end === start) return String(start)
  return `${start}–${end ?? 'present'}`
}
