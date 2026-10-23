import { toPortableAudio } from '../audioFormat'
import { TESTIMONIAL_RULES } from '../config'
import { findManagerByEmail } from '../managers'
import { uploadAudioFile } from '../media'
import { supabase } from '../supabase'
import type { AudioTestimonial, PortfolioItem, Profile, TestimonialRelationship } from '../../types/db'
import { diffFields, logEvent } from './audit'
import { codeExpiry, generateCode, hashSecret, normalizeCodeInput } from './code'
import { sendMockEmail } from './outbox'
import { newToken } from './requests'

// The referee's side of a testimonial (docs/MavenScout-profiles-membership.md
// §4.3): open the link, confirm their institutional email with a code, review
// the details, record and submit, transcript, then an optional account.
//
// ⚠ SECURITY: /testimonial/:token is an unauthenticated page writing with the
// anon key under permissive dev RLS, and the code is checked in the browser.
// Every function here becomes a server-side endpoint in the hardening pass
// (token validated server-side, code sent by email and verified there, rate
// limits, MIME/size caps at the storage policy, IP captured for the audit).

export type RefereeConsultant = Pick<Profile, 'id' | 'name' | 'handle' | 'photo_url' | 'work_history'>

export interface RefereeRequest {
  t: AudioTestimonial
  consultant: RefereeConsultant
  /** What the testimonial is about: the employer entry's organization, or the portfolio project. */
  about: { kind: 'employer' | 'portfolio'; label: string; role: string | null }
}

export async function loadRequest(token: string): Promise<RefereeRequest | null> {
  const { data: t } = await supabase.from('audio_testimonials').select('*').eq('submission_token', token).maybeSingle()
  if (!t) return null
  const { data: consultant } = await supabase
    .from('profiles')
    .select('id,name,handle,photo_url,work_history')
    .eq('id', t.profile_id)
    .maybeSingle()
  if (!consultant) return null
  const row = t as AudioTestimonial
  const entry = (consultant as RefereeConsultant).work_history.find((w) => w.id === row.work_history_entry_id)
  let about: RefereeRequest['about'] = { kind: 'employer', label: entry?.organization ?? '', role: entry?.role ?? null }
  if (!entry && row.portfolio_item_id) {
    const { data: item } = await supabase.from('portfolio_items').select('project_name,role').eq('id', row.portfolio_item_id).maybeSingle()
    about = { kind: 'portfolio', label: (item as PortfolioItem | null)?.project_name ?? '', role: (item as PortfolioItem | null)?.role ?? null }
  }
  return { t: row, consultant: consultant as RefereeConsultant, about }
}

async function update(t: AudioTestimonial, patch: Partial<AudioTestimonial>): Promise<AudioTestimonial> {
  const { data, error } = await supabase.from('audio_testimonials').update(patch).eq('id', t.id).select('*').single()
  if (error) throw new Error(error.message)
  return data as AudioTestimonial
}

/** First visit only: the consultant's progress shows "Opened". */
export async function markOpened(t: AudioTestimonial): Promise<AudioTestimonial> {
  if (t.opened_at) return t
  // Only the first concurrent caller sets it (and logs it).
  const { data } = await supabase
    .from('audio_testimonials')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', t.id)
    .is('opened_at', null)
    .select('*')
  const next = (data as AudioTestimonial[] | null)?.[0]
  if (!next) return t
  await logEvent(t.id, 'link_opened', 'referee')
  return next
}

// ---- "Confirm it's me" -------------------------------------------------------

export type SendCodeResult =
  | { ok: true; t: AudioTestimonial; devCode: string }
  | { ok: false; message: string }

export async function sendCode(t: AudioTestimonial, consultantName: string): Promise<SendCodeResult> {
  if (t.code_sends >= TESTIMONIAL_RULES.codeMaxSends)
    return { ok: false, message: `We've already sent ${TESTIMONIAL_RULES.codeMaxSends} codes for this link. Ask ${consultantName} for a new link.` }
  const code = generateCode()
  const next = await update(t, {
    code_hash: await hashSecret(code, t.id),
    code_sent_at: new Date().toISOString(),
    code_expires_at: codeExpiry(),
    code_attempts: 0,
    code_sends: t.code_sends + 1,
  })
  await sendMockEmail(t.id, {
    kind: 'referee_code',
    to: t.referee_email ?? '',
    subject: `Your MavenScout code for ${consultantName}'s testimonial`,
    body: `Your code is [code withheld from the audit trail]. It works once, for ${TESTIMONIAL_RULES.codeTtlMinutes} minutes.`,
  })
  await logEvent(t.id, 'code_sent', 'referee', { send: next.code_sends })
  return { ok: true, t: next, devCode: code }
}

const nonceKey = (t: AudioTestimonial) => `ms_testimonial_confirm_${t.id}`

export type VerifyResult =
  | { ok: true; t: AudioTestimonial }
  | { ok: false; t: AudioTestimonial; message: string; needNewCode: boolean }

export async function verifyCode(t: AudioTestimonial, raw: string): Promise<VerifyResult> {
  const code = normalizeCodeInput(raw)
  if (!t.code_hash || !t.code_expires_at)
    return { ok: false, t, message: 'Send yourself a code first.', needNewCode: true }
  if (Date.parse(t.code_expires_at) < Date.now())
    return { ok: false, t, message: 'That code has expired. Send a new one.', needNewCode: true }
  if (t.code_attempts >= TESTIMONIAL_RULES.codeMaxAttempts)
    return { ok: false, t, message: 'Too many tries with that code. Send a new one.', needNewCode: true }

  if (code.length !== 6 || (await hashSecret(code, t.id)) !== t.code_hash) {
    const next = await update(t, { code_attempts: t.code_attempts + 1 })
    await logEvent(t.id, 'code_failed', 'referee', { attempt: next.code_attempts })
    const left = TESTIMONIAL_RULES.codeMaxAttempts - next.code_attempts
    return left > 0
      ? { ok: false, t: next, message: `That code isn't right. ${left} ${left === 1 ? 'try' : 'tries'} left.`, needNewCode: false }
      : { ok: false, t: next, message: 'Too many tries with that code. Send a new one.', needNewCode: true }
  }

  // Single use: the hash is cleared. The confirmation is bound to this browser
  // tab with a nonce, so a reload resumes but another device must confirm again.
  const nonce = newToken(32)
  const next = await update(t, {
    code_hash: null,
    code_expires_at: null,
    confirmed_at: new Date().toISOString(),
    confirm_nonce_hash: await hashSecret(nonce, t.id),
  })
  try {
    sessionStorage.setItem(nonceKey(t), nonce)
  } catch {
    /* private mode: the confirmation lasts for this page view only */
  }
  await logEvent(t.id, 'code_confirmed', 'referee', { email: t.referee_email })
  return { ok: true, t: next }
}

/** This tab confirmed the email (see verifyCode). */
export async function isConfirmedHere(t: AudioTestimonial): Promise<boolean> {
  if (!t.confirmed_at || !t.confirm_nonce_hash) return false
  let nonce: string | null = null
  try {
    nonce = sessionStorage.getItem(nonceKey(t))
  } catch {
    return false
  }
  return !!nonce && (await hashSecret(nonce, t.id)) === t.confirm_nonce_hash
}

// ---- review, record, submit ---------------------------------------------------

export interface RefereeDetails {
  reference_name: string
  reference_title: string
  reference_org: string
  relationship: TestimonialRelationship
  period_start: number | null
  period_end: number | null
  context: string
}

export function detailsOf(t: AudioTestimonial): RefereeDetails {
  return {
    reference_name: t.reference_name ?? '',
    reference_title: t.reference_title ?? '',
    reference_org: t.reference_org ?? '',
    relationship: t.relationship === 'client' ? 'client' : 'supervisor',
    period_start: t.period_start,
    period_end: t.period_end,
    context: t.context ?? '',
  }
}

/** Accepting is the referee's attestation (§4.3 step 3). Edits are logged. */
export async function acceptDetails(t: AudioTestimonial, d: RefereeDetails): Promise<AudioTestimonial> {
  const clean: RefereeDetails = {
    ...d,
    reference_name: d.reference_name.trim(),
    reference_title: d.reference_title.trim(),
    reference_org: d.reference_org.trim(),
    context: d.context.trim(),
  }
  const changes = diffFields({ ...detailsOf(t) }, { ...clean })
  const next = await update(t, { ...clean, context: clean.context || null, details_accepted_at: new Date().toISOString() })
  await logEvent(t.id, 'details_accepted', 'referee', Object.keys(changes).length ? { edited: changes } : { edited: false })
  return next
}

/** Saves the audio immediately (§4.3 step 5), converted to a format every
 *  browser plays. The transcript comes after and never blocks this. */
export async function submitRecording(
  t: AudioTestimonial,
  file: File,
  recordedSeconds: number | null,
): Promise<{ t: AudioTestimonial; duration: number; audio: File }> {
  if (!(await isConfirmedHere(t))) throw new Error('Please confirm your email again before submitting.')
  const portable = await toPortableAudio(file)
  const known = recordedSeconds ?? portable.duration ?? undefined
  const up = await uploadAudioFile(t.profile_id, portable.file, known ?? undefined)
  const now = new Date().toISOString()
  const next = await update(t, {
    audio_path: up.path,
    duration_seconds: up.duration,
    consent_at: now,
    submitted_at: now,
    withdraw_token: newToken(),
    transcript_source: 'auto',
  })
  await logEvent(t.id, 'consent_given', 'referee')
  await logEvent(t.id, 'recording_submitted', 'referee', {
    duration_seconds: up.duration,
    format: portable.file.type,
    original_format: file.type || file.name,
    via: recordedSeconds !== null ? 'in-browser recording' : 'uploaded file',
  })
  // The consultant listens and publishes (§4.4).
  const { data: owner } = await supabase.from('profiles').select('name,email').eq('id', t.profile_id).maybeSingle()
  await sendMockEmail(t.id, {
    kind: 'consultant_new_testimonial',
    to: (owner as { email: string | null } | null)?.email ?? '(no account email on file)',
    subject: `${t.reference_name} recorded your testimonial`,
    body: `${t.reference_name} recorded an audio testimonial for you. Listen to it and publish it from your profile editor.`,
    link: `${window.location.origin}/onboarding#testimonials`,
  })
  return { t: next, duration: up.duration, audio: portable.file }
}

export async function saveTranscript(
  t: AudioTestimonial,
  text: string,
  source: 'auto' | 'edited',
  confirmed: boolean,
): Promise<AudioTestimonial> {
  const next = await update(t, {
    transcript: text,
    transcript_source: source,
    transcript_confirmed_at: confirmed ? new Date().toISOString() : t.transcript_confirmed_at,
  })
  if (source === 'edited') await logEvent(t.id, 'transcript_edited', 'referee', { from: t.transcript, to: text })
  else if (confirmed) await logEvent(t.id, 'transcript_confirmed', 'referee')
  return next
}

export async function setOptIn(t: AudioTestimonial, optIn: boolean): Promise<AudioTestimonial> {
  const next = await update(t, { referee_opt_in: optIn })
  if (t.referee_manager_id)
    await supabase.from('hiring_managers').update({ updates_opt_in: optIn }).eq('id', t.referee_manager_id)
  await logEvent(t.id, optIn ? 'updates_opt_in' : 'updates_opt_out', 'referee')
  return next
}

/** One-click hiring-manager account (§4.3 step 7): the institutional email
 *  is already confirmed, so the account is active at once. An existing
 *  account with the same email is linked rather than duplicated. Sign-in
 *  itself is mocked in this build. */
export async function createManagerAccount(t: AudioTestimonial): Promise<AudioTestimonial> {
  if (t.referee_manager_id) return t
  const existing = t.referee_email ? await findManagerByEmail(t.referee_email) : null
  const confirmed = {
    account_status: 'active' as const,
    email_confirmed_at: t.confirmed_at ?? new Date().toISOString(),
    organization_id: t.referee_org_id,
  }
  let id: string
  if (existing) {
    const { error } = await supabase.from('hiring_managers').update(confirmed).eq('id', existing.id)
    if (error) throw new Error(error.message)
    id = existing.id
  } else {
    const { data, error } = await supabase
      .from('hiring_managers')
      .insert({
        name: t.reference_name ?? '',
        organization: t.reference_org,
        email: t.referee_email,
        updates_opt_in: t.referee_opt_in,
        ...confirmed,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    id = data.id
  }
  const next = await update(t, { referee_manager_id: id })
  await logEvent(t.id, existing ? 'manager_account_linked' : 'manager_account_created', 'referee', { hiring_manager_id: id })
  return next
}
