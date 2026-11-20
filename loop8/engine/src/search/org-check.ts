import type { IndexArtifact } from './artifact'
import { isCaseSensitiveTerm, phraseRegex } from './query'

export interface OrgTerm { term: string; caseSensitive: boolean }
export interface OrgHit { fragmentId: string; profileId: string; type: string; term: string }

// Names and aliases follow one case rule, shared with the query builder (see isCaseSensitiveTerm).
export function orgTerms(names: string[], aliases: string[]): OrgTerm[] {
  const seen = new Set<string>()
  const out: OrgTerm[] = []
  for (const raw of [...names, ...aliases]) {
    const term = raw.trim()
    if (!term) continue
    const caseSensitive = isCaseSensitiveTerm(term)
    const collapsed = term.replace(/\s+/g, ' ')
    const key = `${caseSensitive ? 'c' : 'i'}:${caseSensitive ? collapsed : collapsed.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ term, caseSensitive })
  }
  return out
}

export function findOrgNames(artifact: IndexArtifact, terms: OrgTerm[]): OrgHit[] {
  const matchers = terms.map((t) => ({ term: t.term, re: phraseRegex(t.term, t.caseSensitive) }))
  const hits: OrgHit[] = []
  for (const f of artifact.fragments) {
    for (const m of matchers) {
      m.re.lastIndex = 0
      if (m.re.test(f.text)) hits.push({ fragmentId: f.fragmentId, profileId: f.profileId, type: f.type, term: m.term })
    }
  }
  const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
  return hits.sort((a, b) => cmp(a.fragmentId, b.fragmentId) || cmp(a.term, b.term))
}
