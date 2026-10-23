import { supabase } from '../supabase'
import type { TestimonialActor } from '../../types/db'

// Audit trail per testimonial (docs/MavenScout-profiles-membership.md §4.6
// rule 7): code sent and confirmed, details edited and accepted, consent,
// submission, transcript edits, publish, removal, withdrawal, admin
// decisions, listens. Rows in testimonial_events outlive the recording.
//
// ⚠ This build writes events from the browser with the anon key, so a
// client could skip or forge them. The hardening pass moves each step into
// a server-side function that writes its own event (and captures the IP,
// which the browser can't see).

/** Device details the browser can report. The network half of the
 *  fingerprint (IP, ASN) needs the server. */
export function clientFingerprint(): Record<string, unknown> {
  if (typeof window === 'undefined') return {}
  return {
    user_agent: navigator.userAgent,
    platform: (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio}`,
    touch: navigator.maxTouchPoints > 0,
    network: 'not captured client-side (hardening pass)',
  }
}

export async function logEvent(
  testimonialId: string,
  event: string,
  actor: TestimonialActor,
  detail: Record<string, unknown> = {},
  { fingerprint = actor === 'referee' }: { fingerprint?: boolean } = {},
): Promise<void> {
  const { error } = await supabase.from('testimonial_events').insert({
    testimonial_id: testimonialId,
    event,
    actor,
    detail,
    fingerprint: fingerprint ? clientFingerprint() : null,
  })
  if (error) console.warn(`audit event "${event}" not saved: ${error.message}`)
}

/** Field-by-field changes, for "details edited" events. */
export function diffFields<T extends Record<string, unknown>>(before: T, after: T): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {}
  for (const k of Object.keys(after)) if (before[k] !== after[k]) out[k] = { from: before[k], to: after[k] }
  return out
}
