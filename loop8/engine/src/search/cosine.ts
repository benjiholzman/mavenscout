import type { IndexArtifact, IndexFragment } from './artifact'

export type EmbedText = (text: string) => Promise<number[]>

export interface Candidate {
  profileId: string
  similarity: number
  topFragments: { fragment: IndexFragment; similarity: number }[]
}

export interface SearchOptions {
  threshold: number | null
  cap: number
  topFragments: number
}

export interface SearchResult {
  shortlist: Candidate[]
  below: Candidate[]
  notIndexed: string[]
  capHit: boolean
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

export function searchPool(
  query: number[],
  artifact: IndexArtifact,
  poolIds: string[],
  opts: SearchOptions,
): SearchResult {
  const pool = new Set(poolIds)
  const byProfile = new Map<string, { fragment: IndexFragment; similarity: number }[]>()
  for (const fragment of artifact.fragments) {
    if (!pool.has(fragment.profileId)) continue
    const list = byProfile.get(fragment.profileId) ?? []
    list.push({ fragment, similarity: cosine(query, fragment.vector) })
    byProfile.set(fragment.profileId, list)
  }
  const candidates: Candidate[] = []
  for (const [profileId, list] of byProfile) {
    list.sort((x, y) => y.similarity - x.similarity || cmp(x.fragment.fragmentId, y.fragment.fragmentId))
    candidates.push({ profileId, similarity: list[0].similarity, topFragments: list.slice(0, opts.topFragments) })
  }
  candidates.sort((x, y) => y.similarity - x.similarity || cmp(x.profileId, y.profileId))
  const notIndexed = [...new Set(poolIds)].filter((id) => !byProfile.has(id)).sort(cmp)
  const qualifying = candidates.filter((c) => opts.threshold === null || c.similarity >= opts.threshold)
  const shortlist = qualifying.slice(0, opts.cap)
  const kept = new Set(shortlist.map((c) => c.profileId))
  return {
    shortlist,
    below: candidates.filter((c) => !kept.has(c.profileId)),
    notIndexed,
    capHit: qualifying.length > opts.cap,
  }
}
