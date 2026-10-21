import type { OrgHistoryValue } from '../matching/types'
import type { Profile } from '../../types/db'

// Organizational History matching (docs/MavenScout-match-rework.md §3.1).
// Used by the Must-have pre-filter (mustHaves.ts) and by the placeholder
// scorer, so a row means the same thing at every level.
//
// PLACEHOLDER name matching: case-insensitive and punctuation-insensitive,
// whole-word containment in either direction ("World Bank" matches "World
// Bank Group"; "UN" does not match "UNDP"). The real engine resolves org
// identity and suggests peer organizations.

function normalize(name: string): string {
  return ` ${name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
}

export function sameOrg(a: string, b: string): boolean {
  const na = normalize(a)
  const nb = normalize(b)
  if (na.trim().length < 2 || nb.trim().length < 2) return false
  return na.includes(nb) || nb.includes(na)
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
 */
export function orgHistoryOutcome(profile: Profile, value: OrgHistoryValue): OrgHistoryOutcome {
  const org = value.org.trim()
  const entries = profile.work_history
  if (value.scope === 'current') {
    const current = entries.find((w) => w.end_year === null && sameOrg(w.organization, org))
    if (current) return { outcome: 'met', detail: `Currently at ${current.organization}` }
    const past = entries.some((w) => sameOrg(w.organization, org))
    return {
      outcome: 'not_met',
      detail: past ? `Previously at ${org}, not currently` : `No work history at ${org}`,
    }
  }
  const same = entries.find((w) => sameOrg(w.organization, org))
  if (same) return { outcome: 'met', detail: `Same org: ${same.organization}` }
  if (value.scope === 'ever_or_peer') {
    for (const peer of value.peers) {
      const hit = entries.find((w) => sameOrg(w.organization, peer))
      if (hit) return { outcome: 'partial', detail: `Peer org: ${hit.organization}` }
    }
  }
  return { outcome: 'not_met', detail: `No work history at ${org}` }
}

/** A Must-have Org History row admits met — and, for the peer scope, partial
 *  (a peer organization is what that scope asks for). */
export function passesOrgMustHave(profile: Profile, value: OrgHistoryValue): boolean {
  const { outcome } = orgHistoryOutcome(profile, value)
  return outcome === 'met' || (outcome === 'partial' && value.scope === 'ever_or_peer')
}
