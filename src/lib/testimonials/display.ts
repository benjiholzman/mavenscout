import { firstName } from '../names'
import { membershipLimits } from '../membership'
import { orgAcronym, resolveOrganization, type OrgIndex } from '../organizations'
import type { AudioTestimonial, Profile } from '../../types/db'
import { emailDomain } from './integrity'
import { isLegacy, periodLabel, relationshipVerb } from './rules'

// How published testimonials read on a profile
// (docs/MavenScout-profiles-membership.md §4.4).

export interface ConfirmationLine {
  /** "Dr. Amina Bello, Lead Economist, World Bank" / "…, now Lead Economist, AfDB" */
  who: string
  /** "confirmed via worldbank.org email" */
  confirmed: string | null
  /** "Supervised Amara, 2021–2023." / "Supervised Amara at the World Bank, 2014–2016 (details confirmed by referee)." */
  relationship: string
  /** The email domain belongs to the entry's organization, so it also confirms the employer. */
  confirmsEmployer: boolean
}

/**
 * Domain matches the employer entry → the referee still works there, and the
 * email confirms the employer too. Otherwise the referee has moved on: their
 * current role is "now …", and the shared history is their attestation.
 */
export function confirmationLine(t: AudioTestimonial, profile: Profile, orgs: OrgIndex): ConfirmationLine {
  const entry = profile.work_history.find((w) => w.id === t.work_history_entry_id) ?? null
  const entryOrg = entry ? resolveOrganization(orgs, entry.organization, entry.organization_id) : null
  const refOrg = t.referee_org_id ? orgs.byId.get(t.referee_org_id) ?? null : null
  const sameOrg = !!entryOrg && !!refOrg && entryOrg.id === refOrg.id
  const domain = t.referee_email ? emailDomain(t.referee_email) : null
  const role = [t.reference_title, t.reference_org].filter(Boolean).join(', ')
  const who = [t.reference_name, role && (entry && !sameOrg ? `now ${role}` : role)].filter(Boolean).join(', ')
  const where = entry ? (sameOrg ? '' : ` at ${entry.organization}`) : ''
  const period = periodLabel(t.period_start, t.period_end)
  const first = firstName(profile.name) ?? profile.name
  return {
    who,
    confirmed: domain ? `confirmed via ${domain} email` : null,
    relationship: `${relationshipVerb(t.relationship)} ${first}${where}${period ? `, ${period}` : ''}${!sameOrg && entry ? ' (details confirmed by referee)' : ''}.`,
    confirmsEmployer: sameOrg,
  }
}

/** Published testimonials the profile shows. A Member shows one, on an
 *  employer entry (a Featured Member who lapsed keeps the rest stored, not
 *  shown). Legacy references show until the step 5 re-seed. */
export function visibleTestimonials(profile: Profile, published: AudioTestimonial[]): AudioTestimonial[] {
  if (membershipLimits(profile).testimonials.total === null) return published
  const flow = published
    .filter((t) => !isLegacy(t) && t.work_history_entry_id)
    .sort((a, b) => (a.published_at ?? '').localeCompare(b.published_at ?? ''))
    .slice(0, 1)
  return [...flow, ...published.filter(isLegacy)]
}

/** "3 testimonials from UNICEF, World Bank, IRC" (§4.4). */
export function summaryLine(rows: AudioTestimonial[], orgs: OrgIndex): string | null {
  if (rows.length === 0) return null
  const names: string[] = []
  for (const t of rows) {
    const org = t.referee_org_id ? orgs.byId.get(t.referee_org_id) : resolveOrganization(orgs, t.reference_org)
    // Short names read best ("World Bank"); long ones by acronym ("IRC").
    const label = org ? (org.name.length <= 20 ? org.name : orgAcronym(org) ?? org.name) : t.reference_org
    if (label && !names.includes(label)) names.push(label)
  }
  const n = rows.length
  return `${n} audio ${n === 1 ? 'testimonial' : 'testimonials'}${names.length ? ` from ${names.join(', ')}` : ''}`
}
