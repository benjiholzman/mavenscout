import type { Profile } from '../types/db'

// Default directory sort (PRD 7.1): randomized with a per-session seed —
// stable while the visitor filters/paginates within a visit, reshuffled next
// visit — with Premium always floating to the top regardless of sort.
// Ranked results don't go through here: in ranking mode the order is always
// rank order and the Premium float is suspended (match rework spec §2.2, §5.5).

export type SortMode = 'shuffle' | 'newly_added' | 'location' | 'career_level'

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

const CAREER_RANK: Record<string, number> = { senior: 0, mid_career: 1, early_career: 2 }

function sortWithin(profiles: Profile[], mode: SortMode): Profile[] {
  switch (mode) {
    case 'shuffle':
      return seededShuffle(profiles, sessionSeed())
    case 'newly_added':
      return [...profiles].sort((a, b) => b.created_at.localeCompare(a.created_at))
    case 'location':
      return [...profiles].sort((a, b) => (a.location ?? '').localeCompare(b.location ?? ''))
    case 'career_level':
      // Seniority first; firms (no career level) follow, newest-founded last.
      return [...profiles].sort((a, b) => {
        const ra = a.career_level ? CAREER_RANK[a.career_level] : 3
        const rb = b.career_level ? CAREER_RANK[b.career_level] : 3
        if (ra !== rb) return ra - rb
        return (a.year_founded ?? 9999) - (b.year_founded ?? 9999)
      })
  }
}

/** Premium first (a paid benefit, PRD 7.8), the chosen sort within each tier. */
export function sortProfiles(profiles: Profile[], mode: SortMode): Profile[] {
  const premium = profiles.filter((p) => p.is_premium)
  const standard = profiles.filter((p) => !p.is_premium)
  return [...sortWithin(premium, mode), ...sortWithin(standard, mode)]
}
