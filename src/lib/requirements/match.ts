import type { OrgHistoryValue, OrgRef } from '../matching/types'
import { normalizeOrgName, resolveOrganization, type OrgIndex } from '../organizations'
import type { OrgType, Profile, WorkHistoryEntry } from '../../types/db'

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
// Peers are, for now, listed organizations of the same type (UN agencies,
// multilaterals …); better peer suggestions remain the real engine's job.

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

/** Whether a row counts peer organizations (the modal's "Also count …", or
 *  an older 'ever_or_peer' row). */
export function countsPeers(value: OrgHistoryValue): boolean {
  return !!value.includePeers || value.scope === 'ever_or_peer'
}

/** "other UN agencies" — the peer group the modal's checkbox names, by the
 *  organization type on the canonical list. */
export const PEER_GROUP_LABELS: Record<OrgType, string> = {
  multilateral: 'other multilaterals',
  bilateral_donor: 'other bilateral donors',
  un_agency: 'other UN agencies',
  ngo: 'other NGOs',
  government: 'other government agencies',
  private_firm: 'other private firms',
  academic: 'other academic & research institutions',
  foundation: 'other foundations',
}

/** The organization type peers are drawn from: the first target on the
 *  canonical list. Null when none is listed (no peers to offer). */
export function peerTypeOf(value: OrgHistoryValue, orgs: OrgIndex): OrgType | null {
  for (const t of orgTargets(value)) {
    const org = resolveOrganization(orgs, t.org, t.org_id)
    if (org) return org.type
  }
  return null
}

/** Does a work-history entry count as a peer of the row's organizations?
 *  Peers are listed organizations of the same type (or the row's named
 *  peers), never the organizations themselves. */
function isPeerEntry(w: WorkHistoryEntry, value: OrgHistoryValue, orgs: OrgIndex): boolean {
  if (value.peers.some((peer) => sameOrg(w, peer, orgs))) return true
  if (!value.includePeers) return false
  const type = peerTypeOf(value, orgs)
  const org = resolveOrganization(orgs, w.organization, w.organization_id)
  return !!type && !!org && org.type === type
}

/**
 * - Now ('current'): a work_history entry for the org with no end year → met.
 * - Before ('past'): an entry for the org that has ended → met.
 * - Either ('ever'): any entry for the org → met.
 * Counting peers, an entry at a peer organization with the same relation →
 * partial ("Peer org: ADB"). A row naming several organizations (`also`) is
 * met by any of them.
 */
export function orgHistoryOutcome(profile: Profile, value: OrgHistoryValue, orgs: OrgIndex): OrgHistoryOutcome {
  const org = orgNames(value)
  const targets = orgTargets(value)
  const scope = value.scope === 'ever_or_peer' ? 'ever' : value.scope
  const related = (w: WorkHistoryEntry) =>
    scope === 'current' ? w.end_year === null : scope === 'past' ? w.end_year !== null : true
  const entries = profile.work_history
  const isOrg = (w: WorkHistoryEntry) => targets.some((t) => sameOrg(w, t.org, orgs, t.org_id))
  const same = entries.find((w) => isOrg(w) && related(w))
  if (same)
    return {
      outcome: 'met',
      detail: scope === 'current' ? `Currently at ${same.organization}` : scope === 'past' ? `Previously at ${same.organization}` : `Same org: ${same.organization}`,
    }
  if (countsPeers(value)) {
    const peer = entries.find((w) => !isOrg(w) && related(w) && isPeerEntry(w, value, orgs))
    if (peer) return { outcome: 'partial', detail: `Peer org: ${peer.organization}` }
  }
  const elsewhere = entries.some(isOrg)
  if (scope === 'current')
    return { outcome: 'not_met', detail: elsewhere ? `Previously at ${org}, not currently` : `No work history at ${org}` }
  if (scope === 'past')
    return { outcome: 'not_met', detail: elsewhere ? `Currently at ${org}, not before` : `No work history at ${org}` }
  return { outcome: 'not_met', detail: `No work history at ${org}` }
}

/** A Must-have Org History row admits met — and, when it counts peers,
 *  partial (a peer organization is what it asks for). */
export function passesOrgMustHave(profile: Profile, value: OrgHistoryValue, orgs: OrgIndex): boolean {
  const { outcome } = orgHistoryOutcome(profile, value, orgs)
  return outcome === 'met' || (outcome === 'partial' && countsPeers(value))
}
