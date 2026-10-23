import { MANAGER_SIGNUP_RULES } from './config'
import { supabase } from './supabase'
import { generateCode, hashSecret, normalizeCodeInput } from './testimonials/code'
import { emailDomain, isEmailShaped, normalizeEmail, orgForDomain } from './testimonials/integrity'
import type { OrgIndex } from './organizations'
import type { HiringManager, Organization } from '../types/db'

// Hiring-manager accounts (docs/MavenScout-profiles-membership.md §9).
//
// Free. Sign-up needs an institutional email whose domain is on the canonical
// organizations list (any organization type, firms included); the email is
// confirmed with a 6-digit code. Hirers without one request an exception,
// which an admin approves. Only `active` accounts unlock saving, ranking,
// Video Q&As and testimonials (lib/session hasAccess).
//
// ⚠ MOCKED in this build, like the referee code (lib/testimonials/code): the
// code is generated and checked in the browser and shown on screen instead of
// emailed, and the rows are written with the anon key. The hardening pass
// sends and verifies codes server-side and makes this a real Supabase Auth
// sign-up.

export type EmailCheck =
  | { ok: true; email: string; org: Organization }
  | { ok: false; reason: 'shape' | 'not_listed'; message: string }

/** Is this an institutional email at an organization on the list? */
export function checkInstitutionalEmail(raw: string, orgs: OrgIndex): EmailCheck {
  const email = normalizeEmail(raw)
  if (!isEmailShaped(email)) return { ok: false, reason: 'shape', message: 'Enter a full email address.' }
  const domain = emailDomain(email)
  const org = orgForDomain(orgs, domain)
  if (!org)
    return {
      ok: false,
      reason: 'not_listed',
      message: `${domain} isn't an organization on our list. Sign-up needs your work email at a recognised organization.`,
    }
  return { ok: true, email, org }
}

function codeExpiry(from = new Date()): string {
  return new Date(from.getTime() + MANAGER_SIGNUP_RULES.codeTtlMinutes * 60_000).toISOString()
}

async function update(hm: HiringManager, patch: Partial<HiringManager>): Promise<HiringManager> {
  const { data, error } = await supabase.from('hiring_managers').update(patch).eq('id', hm.id).select('*').single()
  if (error) throw new Error(error.message)
  return data as HiringManager
}

export async function loadManager(id: string): Promise<HiringManager | null> {
  const { data } = await supabase.from('hiring_managers').select('*').eq('id', id).maybeSingle()
  return (data as HiringManager | null) ?? null
}

export async function findManagerByEmail(raw: string): Promise<HiringManager | null> {
  // Emails are stored normalized (lower case), here and by the referee flow.
  const { data } = await supabase.from('hiring_managers').select('*').eq('email', normalizeEmail(raw)).limit(1)
  return ((data as HiringManager[] | null) ?? [])[0] ?? null
}

const ALREADY = 'There is already an account with this email. Log in instead.'

export type StartResult = { ok: true; hm: HiringManager; devCode: string } | { ok: false; message: string }

/** Sign up with an institutional email: creates the account (or picks up an
 *  unfinished one with the same email) and sends the first code. */
export async function startSignup(name: string, check: Extract<EmailCheck, { ok: true }>): Promise<StartResult> {
  const existing = await findManagerByEmail(check.email)
  if (existing?.account_status === 'active') return { ok: false, message: ALREADY }
  const fields = {
    name: name.trim(),
    email: check.email,
    organization: check.org.name,
    organization_id: check.org.id,
    account_status: 'awaiting_code' as const,
  }
  let hm: HiringManager
  if (existing) {
    hm = await update(existing, { ...fields, code_sends: 0 })
  } else {
    const { data, error } = await supabase.from('hiring_managers').insert(fields).select('*').single()
    if (error) return { ok: false, message: error.message }
    hm = data as HiringManager
  }
  return sendSignupCode(hm)
}

export async function sendSignupCode(hm: HiringManager): Promise<StartResult> {
  if (hm.code_sends >= MANAGER_SIGNUP_RULES.codeMaxSends)
    return {
      ok: false,
      message: `We've already sent ${MANAGER_SIGNUP_RULES.codeMaxSends} codes to this address. Start again in a little while.`,
    }
  const code = generateCode()
  const next = await update(hm, {
    code_hash: await hashSecret(code, hm.id),
    code_expires_at: codeExpiry(),
    code_attempts: 0,
    code_sends: hm.code_sends + 1,
  })
  return { ok: true, hm: next, devCode: code }
}

export type ConfirmResult =
  | { ok: true; hm: HiringManager }
  | { ok: false; hm: HiringManager; message: string; needNewCode: boolean }

export async function confirmSignupCode(hm: HiringManager, raw: string): Promise<ConfirmResult> {
  const code = normalizeCodeInput(raw)
  if (!hm.code_hash || !hm.code_expires_at) return { ok: false, hm, message: 'Send yourself a code first.', needNewCode: true }
  if (Date.parse(hm.code_expires_at) < Date.now())
    return { ok: false, hm, message: 'That code has expired. Send a new one.', needNewCode: true }
  if (hm.code_attempts >= MANAGER_SIGNUP_RULES.codeMaxAttempts)
    return { ok: false, hm, message: 'Too many tries with that code. Send a new one.', needNewCode: true }
  if (code.length !== 6 || (await hashSecret(code, hm.id)) !== hm.code_hash) {
    const next = await update(hm, { code_attempts: hm.code_attempts + 1 })
    const left = MANAGER_SIGNUP_RULES.codeMaxAttempts - next.code_attempts
    return left > 0
      ? { ok: false, hm: next, message: `That code isn't right. ${left} ${left === 1 ? 'try' : 'tries'} left.`, needNewCode: false }
      : { ok: false, hm: next, message: 'Too many tries with that code. Send a new one.', needNewCode: true }
  }
  // Single use: the hash is cleared.
  const next = await update(hm, {
    code_hash: null,
    code_expires_at: null,
    account_status: 'active',
    email_confirmed_at: new Date().toISOString(),
  })
  return { ok: true, hm: next }
}

export interface ExceptionInput {
  name: string
  email: string
  organization: string
  website: string
  reason: string
}

export type ExceptionResult = { ok: true; hm: HiringManager } | { ok: false; message: string }

/** For legitimate hirers without an institutional email (e.g. a small NGO
 *  or ministry on Gmail): an admin approves the account by hand. */
export async function requestException(input: ExceptionInput): Promise<ExceptionResult> {
  const email = normalizeEmail(input.email)
  if (!isEmailShaped(email)) return { ok: false, message: 'Enter a full email address.' }
  const existing = await findManagerByEmail(email)
  if (existing?.account_status === 'active') return { ok: false, message: ALREADY }
  const fields = {
    name: input.name.trim(),
    email,
    organization: input.organization.trim(),
    organization_id: null,
    account_status: 'exception_pending' as const,
    exception_reason: input.reason.trim(),
    exception_website: input.website.trim() || null,
    exception_requested_at: new Date().toISOString(),
    exception_decided_at: null,
    exception_decided_by: null,
    exception_note: null,
    code_hash: null,
    code_expires_at: null,
  }
  if (existing) return { ok: true, hm: await update(existing, fields) }
  const { data, error } = await supabase.from('hiring_managers').insert(fields).select('*').single()
  if (error) return { ok: false, message: error.message }
  return { ok: true, hm: data as HiringManager }
}

/** Admin decision on an exception request. The note is shown to the
 *  requester. */
export async function decideException(
  hm: HiringManager,
  approve: boolean,
  note: string,
  adminName: string,
): Promise<HiringManager> {
  return update(hm, {
    account_status: approve ? 'active' : 'exception_declined',
    exception_decided_at: new Date().toISOString(),
    exception_decided_by: adminName,
    exception_note: note.trim() || null,
  })
}

export const ACCOUNT_STATUS_LABELS: Record<HiringManager['account_status'], string> = {
  active: 'Active',
  awaiting_code: 'Email not confirmed',
  exception_pending: 'Exception requested',
  exception_declined: 'Exception declined',
}
