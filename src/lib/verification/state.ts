import { fmtDate } from '../dates'
import { resolveOrganization, type OrgIndex } from '../organizations'
import type {
  AudioTestimonial,
  Profile,
  VerificationCheck,
  VerificationEvidence,
  VerificationMethod,
} from '../../types/db'
import { bioFingerprint, identityFingerprint, mostRecentDegree, mostRecentEmployer, verificationItems, type VerificationItem } from './items'

// Where each verification item stands, and whether the profile passes
// (docs/MavenScout-profiles-membership.md §3, §10). Pure functions over data
// the caller loads (profile, verification_checks, verification_evidence,
// testimonials, organizations), so the server-side version in the hardening
// pass can run the same rules.

/** Confirmed = checked with an independent source; Document reviewed =
 *  evidence examined and found genuine-looking, not confirmed with the
 *  source. No label = self-reported (§3.1). */
export type VerificationLabel = 'confirmed' | 'document_reviewed'

export const LABEL_TEXT: Record<VerificationLabel, string> = {
  confirmed: 'Confirmed',
  document_reviewed: 'Document reviewed',
}

export interface ItemMark {
  label: VerificationLabel
  method: VerificationMethod | null
  at: string
  by: string | null
  /** Employer confirmed by a published testimonial whose referee email
   *  domain is the employer's (§4.4). */
  testimonial?: AudioTestimonial
}

/**
 * - labelled: has a current label
 * - waiting: the consultant has done their part; MavenScout checks next
 * - action: the consultant needs to do something
 */
export type ItemStatus = 'labelled' | 'waiting' | 'action'

export interface ItemState extends VerificationItem {
  status: ItemStatus
  mark: ItemMark | null
  /** One line: what's happening or what to do. */
  note: string
  /** Evidence awaiting review for this item. */
  evidence: VerificationEvidence[]
  /** While waiting: MavenScout checks next, or a referee's testimonial will
   *  confirm it once published. */
  waitingFor?: 'admin' | 'referee'
}

export interface VerificationInput {
  profile: Profile
  checks: VerificationCheck[]
  evidence: VerificationEvidence[]
  /** The profile's testimonials, any status. */
  testimonials: AudioTestimonial[]
  orgs: OrgIndex
}

export interface VerificationState {
  items: ItemState[]
  required: ItemState[]
  /** Identity, most recent employer and most recent degree are labelled:
   *  the items the re-check window watches (lib/verification/recheck). */
  corePassed: boolean
  /** Every required item, certifications included, is labelled: the review
   *  gate (admin Approve). */
  passed: boolean
  /** Nothing required is waiting on the consultant: the Submit gate. */
  consultantDone: boolean
  /** Required items that don't exist yet: "no completed degree". */
  missing: string[]
  /** The ID + selfie provider's latest result for the current name + photo. */
  identityResult: VerificationCheck | null
  /** An admin's request to edit the bio, while the bio is unchanged. */
  bioEditRequest: VerificationCheck | null
  /** Certifications an admin couldn't verify and took off the profile. */
  removedCertifications: VerificationCheck[]
}

const DECISIONS = new Set(['confirmed', 'document_reviewed', 'unverifiable'])

const newestFirst = (a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at)

function checksFor(checks: VerificationCheck[], kind: string, id: string): VerificationCheck[] {
  return checks.filter((c) => c.item_kind === kind && c.item_id === id).sort(newestFirst)
}

/** The item's label from the latest admin decision, if it still applies. */
function decisionMark(item: VerificationItem, checks: VerificationCheck[]): ItemMark | null {
  const latest = checksFor(checks, item.kind, item.id).find((c) => DECISIONS.has(c.outcome))
  if (!latest || latest.item_fingerprint !== item.fingerprint) return null
  if (latest.outcome !== 'confirmed' && latest.outcome !== 'document_reviewed') return null
  return { label: latest.outcome, method: latest.method, at: latest.created_at, by: latest.actor_name }
}

/** A testimonial on this employer entry whose referee's organization (from
 *  their email domain) is the entry's organization. */
function matchingTestimonials(
  profile: Profile,
  entryId: string,
  testimonials: AudioTestimonial[],
  orgs: OrgIndex,
): AudioTestimonial[] {
  const entry = profile.work_history.find((w) => w.id === entryId)
  const org = entry ? resolveOrganization(orgs, entry.organization, entry.organization_id) : null
  if (!org) return []
  return testimonials.filter((t) => t.work_history_entry_id === entryId && t.referee_org_id === org.id)
}

/** Labels only, for display: the latest decision that still applies, or for
 *  an employer, a published testimonial from the same organization. */
export function itemMark(item: VerificationItem, input: Omit<VerificationInput, 'evidence'>): ItemMark | null {
  const decided = decisionMark(item, input.checks)
  if (decided) return decided
  if (item.kind !== 'employer') return null
  const t = matchingTestimonials(input.profile, item.id, input.testimonials, input.orgs).find(
    (r) => r.status === 'published' && !r.withdrawn_at,
  )
  return t ? { label: 'confirmed', method: 'referee_email', at: t.published_at ?? t.created_at, by: null, testimonial: t } : null
}

export function verificationState(input: VerificationInput, now = new Date()): VerificationState {
  const { profile, checks, evidence, testimonials, orgs } = input
  const identity = identityFingerprint(profile)
  const identityResult =
    checksFor(checks, 'identity', 'identity').find(
      (c) => (c.outcome === 'provider_passed' || c.outcome === 'provider_failed') && c.item_fingerprint === identity,
    ) ?? null

  const items = verificationItems(profile, now).map((item): ItemState => {
    const mark = itemMark(item, input)
    const own = evidence.filter((e) => e.item_kind === item.kind && e.item_id === item.id)
    const base = { ...item, mark, evidence: own }
    if (mark)
      return {
        ...base,
        status: 'labelled',
        note: mark.testimonial ? `Confirmed by ${mark.testimonial.reference_name}’s work email.` : `Checked ${fmtDate(mark.at.slice(0, 10))}.`,
      }
    const history = checksFor(checks, item.kind, item.id)
    const lost = history.some((c) => DECISIONS.has(c.outcome) && c.outcome !== 'unverifiable')
    const edited = lost ? 'Edited since it was checked. ' : ''
    // An admin couldn't verify it from what was sent: the consultant's turn
    // again, until they send something new (or, for identity, check again).
    const latest = history.find((c) => DECISIONS.has(c.outcome))
    const rejected =
      latest?.outcome === 'unverifiable' &&
      !own.some((e) => e.created_at > latest.created_at) &&
      !(item.kind === 'identity' && identityResult && identityResult.created_at > latest.created_at)
    if (rejected) {
      const note = typeof latest.detail.note === 'string' && latest.detail.note ? ` ${latest.detail.note}` : ''
      const again = item.kind === 'identity' ? 'Check your photo and verify your identity again.' : 'Send something else.'
      return { ...base, status: 'action', note: `We couldn’t verify this.${note} ${again}` }
    }
    switch (item.kind) {
      case 'identity':
        if (identityResult?.outcome === 'provider_passed')
          return { ...base, status: 'waiting', waitingFor: 'admin', note: `${edited}ID check passed; we compare your photo next.` }
        if (identityResult?.outcome === 'provider_failed')
          return { ...base, status: 'action', note: 'The ID check didn’t pass. Try again with a clear photo of your ID.' }
        return { ...base, status: 'action', note: `${edited}Verify your identity with an ID and a selfie.` }
      case 'employer': {
        const pending = matchingTestimonials(profile, item.id, testimonials, orgs).some((t) => t.status === 'pending' && !t.withdrawn_at && !t.removed_at)
        if (own.length) return { ...base, status: 'waiting', waitingFor: 'admin', note: `${edited}Evidence sent; we review it next.` }
        if (pending) return { ...base, status: 'waiting', waitingFor: 'referee', note: `${edited}Your testimonial request will confirm it once published.` }
        return { ...base, status: 'action', note: `${edited}Add a testimonial from someone there, an employment letter or contract, or a public document naming you.` }
      }
      case 'degree':
        if (own.length) return { ...base, status: 'waiting', waitingFor: 'admin', note: `${edited}Certificate sent; we review it next.` }
        return { ...base, status: 'action', note: `${edited}Upload your degree certificate.` }
      case 'certification': {
        const ref = profile.accreditations.find((a) => a.id === item.id)?.credential_id_or_url?.trim()
        if (own.length) return { ...base, status: 'waiting', waitingFor: 'admin', note: `${edited}Certificate sent; we review it next.` }
        if (ref) return { ...base, status: 'waiting', waitingFor: 'admin', note: `${edited}We check the issuer’s public register with your credential ID.` }
        return { ...base, status: 'action', note: `${edited}Add your credential ID or URL, or upload the certificate.` }
      }
    }
  })

  const required = items.filter((i) => i.required)
  const missing = [
    ...(mostRecentEmployer(profile)?.id ? [] : ['Most recent employer: add your current or most recent role']),
    ...(mostRecentDegree(profile, now)?.id ? [] : ['Most recent degree: add the latest degree you’ve completed']),
  ]
  const core = required.filter((i) => i.kind !== 'certification')
  const corePassed = missing.length === 0 && core.every((i) => i.status === 'labelled')
  const bioRow = checksFor(checks, 'bio', 'bio')[0] ?? null

  return {
    items,
    required,
    corePassed,
    passed: corePassed && required.every((i) => i.status === 'labelled'),
    consultantDone: missing.length === 0 && required.every((i) => i.status !== 'action'),
    missing,
    identityResult,
    bioEditRequest:
      bioRow?.outcome === 'edits_requested' && bioRow.item_fingerprint === bioFingerprint(profile) ? bioRow : null,
    removedCertifications: checks
      .filter((c) => c.item_kind === 'certification' && c.outcome === 'unverifiable' && !profile.accreditations.some((a) => a.id === c.item_id))
      .sort(newestFirst),
  }
}
