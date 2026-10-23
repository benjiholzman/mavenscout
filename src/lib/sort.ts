import { isFeatured } from './membership'
import { availabilityFresh } from './filters'
import type { AvailabilityTrack, Profile } from '../types/db'

// Directory sort (PRD 7.1). Ranked results don't go through here: in ranking
// mode the order is always rank order and Featured placement is suspended
// (match rework spec §2.2, §5.5).
//
// - Recommended (default): Featured available now → other Featured →
//   Members available now → everyone else, shuffled within each group with a
//   per-session seed (stable within a visit, reshuffled next visit) so the
//   same profiles don't always lead.
// - Available soonest, Newly added, Recently updated: Featured Members first
//   (a paid benefit, profiles-membership §2.2), the chosen order within each.
// "Available" means either track, and only if the availability was updated
// within AVAILABILITY_FRESH_DAYS (lib/filters availabilityFresh); staler availability counts as unknown.

export type SortMode = 'recommended' | 'available_soonest' | 'newly_added' | 'recently_updated'

const SEED_KEY = 'ms_shuffle_seed'

function sessionSeed(): number {
  const existing = sessionStorage.getItem(SEED_KEY)
  if (existing) return Number(existing)
  const seed = Math.floor(Math.random() * 2 ** 31)
  sessionStorage.setItem(SEED_KEY, String(seed))
  return seed
}

// mulberry32 — tiny deterministic PRNG so the shuffle is stable per session.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** When the expert is next available on either track (ms), or null if
 *  unavailable or the availability is stale. */
function availableFrom(p: Profile, now: number): number | null {
  if (!availabilityFresh(p, now)) return null
  const at = (t: AvailabilityTrack): number | null => {
    if (!t || t.status === 'unavailable') return null
    if (t.until && new Date(t.until).getTime() < now) return null
    if (t.status === 'available_now') return now
    return t.from ? Math.max(now, new Date(t.from).getTime()) : null
  }
  const times = [at(p.part_time_availability), at(p.full_time_availability)].filter((t): t is number => t !== null)
  return times.length ? Math.min(...times) : null
}

export function isAvailableNow(p: Profile, now = Date.now()): boolean {
  return availableFrom(p, now) === now
}

function sortWithin(profiles: Profile[], mode: Exclude<SortMode, 'recommended'>, now: number): Profile[] {
  switch (mode) {
    case 'available_soonest': {
      // Shuffled first so ties (everyone available now) don't always list alike;
      // unknown or unavailable last.
      const key = (p: Profile) => availableFrom(p, now) ?? Infinity
      return seededShuffle(profiles, sessionSeed()).sort((a, b) => key(a) - key(b))
    }
    case 'newly_added':
      return [...profiles].sort((a, b) => b.created_at.localeCompare(a.created_at))
    case 'recently_updated':
      return [...profiles].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }
}

export function sortProfiles(profiles: Profile[], mode: SortMode): Profile[] {
  const now = Date.now()
  const featured = profiles.filter(isFeatured)
  const members = profiles.filter((p) => !isFeatured(p))
  if (mode === 'recommended') {
    const seed = sessionSeed()
    const split = (list: Profile[]) => [list.filter((p) => isAvailableNow(p, now)), list.filter((p) => !isAvailableNow(p, now))]
    return [...split(featured), ...split(members)].flatMap((group) => seededShuffle(group, seed))
  }
  return [...sortWithin(featured, mode, now), ...sortWithin(members, mode, now)]
}
