import { normalizeOrgName } from '../organizations'
import type { Accreditation, EducationEntry, Profile, VerificationItemKind, WorkHistoryEntry } from '../../types/db'

// What verification checks (docs/MavenScout-profiles-membership.md §3.1):
// name + photo, the most recent employer, the most recent degree and every
// certification. Other employer and education entries can carry a label too
// (e.g. an employer confirmed by a referee's email, §4.4) but aren't required.
//
// Each item has a fingerprint of the fields a check covers. A label holds
// only while the item still has the fingerprint it was checked with, so
// editing those fields removes the label until it's re-checked (§3.1).
// Descriptions and logos aren't checked, so editing them keeps the label.

export interface VerificationItem {
  kind: VerificationItemKind
  /** Entry id; 'identity' for name + photo. */
  id: string
  /** Needed to be listed. */
  required: boolean
  /** "Most recent employer", "Certification"… */
  title: string
  /** The item as it reads: "Lead Economist, World Bank, 2019–present". */
  summary: string
  fingerprint: string
}

/** FNV-1a, 32-bit: a short, stable, synchronous fingerprint. Not a security
 *  measure; it only tells whether checked fields changed. */
function fnv1a(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

const norm = (v: string | number | null | undefined) =>
  v === null || v === undefined ? '' : String(v).trim().toLowerCase().replace(/\s+/g, ' ')

const print = (fields: (string | number | null | undefined)[]) => fnv1a(JSON.stringify(fields.map(norm)))

const years = (start: number | null | undefined, end: number | null | undefined, open = 'present') =>
  start ? `${start}–${end ?? open}` : end ? String(end) : ''

const join = (...parts: (string | null | undefined)[]) => parts.filter((p) => p && p.trim()).join(', ')

export function identityFingerprint(p: Pick<Profile, 'name' | 'photo_url'>): string {
  return print([p.name, p.photo_url])
}

export function employerFingerprint(e: WorkHistoryEntry): string {
  return print([e.organization_id || normalizeOrgName(e.organization), e.role, e.start_year, e.end_year])
}

/** What a referee's email confirms about an employer entry: the
 *  organization (§4.4). */
export function employerOrgFingerprint(e: WorkHistoryEntry): string {
  return print([e.organization_id || normalizeOrgName(e.organization)])
}

export function degreeFingerprint(e: EducationEntry): string {
  return print([e.institution, e.degree_or_course, e.start_year, e.end_year])
}

export function certificationFingerprint(a: Accreditation): string {
  return print([a.name, a.issuing_organization, a.year, a.credential_id_or_url])
}

/** A bio edit request holds while the bio is unchanged. */
export function bioFingerprint(p: Pick<Profile, 'detailed_bio'>): string {
  return print([p.detailed_bio])
}

export const employerSummary = (e: WorkHistoryEntry) => join(e.role, e.organization, years(e.start_year, e.end_year))
export const degreeSummary = (e: EducationEntry) => join(e.degree_or_course, e.institution, years(e.start_year, e.end_year, 'ongoing'))
export const certificationSummary = (a: Accreditation) => join(a.name, a.issuing_organization, a.year ? String(a.year) : null)

/** The most recent employer (current or previous, spec §3.1): a current role
 *  (no end year) first, the latest-started of those; otherwise the latest
 *  to end. Self-employed consultants list their most recent client. */
export function mostRecentEmployer(p: Pick<Profile, 'work_history'>): WorkHistoryEntry | null {
  const rank = (e: WorkHistoryEntry) => [e.end_year === null ? 1 : 0, e.end_year ?? 0, e.start_year ?? 0]
  return (
    [...p.work_history].sort((a, b) => {
      const [x, y] = [rank(a), rank(b)]
      return y[0] - x[0] || y[1] - x[1] || y[2] - x[2]
    })[0] ?? null
  )
}

/** The most recent degree held: the latest completed one. An ongoing degree
 *  (no end year, or one in the future) isn't held yet. */
export function mostRecentDegree(p: Pick<Profile, 'education_history'>, now = new Date()): EducationEntry | null {
  const thisYear = now.getFullYear()
  return (
    p.education_history
      .filter((e) => e.degree_or_course?.trim() && e.end_year !== null && e.end_year <= thisYear)
      .sort((a, b) => (b.end_year ?? 0) - (a.end_year ?? 0) || (b.start_year ?? 0) - (a.start_year ?? 0))[0] ?? null
  )
}

/** Every item verification looks at, required ones first. Entries without
 *  an id (saved before 015/016 and not re-saved) can't be checked yet; the
 *  editor gives them one. */
export function verificationItems(p: Profile, now = new Date()): VerificationItem[] {
  const employer = mostRecentEmployer(p)
  const degree = mostRecentDegree(p, now)
  const items: VerificationItem[] = [
    { kind: 'identity', id: 'identity', required: true, title: 'Name and photo', summary: p.name, fingerprint: identityFingerprint(p) },
  ]
  for (const e of p.work_history)
    if (e.id)
      items.push({
        kind: 'employer',
        id: e.id,
        required: e === employer,
        title: e === employer ? 'Most recent employer' : 'Employer',
        summary: employerSummary(e),
        fingerprint: employerFingerprint(e),
      })
  for (const e of p.education_history)
    if (e.id)
      items.push({
        kind: 'degree',
        id: e.id,
        required: e === degree,
        title: e === degree ? 'Most recent degree' : 'Education',
        summary: degreeSummary(e),
        fingerprint: degreeFingerprint(e),
      })
  for (const a of p.accreditations)
    if (a.id)
      items.push({
        kind: 'certification',
        id: a.id,
        required: true,
        title: 'Certification',
        summary: certificationSummary(a),
        fingerprint: certificationFingerprint(a),
      })
  return items.sort((a, b) => Number(b.required) - Number(a.required))
}

/** The fingerprint an entry would have, for the editor's "editing removes
 *  this label" warning. */
export function entryFingerprint(kind: VerificationItemKind, entry: unknown): string {
  switch (kind) {
    case 'identity':
      return identityFingerprint(entry as Profile)
    case 'employer':
      return employerFingerprint(entry as WorkHistoryEntry)
    case 'degree':
      return degreeFingerprint(entry as EducationEntry)
    case 'certification':
      return certificationFingerprint(entry as Accreditation)
  }
}
