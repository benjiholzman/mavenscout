import { normalizeOrgName, resolveOrganization } from '../organizations'
import type { VerificationState, VerificationInput } from './state'

// ============================================================================
// PLACEHOLDER AI REVIEW (docs/MavenScout-profiles-membership.md §3.1 "Process")
// ----------------------------------------------------------------------------
// The real first pass is an AI agent that searches public records, checks
// registries, reads the documents and writes a short report. This stand-in
// runs a few fixed rules over the profile so the admin queue has a report to
// show. It isn't AI, it reads no documents and searches nothing.
//
// Like the real one, it never decides: it flags things for the admin, who
// decides. A thin web footprint is not a red flag.
//
// Swap point: replace reviewProfile (same input and output) with a call to
// the real agent. The admin queue only reads the report it returns.
// ============================================================================

export const AI_REVIEW_IS_PLACEHOLDER = true

export interface ReviewFinding {
  /** `${kind}:${id}` of the item it's about, or 'bio' / 'profile'. */
  about: string
  level: 'flag' | 'note'
  text: string
}

export interface ReviewReport {
  summary: string
  findings: ReviewFinding[]
}

/** Certifications with a public register to check (name or issuer match). */
const REGISTERS: { match: RegExp; register: string }[] = [
  { match: /\b(pmp|capm|pgmp|pmi)\b|project management institute/i, register: 'PMI certification registry' },
  { match: /\bcfa\b|cfa institute/i, register: 'CFA Institute member directory' },
  { match: /prince2|axelos|peoplecert|\bmsp\b/i, register: 'PeopleCert successful candidate register' },
  { match: /\bacca\b/i, register: 'ACCA register of members' },
  { match: /\bcia\b|institute of internal auditors/i, register: 'IIA certification registry' },
  { match: /\bcpa\b/i, register: 'the issuing state or national CPA board' },
]

const thisYear = () => new Date().getFullYear()

export function reviewProfile(input: VerificationInput, state: VerificationState): ReviewReport {
  const { profile, orgs, testimonials } = input
  const findings: ReviewFinding[] = []
  const add = (about: string, level: ReviewFinding['level'], text: string) => findings.push({ about, level, text })

  for (const item of state.items) {
    const key = `${item.kind}:${item.id}`
    if (item.kind === 'identity') {
      if (state.identityResult?.outcome === 'provider_passed')
        add(key, 'note', 'The ID check passed and the name on the ID matches. Compare the profile photo with the selfie result.')
      else if (state.identityResult?.outcome === 'provider_failed') add(key, 'flag', 'The ID check didn’t pass.')
      else add(key, 'note', 'No ID check yet.')
      if (!profile.photo_url) add(key, 'flag', 'No profile photo to compare.')
    }
    if (item.kind === 'employer') {
      const e = profile.work_history.find((w) => w.id === item.id)
      if (!e) continue
      const org = resolveOrganization(orgs, e.organization, e.organization_id)
      if (!org) add(key, 'note', `“${e.organization}” isn’t on the organizations list: look for a public record (staff page, report, procurement notice) naming them.`)
      if (e.end_year !== null && e.start_year > e.end_year) add(key, 'flag', 'Ends before it starts.')
      if (e.start_year > thisYear() || (e.end_year ?? 0) > thisYear()) add(key, 'flag', 'Dates in the future.')
      const t = testimonials.find((r) => r.work_history_entry_id === e.id && r.status !== 'removed' && !r.withdrawn_at)
      if (t && org && t.referee_org_id === org.id)
        add(key, 'note', `${t.reference_name} (${t.referee_email}) works here: a published testimonial confirms the employer automatically.`)
      else if (t) add(key, 'note', `The testimonial from ${t.reference_name} is from another organization, so it confirms the details, not the employer.`)
    }
    if (item.kind === 'degree') {
      const e = profile.education_history.find((w) => w.id === item.id)
      if (!e) continue
      const span = (e.end_year ?? 0) - e.start_year
      if (e.end_year !== null && (span < 1 || span > 8)) add(key, 'flag', `${span < 1 ? 'Under a year' : `${span} years`} long: unusual for a degree.`)
      add(key, 'note', 'Check whether the country has a degree-verification service before relying on the certificate.')
    }
    if (item.kind === 'certification') {
      const a = profile.accreditations.find((w) => w.id === item.id)
      if (!a) continue
      const reg = REGISTERS.find((r) => r.match.test(`${a.name} ${a.issuing_organization}`))
      if (reg) add(key, 'note', `Public register: ${reg.register}${a.credential_id_or_url ? ` (credential ${a.credential_id_or_url})` : ''}.`)
      else if (a.credential_id_or_url && !item.evidence.length)
        add(key, 'note', `No known public register; check credential “${a.credential_id_or_url}” with ${a.issuing_organization || 'the issuer'}, or ask for the certificate.`)
      else if (!item.evidence.length) add(key, 'note', 'No known public register and no certificate yet.')
      if (a.year && a.year > thisYear()) add(key, 'flag', 'Year in the future.')
    }
  }

  // Bio: claims that contradict checked items or look implausible.
  const bio = profile.detailed_bio ?? ''
  const starts = profile.work_history.map((w) => w.start_year).filter((y) => y > 1900)
  const span = starts.length ? thisYear() - Math.min(...starts) : 0
  for (const m of bio.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)/gi)) {
    const claimed = Number(m[1])
    if (span && claimed > span + 3)
      add('bio', 'flag', `Claims ${claimed} years of experience; the work history covers about ${span}.`)
  }
  const named = new Set([...profile.work_history.map((w) => normalizeOrgName(w.organization))])
  const mentioned = orgs.list.filter((o) => {
    const names = [o.name, ...o.aliases].filter((n) => n.length >= 4)
    return names.some((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(bio))
  })
  for (const o of mentioned)
    if (!named.has(normalizeOrgName(o.name)) && !profile.work_history.some((w) => w.organization_id === o.id))
      add('bio', 'note', `Mentions ${o.name}, which isn’t in the work history (may be a client or funder).`)
  if (/\b(world[- ]leading|world[- ]class|best in|top expert|renowned|the leading)\b/i.test(bio))
    add('bio', 'note', 'Uses superlatives; nothing to verify, but you may want them toned down.')

  const flags = findings.filter((f) => f.level === 'flag').length
  return {
    summary: flags
      ? `${flags} ${flags === 1 ? 'thing' : 'things'} to look at. Nothing here decides anything; a thin web footprint is not a red flag.`
      : 'Nothing contradicts the profile. Nothing here decides anything; a thin web footprint is not a red flag.',
    findings,
  }
}
