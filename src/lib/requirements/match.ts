import type { OrgHistoryValue, OrgRef } from '../matching/types'
import { normalizeOrgName, resolveOrganization, type OrgIndex } from '../organizations'
import type { Profile, WorkHistoryEntry } from '../../types/db'

// Organizational History matching (docs/MavenScout-match-rework.md §3.1).
// Used by the Must-have pre-filter (mustHaves.ts) and by the placeholder
// scorer, so a row means the same thing at every level.
//
// Organization identity comes from the canonical organizations list
// (profiles-membership §8): when both names resolve to a listed organization,
// they match exactly when it's the same one, so aliases and country offices
// count ("IBRD" = "World Bank Group"; "UNHCR Jordan" = "UNHCR"). Otherwise
// it falls back to name matching: case-, accent- and punctuation-insensitive
// whole-word containment in either direction ("UN" does not match "UNDP").
// Peer suggestions remain the real engine's job.

function padded(name: string): string {
  return ` ${normalizeOrgName(name)} `
}

/** Does a work-history entry (or any name) refer to the requested org? */
export function sameOrg(
  entry: string | Pick<WorkHistoryEntry, 'organization' | 'organization_id'>,
  requested: string,
  orgs: OrgIndex,
  requestedId?: string | null,
): boolean {
  const name = typeof entry === 'string' ? entry : entry.organization
  const id = typeof entry === 'string' ? null : entry.organization_id
  const a = resolveOrganization(orgs, name, id)
  const b = resolveOrganization(orgs, requested, requestedId)
  if (a && b) return a.id === b.id
  const na = padded(name)
  const nb = padded(requested)
  if (na.trim().length < 2 || nb.trim().length < 2) return false
  return na.includes(nb) || nb.includes(na)
}

/** The organizations a row asks about: `org`, then any `also`, named ones only. */
export function orgTargets(value: OrgHistoryValue): OrgRef[] {
  return [{ org: value.org, org_id: value.org_id }, ...(value.also ?? [])]
    .map((o) => ({ ...o, org: o.org.trim() }))
    .filter((o) => o.org !== '')
}

/** "World Bank", "World Bank or UNICEF", "World Bank, UNICEF or GIZ". */
export function orgNames(value: OrgHistoryValue): string {
  const names = orgTargets(value).map((o) => o.org)
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
}

export interface OrgHistoryOutcome {
  outcome: 'met' | 'partial' | 'not_met'
  detail: string
}

/**
 * - Currently at: a work_history entry for the org with no end year → met.
 * - Ever at: any work_history entry for the org → met.
 * - Ever at, or at a peer org: same org → met; otherwise an entry at a listed
 *   peer → partial ("Peer org: ADB").
 * A row naming several organizations (`also`) is met by any of them.
 */
export function orgHistoryOutcome(profile: Profile, value: OrgHistoryValue, orgs: OrgIndex): OrgHistoryOutcome {
  const org = orgNames(value)
  const targets = orgTargets(value)
  const entries = profile.work_history
  const isOrg = (w: WorkHistoryEntry) => targets.some((t) => sameOrg(w, t.org, orgs, t.org_id))
  if (value.scope === 'current') {
    const current = entries.find((w) => w.end_year === null && isOrg(w))
    if (current) return { outcome: 'met', detail: `Currently at ${current.organization}` }
    const past = entries.some(isOrg)
    return {
      outcome: 'not_met',
      detail: past ? `Previously at ${org}, not currently` : `No work history at ${org}`,
    }
  }
  const same = entries.find(isOrg)
  if (same) return { outcome: 'met', detail: `Same org: ${same.organization}` }
  if (value.scope === 'ever_or_peer') {
    for (const peer of value.peers) {
      const hit = entries.find((w) => sameOrg(w, peer, orgs))
      if (hit) return { outcome: 'partial', detail: `Peer org: ${hit.organization}` }
    }
  }
  return { outcome: 'not_met', detail: `No work history at ${org}` }
}

/** A Must-have Org History row admits met — and, for the peer scope, partial
 *  (a peer organization is what that scope asks for). */
export function passesOrgMustHave(profile: Profile, value: OrgHistoryValue, orgs: OrgIndex): boolean {
  const { outcome } = orgHistoryOutcome(profile, value, orgs)
  return outcome === 'met' || (outcome === 'partial' && value.scope === 'ever_or_peer')
}
