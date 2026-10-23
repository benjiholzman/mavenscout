import { TESTIMONIAL_RULES } from '../config'
import type { OrgIndex } from '../organizations'
import { supabase } from '../supabase'
import type { AudioTestimonial, Profile, ReviewFlag, TestimonialRelationship } from '../../types/db'
import { logEvent } from './audit'
import { checkRefereeEmail, holdsLink, normalizeEmail } from './integrity'
import { precheckReferee } from './precheck'
import { periodLabel, type TestimonialTarget } from './rules'

// Making, cancelling and reviewing testimonial requests
// (docs/MavenScout-profiles-membership.md §4.2, §4.6).
//
// Order: integrity rules (blocks stop the form) → placeholder pre-check →
// the request row. A request with a holding flag is saved without a link and
// waits in the admin queue; otherwise the link exists straight away and the
// consultant sends it personally (no email from MavenScout).

/** Unguessable link token. */
export function newToken(length = 24): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

export function requestUrl(token: string): string {
  return `${window.location.origin}/testimonial/${token}`
}

export interface RequestDetails {
  name: string
  title: string
  organization: string
  organizationId: string | null
  email: string
  relationship: TestimonialRelationship
  periodStart: number | null
  periodEnd: number | null
  context: string
}

export type RequestOutcome =
  | { ok: false; blocks: string[] }
  | { ok: true; row: AudioTestimonial; held: boolean; flags: ReviewFlag[] }

/** How many testimonials this address has given or been asked for in the
 *  volume window (any consultant), for the §4.6 rule 6 flag. */
async function recentCountFor(email: string, excludeId?: string): Promise<number> {
  const since = new Date(Date.now() - TESTIMONIAL_RULES.volumeFlag.windowDays * 86_400_000).toISOString()
  let q = supabase
    .from('audio_testimonials')
    .select('id', { count: 'exact', head: true })
    .eq('referee_email', email)
    .gte('created_at', since)
    .or('precheck_status.is.null,precheck_status.neq.rejected')
  if (excludeId) q = q.neq('id', excludeId)
  const { count } = await q
  return count ?? 0
}

export async function createRequest({
  profile,
  target,
  replaces,
  details,
  orgs,
}: {
  profile: Profile
  target: TestimonialTarget
  replaces?: AudioTestimonial | null
  details: RequestDetails
  orgs: OrgIndex
}): Promise<RequestOutcome> {
  const missing = [
    !details.name.trim() && "the referee's name",
    !details.title.trim() && 'their current job title',
    !details.organization.trim() && 'their current organization',
    !details.email.trim() && 'their institutional email',
    !details.periodStart && 'when you worked together',
  ].filter(Boolean)
  if (missing.length) return { ok: false, blocks: [`Add ${missing.join(', ')}.`] }
  if (details.periodEnd && details.periodStart && details.periodEnd < details.periodStart)
    return { ok: false, blocks: ['The period ends before it starts.'] }

  const email = normalizeEmail(details.email)
  const check = checkRefereeEmail(email, {
    consultant: profile,
    orgs,
    refereeName: details.name,
    recentCount: await recentCountFor(email),
  })
  if (check.blocks.length) return { ok: false, blocks: check.blocks }

  const pre = await precheckReferee({
    name: details.name,
    title: details.title,
    organization: details.organization,
    organizationId: details.organizationId,
    emailOrg: check.org,
    orgs,
  })
  const flags = [...check.flags, ...pre.flags]
  const held = flags.some(holdsLink)

  const { data, error } = await supabase
    .from('audio_testimonials')
    .insert({
      profile_id: profile.id,
      work_history_entry_id: target.kind === 'employer' ? target.entry.id : null,
      portfolio_item_id: target.kind === 'portfolio' ? target.item.id : null,
      reference_name: details.name.trim(),
      reference_title: details.title.trim(),
      reference_org: details.organization.trim(),
      relationship: details.relationship,
      referee_email: email,
      referee_org_id: check.org?.id ?? null,
      period_start: details.periodStart,
      period_end: details.periodEnd,
      context: details.context.trim() || null,
      source: 'reference_direct',
      status: 'pending',
      submission_token: held ? null : newToken(),
      precheck_status: held ? 'review' : 'passed',
      review_flags: flags,
      replaces_id: replaces?.id ?? null,
    })
    .select('*')
    .single()
  if (error) return { ok: false, blocks: [error.message] }
  const row = data as AudioTestimonial
  await logEvent(row.id, 'requested', 'consultant', {
    target: target.kind === 'employer' ? `employer:${target.entry.organization}` : `portfolio:${target.item.project_name}`,
    referee_email: email,
    period: periodLabel(details.periodStart, details.periodEnd),
    replaces: replaces?.id ?? null,
    precheck: pre.status,
    flags,
  })
  await logEvent(row.id, held ? 'held_for_review' : 'link_created', 'system', held ? { flags } : {})
  return { ok: true, row, held, flags }
}

/** Withdraws a request that hasn't been recorded. The link stops working. */
export async function cancelRequest(t: AudioTestimonial): Promise<string | null> {
  const { error } = await supabase
    .from('audio_testimonials')
    .update({ status: 'removed', removed_at: new Date().toISOString() })
    .eq('id', t.id)
    .is('submitted_at', null)
  if (error) return error.message
  await logEvent(t.id, 'request_cancelled', 'consultant')
  return null
}

/** Admin clears a held request: the link is created. */
export async function clearHeldRequest(t: AudioTestimonial, note: string): Promise<string | null> {
  const { error } = await supabase
    .from('audio_testimonials')
    .update({ precheck_status: 'cleared', submission_token: newToken() })
    .eq('id', t.id)
  if (error) return error.message
  await logEvent(t.id, 'review_cleared', 'admin', { note: note || null })
  await logEvent(t.id, 'link_created', 'system')
  return null
}

/** Admin turns a held request down. */
export async function rejectHeldRequest(t: AudioTestimonial, note: string): Promise<string | null> {
  const { error } = await supabase
    .from('audio_testimonials')
    .update({ precheck_status: 'rejected', status: 'removed', removed_at: new Date().toISOString() })
    .eq('id', t.id)
  if (error) return error.message
  await logEvent(t.id, 'review_rejected', 'admin', { note: note || null })
  return null
}

/** "Amina" from "Dr. Amina Bello". */
export function refereeFirstName(name: string | null): string | null {
  return (name ?? '').trim().replace(/^((dr|prof|professor|mr|mrs|ms|mx)\.?\s+)+/i, '').split(/\s+/)[0] || null
}

/** The message the consultant sends personally (§4.2 step 3). */
export function suggestedMessage(profile: Profile, t: AudioTestimonial, url: string, about: string): string {
  const first = refereeFirstName(t.reference_name) ?? 'there'
  const period = periodLabel(t.period_start, t.period_end)
  return `Hi ${first},

I'm listed on MavenScout, where international development organizations find consultants, and each of us is vouched for by someone we worked with. Would you record a short audio testimonial about our work together${about ? ` at ${about}` : ''}${period ? ` (${period})` : ''}?

It takes about 5 minutes on your phone: confirm it's you with a code sent to ${t.referee_email}, check the details, and record up to 2 minutes answering three short prompts. Only verified hiring managers can listen, and you can withdraw it at any time.

${url}

Thank you,
${profile.name}`
}
