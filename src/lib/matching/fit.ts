import { expertiseTags } from '../expertise'
import { CREDIT, FIT_BLEND, FIT_CALIBRATION, TAG_COVERAGE_SATURATION } from './config'
import { contentWords, normalizeText } from './text'
import type { ExtractedRequirements } from './types'
import type { PortfolioItem, Profile } from '../../types/db'

// ============================================================================
// ⚠ PLACEHOLDER FIT (docs/MavenScout-match-rework.md §5.2) — NOT the real
// engine. Fit is the engine's holistic judgment of how well a candidate fits
// the JD; managers can't adjust it. This stand-in keeps the old model's
// ingredients at the old ratio (5 : 6, as 5/3/3 was before expertise and
// skills became one list):
//   - demonstrated experience: how many of the JD's salient terms appear in the
//     candidate's evidence (headline, bio, portfolio, accreditations). Video
//     and audio transcripts are never Fit inputs (profiles-membership §11);
//   - expertise tags: how well the candidate's tags cover the expertise
//     extracted from the JD (Core > Strong > Working knowledge).
// The blended 0–1 value goes through a calibration curve so a clearly on-topic
// profile lands at 70+ instead of everyone clustering in the 40s. Loop8
// replaces all of this; the curve and weights live in config.ts.
// ============================================================================

/** What Fit reads about a candidate. No transcripts: video Q&As and audio
 *  testimonials never feed ranking (profiles-membership §4.1, §5, §11). */
export interface CandidateInput {
  profile: Profile
  portfolio: PortfolioItem[]
}

/** What Fit needs from the JD, computed ONCE per run — never per candidate. */
export interface JdSignature {
  /** The JD's most frequent content words plus the extracted term words. */
  salient: Set<string>
  expertise: ExtractedRequirements['expertise']
}

/** Words for the practical conditions criteria handle (availability, career
 *  level, work arrangement, language proficiency). Fit judges capability for
 *  the work only, so these never count as salient JD terms. */
const CONDITION_WORDS = new Set(
  (
    'available availability start immediately months weeks days full part time remote onsite site hybrid ' +
    'travel based senior junior mid level years experience fluent fluency proficiency proficient native ' +
    'working knowledge language languages spoken written'
  ).split(' '),
)

export function buildJdSignature(rawText: string, extracted: ExtractedRequirements | null): JdSignature {
  // Location and language words go to criteria, not Fit — unless they're part
  // of an extracted expertise item (e.g. translation, a country specialism).
  const termWords = (extracted?.expertise ?? []).flatMap((t) => contentWords(t.name))
  const expertiseWords = new Set(termWords)
  const conditionWords = new Set([
    ...CONDITION_WORDS,
    ...[...(extracted?.locations ?? []), ...(extracted?.languages ?? [])].flatMap((o) => contentWords(o.value)),
    ...contentWords(extracted?.hiring_organization ?? ''),
  ])
  const freq = new Map<string, number>()
  const words = contentWords(rawText).filter((w) => expertiseWords.has(w) || !conditionWords.has(w))
  words.forEach((w) => freq.set(w, (freq.get(w) ?? 0) + 1))
  const firstSeen = new Map<string, number>()
  words.forEach((w, i) => firstSeen.has(w) || firstSeen.set(w, i))
  const top = [...freq.keys()]
    .sort((a, b) => freq.get(b)! - freq.get(a)! || firstSeen.get(a)! - firstSeen.get(b)!)
    .slice(0, FIT_CALIBRATION.salientTerms)
  return {
    salient: new Set([...top, ...termWords]),
    expertise: extracted?.expertise ?? [],
  }
}

export function evidenceText(c: CandidateInput): string {
  const { profile, portfolio } = c
  return [
    profile.headline,
    profile.detailed_bio ?? '',
    ...portfolio.flatMap((p) => [p.project_name, p.role, p.description, p.results ?? '']),
    ...profile.accreditations.map((a) => `${a.name} ${a.issuing_organization}`),
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

/** Credit the candidate's tag earns for one item (profiles-membership §6):
 *  Core 1, Strong 0.75, Working knowledge 0.4, untagged 0. */
export function tagCredit(profile: Pick<Profile, 'tiered_expertise'>, name: string): number {
  const tag = expertiseTags(profile).find((t) => t.name === name)
  return tag ? CREDIT[tag.tier] : 0
}

/** Coverage of the JD's extracted items by the candidate's tags. Strong terms
 *  weigh 1, slight 0.6; full marks once the matched weight reaches
 *  TAG_COVERAGE_SATURATION strong terms, so a focused specialist isn't
 *  penalised for not tagging everything a long JD mentions. */
function tagCoverage(profile: Profile, terms: ExtractedRequirements['expertise'], fallbackJdText: string): number {
  const tags = expertiseTags(profile)
  if (terms.length === 0) {
    // No extraction: fall back to "which of my tags does the JD mention".
    if (tags.length === 0) return 0
    const jd = normalizeText(fallbackJdText)
    const hit = tags.filter((t) => jd.includes(normalizeText(t.name))).length
    return Math.min(1, hit / TAG_COVERAGE_SATURATION)
  }
  let earned = 0
  let possible = 0
  for (const term of terms) {
    const w = term.suggested === 'strong' ? 1 : 0.6
    possible += w
    earned += w * tagCredit(profile, term.name)
  }
  return Math.min(1, earned / Math.min(possible, TAG_COVERAGE_SATURATION))
}

export interface FitBreakdown {
  fit: number // 0–100, float
  evidence: number // 0–1
  expertise: number // 0–1
}

export function computeFit(c: CandidateInput, sig: JdSignature, rawText: string): FitBreakdown {
  const evidence = evidenceScore(sig, c)
  const expertise = tagCoverage(c.profile, sig.expertise, rawText)
  const total = FIT_BLEND.evidence + FIT_BLEND.expertise
  const raw = (FIT_BLEND.evidence * evidence + FIT_BLEND.expertise * expertise) / total
  // Calibration curve: 100 × (1 − e^(−k·raw)) / (1 − e^(−k)), so raw 1 → 100.
  const k = FIT_CALIBRATION.steepness
  const fit = (100 * (1 - Math.exp(-k * raw))) / (1 - Math.exp(-k))
  return { fit, evidence, expertise }
}
