import { TESTIMONIAL_RULES } from '../config'
import { supabase } from '../supabase'
import type { AudioTestimonial, Profile, TestimonialActor } from '../../types/db'
import { logEvent } from './audit'
import { sendMockEmail } from './outbox'
import { isRequired, publishedEmployerTestimonials } from './rules'

// After submission (docs/MavenScout-profiles-membership.md §4.4–4.5):
// publish, remove, and the referee's withdrawal.
//
// - The consultant publishes; the referee then gets a notice with a withdraw
//   link. Publishing a replacement takes the replaced one down.
// - The required testimonial (the only published one on an employer entry)
//   can only be replaced; extras can be removed freely, without telling the
//   referee. Removal deletes the recording and transcript, keeping the row
//   and its events as the audit record.
// - A referee can withdraw at any time. If it was the required testimonial
//   the consultant gets a grace period to replace it before being unlisted.

export function withdrawUrl(token: string): string {
  return `${window.location.origin}/testimonial/withdraw/${token}`
}

/** The consultant's profile and all their testimonials, for the rules. */
async function loadOwner(profileId: string): Promise<{ profile: Profile; rows: AudioTestimonial[] }> {
  const [p, r] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', profileId).single(),
    supabase.from('audio_testimonials').select('*').eq('profile_id', profileId),
  ])
  if (p.error) throw new Error(p.error.message)
  return { profile: p.data as Profile, rows: (r.data as AudioTestimonial[]) ?? [] }
}

/** Deletes the recording and transcript; the row stays as the audit record. */
async function takeDown(t: AudioTestimonial, patch: Partial<AudioTestimonial>): Promise<void> {
  if (t.audio_path) {
    const { error } = await supabase.storage.from('audio-testimonials').remove([t.audio_path])
    if (error) console.warn(`recording not deleted from storage: ${error.message}`)
  }
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('audio_testimonials')
    .update({ status: 'removed', removed_at: now, audio_path: null, transcript: null, ...patch })
    .eq('id', t.id)
  if (error) throw new Error(error.message)
}

export async function publishTestimonial(t: AudioTestimonial): Promise<void> {
  const { profile, rows } = await loadOwner(t.profile_id)
  const { error } = await supabase
    .from('audio_testimonials')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', t.id)
  if (error) throw new Error(error.message)
  await logEvent(t.id, 'published', 'consultant')

  // A replacement is live: the old one comes down (§4.5).
  const replaced = t.replaces_id ? rows.find((r) => r.id === t.replaces_id) : null
  if (replaced && replaced.status !== 'removed') {
    await takeDown(replaced, {})
    await logEvent(replaced.id, 'replaced', 'consultant', { by: t.id })
  }
  // A new employer testimonial ends a withdrawal grace period.
  if (t.work_history_entry_id && profile.testimonial_grace_until) {
    await supabase.from('profiles').update({ testimonial_grace_until: null }).eq('id', profile.id)
    await logEvent(t.id, 'grace_period_cleared', 'system')
  }

  if (t.withdraw_token && t.referee_email)
    await sendMockEmail(t.id, {
      kind: 'referee_published',
      to: t.referee_email,
      subject: `Your testimonial for ${profile.name} is live on MavenScout`,
      body: `You recorded a testimonial for ${profile.name}, now live on MavenScout. Only verified hiring managers can listen. If this wasn't you, report it here. You can also withdraw it at any time with the same link.`,
      link: withdrawUrl(t.withdraw_token),
    })
}

/** Whether the consultant may remove this one (§4.5): anything but the
 *  required testimonial. Unpublished submissions can always be declined. */
export function canRemove(t: AudioTestimonial, profile: Profile, rows: AudioTestimonial[]): boolean {
  return t.status !== 'published' || !isRequired(t, profile, rows)
}

export async function removeTestimonial(t: AudioTestimonial, actor: Extract<TestimonialActor, 'consultant' | 'admin'>, note?: string): Promise<void> {
  if (actor === 'consultant') {
    const { profile, rows } = await loadOwner(t.profile_id)
    if (!canRemove(t, profile, rows)) throw new Error('Your required testimonial can only be replaced, not removed.')
  }
  const wasPublished = t.status === 'published'
  await takeDown(t, {})
  await logEvent(t.id, wasPublished ? 'removed' : 'declined', actor, note ? { note } : {})
}

export async function loadByWithdrawToken(token: string): Promise<{ t: AudioTestimonial; consultantName: string } | null> {
  const { data: t } = await supabase.from('audio_testimonials').select('*').eq('withdraw_token', token).maybeSingle()
  if (!t) return null
  const { data: p } = await supabase.from('profiles').select('name').eq('id', t.profile_id).maybeSingle()
  return { t: t as AudioTestimonial, consultantName: (p as { name: string } | null)?.name ?? 'the consultant' }
}

/** The referee withdraws (§4.5), optionally reporting that it wasn't them. */
export async function withdrawTestimonial(t: AudioTestimonial, reportNotMe: boolean): Promise<void> {
  const { profile, rows } = await loadOwner(t.profile_id)
  const required = t.status === 'published' && isRequired(t, profile, rows)
  const now = new Date()
  await takeDown(t, {
    withdrawn_at: now.toISOString(),
    review_flags: reportNotMe
      ? [...t.review_flags, { code: 'reported_not_me', message: "The referee reported that they didn't record this testimonial." }]
      : t.review_flags,
  })
  await logEvent(t.id, reportNotMe ? 'reported_not_me' : 'withdrawn', 'referee')

  let graceUntil: string | null = null
  // Still has another published employer testimonial? Then nothing is missing.
  const othersLeft = publishedEmployerTestimonials(profile, rows).some((r) => r.id !== t.id)
  if (required && !othersLeft) {
    graceUntil = profile.testimonial_grace_until ?? new Date(now.getTime() + TESTIMONIAL_RULES.graceDays * 86_400_000).toISOString()
    await supabase.from('profiles').update({ testimonial_grace_until: graceUntil }).eq('id', profile.id)
    await logEvent(t.id, 'grace_period_started', 'system', { until: graceUntil })
  }
  await sendMockEmail(t.id, {
    kind: 'consultant_withdrawn',
    to: profile.email ?? '(no account email on file)',
    subject: `${t.reference_name ?? 'Your referee'} withdrew their testimonial`,
    body: graceUntil
      ? `${t.reference_name} withdrew their testimonial. It was your required one: replace it by ${new Date(graceUntil).toLocaleDateString()} to stay listed.`
      : `${t.reference_name} withdrew their testimonial. It has been removed from your profile.`,
  })
}
