import type { Requirement } from '../../../../src/lib/matching/types'

export interface QueryExclusions {
  orgNames?: string[]
  places?: string[]
  languages?: string[]
}

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Whole-phrase matcher shared by query exclusion and the organization name check.
export function phraseRegex(term: string, caseSensitive = false): RegExp {
  // Any run of whitespace between the words of a term matches, so line breaks and double spaces do not leak a name.
  const pattern = term.split(/\s+/).map(escapeRegex).join('\\s+')
  // Lookarounds on word characters act as word boundaries even when the term starts or ends with punctuation.
  return new RegExp(`(?<![\\p{L}\\p{N}_])${pattern}(?![\\p{L}\\p{N}_])`, caseSensitive ? 'gu' : 'giu')
}

// A term with a capital after the first character of any of its words (WHO, CARE, PATH, CoST, UN Women) is matched
// in exactly that case, so ordinary words such as who, care and path are kept. Terms whose words only start with a
// capital (World Bank, Pact, Kenya) match in any case.
export function isCaseSensitiveTerm(term: string): boolean {
  return term.trim().split(/\s+/).some((word) => /\p{Lu}/u.test([...word].slice(1).join('')))
}

export function buildQueryText(jdText: string, exclude?: QueryExclusions): string {
  const terms = [...(exclude?.orgNames ?? []), ...(exclude?.places ?? []), ...(exclude?.languages ?? [])]
    .map((t) => t.trim())
    .filter((t) => t !== '')
    .sort((a, b) => b.length - a.length)
  let text = jdText
  for (const term of terms) {
    text = text.replace(phraseRegex(term, isCaseSensitiveTerm(term)), '')
  }
  return text.replace(/\s+/g, ' ').trim()
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

const clean = (terms: string[]): string[] => terms.map((t) => t.trim()).filter((t) => t !== '')

// Everything in the requirements that names a place, a language or an employer. Fit judges capability only,
// so these terms must not reach the embedded query whatever the level of the row. A row or field that is
// missing or of the wrong type is skipped, so a malformed request never fails the job.
export function exclusionsFromRequirements(requirements: Requirement[]): QueryExclusions {
  const orgNames: string[] = []
  const places: string[] = []
  const languages: string[] = []
  for (const row of Array.isArray(requirements) ? requirements : []) {
    const r = row as unknown as { kind?: unknown; value?: Record<string, unknown> | null } | null
    if (!r || typeof r !== 'object' || !r.value || typeof r.value !== 'object') continue
    const v = r.value
    if (r.kind === 'location') {
      for (const value of strings(v.values)) {
        places.push(value)
        // A value such as "City, Region, Country" also names each of its parts.
        if (value.includes(',')) places.push(...value.split(','))
      }
    } else if (r.kind === 'language') {
      languages.push(...strings(v.values))
    } else if (r.kind === 'org_history') {
      if (typeof v.org === 'string') orgNames.push(v.org)
      if (Array.isArray(v.also)) {
        for (const o of v.also) {
          const org = (o as { org?: unknown } | null)?.org
          if (typeof org === 'string') orgNames.push(org)
        }
      }
      orgNames.push(...strings(v.peers))
    }
  }
  return mergeExclusions({ orgNames: clean(orgNames), places: clean(places), languages: clean(languages) })
}

export function mergeExclusions(...lists: (QueryExclusions | undefined)[]): QueryExclusions {
  const out: QueryExclusions = {}
  for (const field of ['orgNames', 'places', 'languages'] as const) {
    const seen = new Set<string>()
    const terms: string[] = []
    for (const list of lists) {
      for (const term of list?.[field] ?? []) {
        const key = isCaseSensitiveTerm(term) ? `c:${term}` : `i:${term.toLowerCase()}`
        if (seen.has(key)) continue
        seen.add(key)
        terms.push(term)
      }
    }
    if (terms.length > 0) out[field] = terms
  }
  return out
}
