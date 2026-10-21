import { CREDIT, FIT_BLEND, FIT_CALIBRATION } from './config'
import { contentWords, normalizeText } from './text'
import type { ExtractedRequirements } from './types'
import type { PortfolioItem, Profile, TagSelection } from '../../types/db'

// ============================================================================
// ⚠ PLACEHOLDER FIT (docs/MavenScout-match-rework.md §5.2) — NOT the real
// engine. Fit is the engine's holistic judgment of how well a candidate fits
// the JD; managers can't adjust it. This stand-in keeps the old model's
// ingredients at the old 5/3/3 ratio:
//   - demonstrated experience: how many of the JD's salient terms appear in the
//     candidate's evidence (headline, bio, portfolio, accreditations, video and
//     audio transcripts);
//   - domain expertise / technical skills: how well the candidate's tags cover
//     the expertise and skills extracted from the JD (primary > secondary,
//     specific > broad).
// The blended 0–1 value goes through a calibration curve so a clearly on-topic
// profile lands at 70+ instead of everyone clustering in the 40s. Loop8
// replaces all of this; the curve and weights live in config.ts.
// ============================================================================

export interface CandidateInput {
  profile: Profile
  portfolio: PortfolioItem[]
  /** Video Q&A + published audio-testimonial transcripts. */
  transcripts: string[]
}

/** What Fit needs from the JD, computed ONCE per run — never per candidate. */
export interface JdSignature {
  /** The JD's most frequent content words plus the extracted term words. */
  salient: Set<string>
  expertise: ExtractedRequirements['expertise']
  skills: ExtractedRequirements['skills']
}

/** Taxonomy lookups for one tag kind. */
export interface TagIndex {
  parentOf: Map<string, string> // item name → category name
  childrenOf: Map<string, string[]> // category name → item names
}

export function buildJdSignature(rawText: string, extracted: ExtractedRequirements | null): JdSignature {
  const freq = new Map<string, number>()
  const words = contentWords(rawText)
  words.forEach((w) => freq.set(w, (freq.get(w) ?? 0) + 1))
  const firstSeen = new Map<string, number>()
  words.forEach((w, i) => firstSeen.has(w) || firstSeen.set(w, i))
  const top = [...freq.keys()]
    .sort((a, b) => freq.get(b)! - freq.get(a)! || firstSeen.get(a)! - firstSeen.get(b)!)
    .slice(0, FIT_CALIBRATION.salientTerms)
  const termWords = [...(extracted?.expertise ?? []), ...(extracted?.skills ?? [])].flatMap((t) =>
    contentWords(t.name),
  )
  return {
    salient: new Set([...top, ...termWords]),
    expertise: extracted?.expertise ?? [],
    skills: extracted?.skills ?? [],
  }
}

export function evidenceText(c: CandidateInput): string {
  const { profile, portfolio, transcripts } = c
  return [
    profile.headline,
    profile.detailed_bio ?? '',
    ...portfolio.flatMap((p) => [p.project_name, p.role, p.description, p.results ?? '']),
    ...profile.accreditations.map((a) => `${a.name} ${a.issuing_organization}`),
    ...transcripts,
  ].join(' ')
}

/** Share of the JD's salient terms that appear in the candidate's evidence. */
function evidenceScore(sig: JdSignature, c: CandidateInput): number {
  if (sig.salient.size === 0) return 0
  const have = new Set(normalizeText(evidenceText(c)).trim().split(' '))
  let hits = 0
  for (const t of sig.salient) if (have.has(t)) hits++
  return hits / sig.salient.size
}

/** Best credit the candidate's tags earn for one extracted term (spec §3.3
 *  multipliers): the exact tag (primary 1, secondary 0.75), or the parent
 *  category of a requested item (0.5), or — for a requested category — any
 *  item under it at its tier credit. */
export function tagCredit(
  tags: TagSelection[],
  term: { name: string; level: 'category' | 'item' },
  index: TagIndex,
): { credit: number; via: TagSelection | null; parentOnly: boolean } {
  const tierCredit = (t: TagSelection) => (t.tier === 'primary' ? CREDIT.primaryTag : CREDIT.secondaryTag)
  let best = { credit: 0, via: null as TagSelection | null, parentOnly: false }
  for (const t of tags) {
    let credit = 0
    let parentOnly = false
    if (t.name === term.name) credit = tierCredit(t)
    else if (term.level === 'category' && index.parentOf.get(t.name) === term.name) credit = tierCredit(t)
    else if (term.level === 'item' && t.level === 'category' && index.parentOf.get(term.name) === t.name) {
      credit = CREDIT.parentTag
      parentOnly = true
    }
    if (credit > best.credit) best = { credit, via: t, parentOnly }
  }
  return best
}

/** Coverage of the JD's extracted terms by the candidate's tags. Strong terms
 *  weigh 1, slight 0.6; full marks once the matched weight reaches the weight
 *  of two strong terms, so a focused specialist isn't penalised for not
 *  tagging everything a long JD mentions (candidates can tag only 6 items). */
function tagCoverage(
  tags: TagSelection[],
  terms: ExtractedRequirements['expertise'],
  index: TagIndex,
  fallbackJdText: string,
): number {
  if (terms.length === 0) {
    // No extraction: fall back to "which of my tags does the JD mention".
    if (tags.length === 0) return 0
    const jd = normalizeText(fallbackJdText)
    const hit = tags.filter((t) => jd.includes(normalizeText(t.name))).length
    return Math.min(1, hit / 2)
  }
  let earned = 0
  let possible = 0
  for (const term of terms) {
    const w = term.suggested === 'strong' ? 1 : 0.6
    possible += w
    earned += w * tagCredit(tags, term, index).credit
  }
  return Math.min(1, earned / Math.min(possible, 2))
}

export interface FitBreakdown {
  fit: number // 0–100, float
  evidence: number // 0–1
  expertise: number // 0–1
  skills: number // 0–1
}

export function computeFit(
  c: CandidateInput,
  sig: JdSignature,
  index: { expertise: TagIndex; skills: TagIndex },
  rawText: string,
): FitBreakdown {
  const evidence = evidenceScore(sig, c)
  const expertise = tagCoverage(c.profile.expertise, sig.expertise, index.expertise, rawText)
  const skills = tagCoverage(c.profile.skills, sig.skills, index.skills, rawText)
  const total = FIT_BLEND.evidence + FIT_BLEND.expertise + FIT_BLEND.skills
  const raw =
    (FIT_BLEND.evidence * evidence + FIT_BLEND.expertise * expertise + FIT_BLEND.skills * skills) / total
  // Calibration curve: 100 × (1 − e^(−k·raw)) / (1 − e^(−k)), so raw 1 → 100.
  const k = FIT_CALIBRATION.steepness
  const fit = (100 * (1 - Math.exp(-k * raw))) / (1 - Math.exp(-k))
  return { fit, evidence, expertise, skills }
}
