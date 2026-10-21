import { EXTRACTION_STRONG_MIN_OCCURRENCES, MAX_TAG_ROWS } from './config'
import type { ExtractedRequirements, ExtractedTag, ExtractRequirementsFn } from './types'

// ============================================================================
// ⚠ PLACEHOLDER EXTRACTION — Loop8 replaces this with real JD understanding.
// (docs/MavenScout-match-rework.md §4)
//
// Finds taxonomy, location, and language names that literally appear in the
// pasted JD. Deterministic and deliberately simple: it exists so the
// requirements grid is demoable end to end.
//
// CONTRACT FOR LOOP8: the JD is read ONCE, here. The output is persisted with
// the job description (job_descriptions.extracted); scoring then receives the
// extracted requirements plus the stored JD *reference* (its id). Scoring must
// not re-send the full JD text per candidate — a 15,000-character JD would
// multiply cost across hundreds of candidates.
//
// Guardrails (spec §2): extraction never suggests Must-have, and the hiring
// organization (if found) only fills the Org History row's name — that row's
// level stays No preference.
// ============================================================================

/** Lowercase, '&' → 'and', every other non-alphanumeric run → one space, so
 *  "Monitoring & Evaluation", "monitoring and evaluation" and
 *  "Monitoring-and-Evaluation" all compare equal. Padded with spaces so a
 *  search for " wash " only hits whole words. */
function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `
}

function countOccurrences(haystack: string, name: string): number {
  const needle = normalize(name)
  if (needle.trim().length < 2) return 0
  let count = 0
  let from = 0
  for (;;) {
    const at = haystack.indexOf(needle, from)
    if (at === -1) return count
    count += 1
    from = at + needle.length - 1 // keep the trailing space as the next match's leading space
  }
}

export const extractRequirements: ExtractRequirementsFn = async (jdText, ctx) => {
  const text = normalize(jdText)

  // Taxonomy terms (categories and items), counted in the JD.
  type Hit = ExtractedTag & { kind: 'expertise' | 'skills'; count: number; order: number }
  const hits: Hit[] = []
  let order = 0
  for (const cat of ctx.taxonomy.categories) {
    if (cat.type !== 'domain_expertise' && cat.type !== 'technical_skills') continue
    const kind = cat.type === 'domain_expertise' ? 'expertise' : 'skills'
    const names: { name: string; level: 'category' | 'item' }[] = [
      { name: cat.name, level: 'category' },
      ...ctx.taxonomy.items
        .filter((i) => i.category_id === cat.id)
        .map((i) => ({ name: i.name, level: 'item' as const })),
    ]
    for (const n of names) {
      order += 1
      const count = countOccurrences(text, n.name)
      if (count === 0) continue
      hits.push({
        kind,
        name: n.name,
        level: n.level,
        suggested: count >= EXTRACTION_STRONG_MIN_OCCURRENCES ? 'strong' : 'slight',
        count,
        order,
      })
    }
  }
  // Highest frequency first, taxonomy order as the tie-break; cap the total.
  const kept = hits.sort((a, b) => b.count - a.count || a.order - b.order).slice(0, MAX_TAG_ROWS)
  const strip = ({ name, level, suggested }: Hit): ExtractedTag => ({ name, level, suggested })

  // Location options are bare countries ("Kenya") or "City, Country". A city
  // is matched by its city part; a country by its name.
  const locations = ctx.locationOptions.filter((value) => {
    const comma = value.lastIndexOf(',')
    const place = comma === -1 ? value : value.slice(0, comma)
    return countOccurrences(text, place) > 0
  })
  const languages = ctx.languageOptions.filter((l) => countOccurrences(text, l) > 0)

  const out: ExtractedRequirements = {
    expertise: kept.filter((h) => h.kind === 'expertise').map(strip),
    skills: kept.filter((h) => h.kind === 'skills').map(strip),
    locations,
    languages,
    // The placeholder doesn't try to find the hiring organization; the Org
    // History row is prefilled from the manager's own organization instead.
    hiring_organization: null,
  }
  return out
}
