import { normalizeOrgName, resolveOrganization, type OrgIndex } from '../organizations'
import type { Organization, ReviewFlag } from '../../types/db'

// ============================================================================
// ⚑ PLACEHOLDER PRE-CHECK (docs/MavenScout-profiles-membership.md §4.2 step 2)
//
// The real pre-check is an automated search (AI + public records: the
// organization's staff bio, LinkedIn, publications) that this person exists
// and the details are plausible, run before a link is generated. Failures go
// to admin review.
//
// This placeholder only checks the request against itself:
//   - the referee's name has at least a first and last name;
//   - a current job title is given;
//   - the current organization they gave is the organization of their email
//     domain (a referee's institutional email is at their CURRENT employer).
// Swap the body of precheckReferee for the real service; keep the signature.
// ============================================================================

export const PRECHECK_IS_PLACEHOLDER = true

export interface PrecheckInput {
  name: string
  title: string
  /** The current organization the consultant entered (free text or picked). */
  organization: string
  organizationId: string | null
  /** The organization of the email domain (integrity check). */
  emailOrg: Organization | null
  orgs: OrgIndex
}

export interface PrecheckResult {
  status: 'passed' | 'review'
  flags: ReviewFlag[]
}

export async function precheckReferee(input: PrecheckInput): Promise<PrecheckResult> {
  const flags: ReviewFlag[] = []
  const words = input.name.trim().split(/\s+/).filter((w) => !/^(dr|prof|mr|mrs|ms)\.?$/i.test(w))
  if (words.length < 2)
    flags.push({ code: 'precheck_name', message: 'Pre-check: only one name given; we look people up by full name.' })
  if (!input.title.trim())
    flags.push({ code: 'precheck_title', message: 'Pre-check: no current job title given.' })
  if (input.emailOrg && input.organization.trim()) {
    const stated = resolveOrganization(input.orgs, input.organization, input.organizationId)
    const same = stated
      ? stated.id === input.emailOrg.id
      : normalizeOrgName(input.organization) === normalizeOrgName(input.emailOrg.name)
    if (!same)
      flags.push({
        code: 'precheck_org',
        message: `Pre-check: current organization "${input.organization.trim()}" doesn't match the email's organization (${input.emailOrg.name}).`,
      })
  }
  return { status: flags.length ? 'review' : 'passed', flags }
}
