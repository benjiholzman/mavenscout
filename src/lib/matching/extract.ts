import { buildExpertiseIndex, type ExpertiseItem } from '../expertise'
import { EXTRACTION_STRONG_MIN_OCCURRENCES, MAX_TAG_ROWS } from './config'
import { countTerm as countOccurrences, escapeRe, isAcronym, normalizeText as normalize } from './text'
import type { ExtractedRequirements, ExtractedTag, ExtractedValue, ExtractRequirementsFn } from './types'

// ============================================================================
// ⚠ PLACEHOLDER EXTRACTION — Loop8 replaces this with real JD understanding.
// (docs/MavenScout-match-rework.md §4)
//
// Finds expertise items, locations and languages that literally appear in the
// pasted JD. Deterministic and deliberately simple: it exists so the
// requirements grid is demoable end to end.
//
// Expertise items (the unified list, profiles-membership §6) are found by their
// name, the old item names they absorbed, and their aliases, with two guards:
// - acronyms ("M&E", "PFM", "WASH", "SEA") count only when written as acronyms,
//   matched case-sensitively in the raw JD, so "sea level" or "km" don't;
// - single ordinary words among the aliases ("training", "learning") are left
//   out: they're too common in JDs to signal the item.
// Within one item, a longer term's matches are set aside before shorter terms
// are counted, so "public procurement" doesn't also count as "procurement".
//
// CONTRACT FOR LOOP8: the JD is read ONCE, here. The output is persisted with
// the job description (job_descriptions.extracted); scoring then receives the
// extracted requirements plus the stored JD *reference* (its id). Scoring must
// not re-send the full JD text per candidate — a 15,000-character JD would
// multiply cost across hundreds of candidates.
//
// Guardrails (spec §2): extraction only SUGGESTS — the panel shows the
// results as chips and nothing enters the grid until the manager adds it.
// It never suggests Required.
// ============================================================================

/** Mentions of one item in the JD, each occurrence counted once. */
function itemMentions(rawJd: string, normalizedJd: string, item: ExpertiseItem): number {
  const terms = [...new Set([item.name, ...item.legacyNames, ...item.aliases])]
  const acronyms = terms.filter(isAcronym)
  const phrases = terms
    .filter((t) => !isAcronym(t))
    // Aliases that are one ordinary word are skipped; names and old names aren't.
    .filter((t) => t === item.name || item.legacyNames.includes(t) || normalize(t).trim().includes(' '))
    .map((t) => normalize(t))
    .sort((a, b) => b.length - a.length)
  let count = 0
  let text = normalizedJd
  for (const p of phrases) {
    const n = countOccurrences(text, p)
    if (n > 0) {
      count += n
      text = text.split(p).join(' # ') // set the matches aside
    }
  }
  let raw = rawJd
  for (const a of acronyms.sort((x, y) => y.length - x.length)) {
    const re = new RegExp(`(?<![A-Za-z0-9])${escapeRe(a)}(?![A-Za-z0-9])`, 'g')
    const n = raw.match(re)?.length ?? 0
    if (n > 0) {
      count += n
      raw = raw.replace(re, ' # ')
    }
  }
  return count
}

export const extractRequirements: ExtractRequirementsFn = async (jdText, ctx) => {
  const text = normalize(jdText)

  // Expertise items, counted in the JD.
  const index = buildExpertiseIndex(ctx.taxonomy.categories, ctx.taxonomy.items)
  const hits = index.items
    .map((item, order) => ({ name: item.name, mentions: itemMentions(jdText, text, item), order }))
    .filter((h) => h.mentions > 0)
  // Highest frequency first, list order as the tie-break; capped.
  const expertise: ExtractedTag[] = hits
    .sort((a, b) => b.mentions - a.mentions || a.order - b.order)
    .slice(0, MAX_TAG_ROWS)
    .map(({ name, mentions }) => ({
      name,
      mentions,
      suggested: mentions >= EXTRACTION_STRONG_MIN_OCCURRENCES ? 'strong' : 'slight',
    }))

  // Location options are bare countries ("Kenya") or "City, Country". A city
  // is matched by its city part; a country by its name.
  const byMentions = (a: ExtractedValue, b: ExtractedValue) => b.mentions - a.mentions
  const locations = ctx.locationOptions
    .map((value) => {
      const comma = value.lastIndexOf(',')
      const place = comma === -1 ? value : value.slice(0, comma)
      return { value, mentions: countOccurrences(text, place) }
    })
    .filter((l) => l.mentions > 0)
    .sort(byMentions)
  const languages = ctx.languageOptions
    .map((value) => ({ value, mentions: countOccurrences(text, value) }))
    .filter((l) => l.mentions > 0)
    .sort(byMentions)

  const out: ExtractedRequirements = {
    expertise,
    locations,
    languages,
    // The placeholder doesn't try to find the hiring organization; the Org
    // History row is prefilled from the manager's own organization instead.
    hiring_organization: null,
  }
  return out
}
