// Pure fragmentation: a FragmentSource becomes its list of Fragment (issue #20).
// No IO, no model calls, so it is fully testable offline.
//
// Text construction below is provisional and must be agreed with the rankPool
// owner before any vector is written, because the query side has to embed
// comparable text (HANDOFF section 3, contract point 2). The two levers to
// agree are TAG_LEAD_IN and whether to prefix each fragment with its type.
// They live here as named constants so one change moves both sides together.

import { createHash } from 'node:crypto'
import type {
  CredentialEvidence,
  EducationEvidence,
  Fragment,
  FragmentMetadata,
  FragmentType,
  FragmentSource,
  PortfolioEvidence,
  RoleEvidence,
} from './types'

/** Lead-in for the single expertise-tags fragment. Agree with the query side. */
const TAG_LEAD_IN = 'Areas of expertise: '

/** Collapse whitespace and trim, so the text and its hash are stable. */
function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** Join the non-empty parts of a fragment into one line. */
function join(parts: (string | null | undefined)[]): string {
  return normalize(parts.filter((p) => p != null && p.trim() !== '').join('. '))
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

/** A stable per-entry key: the entry id when it has one, else the ordinal.
 *  Treats an empty-string id as missing, so entries without ids do not collide. */
function keyFor(id: string | null | undefined, ordinal: number): string {
  return id != null && id.trim() !== '' ? id : String(ordinal)
}

function roleText(e: RoleEvidence): string {
  // The organization is deliberately excluded from the embedded text and kept
  // in metadata instead (contract point 2), so an employer name cannot score
  // in Fit. The query side strips org names from the job description to match.
  return join([e.role, e.description])
}

function portfolioText(e: PortfolioEvidence): string {
  // The organization is deliberately excluded here too, for the same reason.
  return join([e.projectName, e.role, e.description, e.results])
}

/** Profile metadata plus this one entry's organization. The org rides in
 *  metadata only, never in the embedded text. */
function withOrg(metadata: FragmentMetadata, organization: string | null | undefined): FragmentMetadata {
  return organization != null && organization.trim() !== ''
    ? { ...metadata, organization }
    : metadata
}

function educationText(e: EducationEvidence): string {
  return join([e.degreeOrCourse, e.institution])
}

function credentialText(e: CredentialEvidence): string {
  return join([e.name, e.issuingOrganization])
}

/** One fragment, or null when the text is empty (skip empty fragments). */
function make(
  profileId: string,
  type: FragmentType,
  key: string,
  text: string,
  metadata: FragmentMetadata,
): Fragment | null {
  const clean = normalize(text)
  if (clean === '') return null
  return {
    fragmentId: `${profileId}#${type}#${key}`,
    profileId,
    type,
    text: clean,
    textHash: sha256(clean),
    metadata,
  }
}

/** Split a profile into its capability fragments. Order is stable. */
export function toFragments(source: FragmentSource): Fragment[] {
  const { profileId, metadata } = source
  const out: (Fragment | null)[] = []

  if (source.tagline) out.push(make(profileId, 'tagline', '0', source.tagline, metadata))
  if (source.bio) out.push(make(profileId, 'bio', '0', source.bio, metadata))

  source.portfolio.forEach((e, i) =>
    out.push(make(profileId, 'portfolio', keyFor(e.id, i), portfolioText(e), withOrg(metadata, e.organization))),
  )
  source.workHistory.forEach((e, i) =>
    out.push(make(profileId, 'work_history', keyFor(e.id, i), roleText(e), withOrg(metadata, e.organization))),
  )
  source.education.forEach((e, i) =>
    out.push(make(profileId, 'education', keyFor(e.id, i), educationText(e), metadata)),
  )
  source.additionalExperience.forEach((e, i) =>
    out.push(make(profileId, 'additional_experience', keyFor(e.id, i), roleText(e), withOrg(metadata, e.organization))),
  )
  source.credentials.forEach((e, i) =>
    out.push(make(profileId, 'credential', keyFor(e.id, i), credentialText(e), metadata)),
  )

  const tags = source.expertiseTags.filter((t) => t.trim() !== '')
  if (tags.length > 0) {
    out.push(make(profileId, 'expertise_tags', '0', TAG_LEAD_IN + tags.join(', '), metadata))
  }

  return out.filter((f): f is Fragment => f !== null)
}
