import { ADJUSTMENT_CAP, BAND_LABELS, NARRATIVE_FIT_WORDS } from './config'
import type { ScoreBreakdown } from './display'
import type { Band } from './types'
import type { Profile } from '../../types/db'

// ============================================================================
// ⚠ PLACEHOLDER NARRATIVE (docs/MavenScout-match-rework.md §6.2) — ~100 words,
// templated from the actual numbers so it never contradicts them: the band,
// the Fit score, the largest positive adjustment, and the most important
// unmet Important (strong) row. It never ranks a preference above the profile's
// own evidence. The real generated narrative comes with Loop8's engine.
// ============================================================================

// Keeps proper nouns intact: "No work history at USAID" → "no work history at USAID".
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

const TITLES = new Set(['dr', 'prof', 'professor', 'mr', 'mrs', 'ms', 'mx', 'eng', 'engr', 'sir', 'dame'])

/** How the narrative refers to the candidate after first mention: a person's
 *  first name (skipping titles like "Dr."), or a firm's full name. */
/** "Amara's", "Ifeoma Obi & Associates'". */
const possessive = (name: string) => (name.endsWith('s') ? `${name}'` : `${name}'s`)

export function shortName(profile: Pick<Profile, 'name' | 'consultant_type'>): string {
  if (profile.consultant_type !== 'Individual') return profile.name
  const words = profile.name.split(/\s+/)
  return words.find((w) => !TITLES.has(w.toLowerCase().replace(/\.$/, ''))) ?? profile.name
}

export function buildNarrative(args: {
  profile: Profile
  total: number
  band: Band
  fit: number
  capped: boolean
  /** The displayed build-up, so quoted points match the screen exactly. */
  breakdown: ScoreBreakdown
  /** Extracted JD terms the candidate's tags cover, best first. */
  coveredTerms: string[]
}): string {
  const { profile, total, band, fit, capped, breakdown, coveredTerms } = args
  const bonus = breakdown.bonus
  const adjustments = breakdown.rows.map((r) => r.adjustment)
  const first = shortName(profile)
  const parts: string[] = []

  parts.push(`${profile.name} is a ${BAND_LABELS[band].toLowerCase()} for this brief at ${total}/100.`)

  const fitWord =
    fit >= NARRATIVE_FIT_WORDS.strong ? 'strong' : fit >= NARRATIVE_FIT_WORDS.moderate ? 'moderate' : 'limited'
  parts.push(
    `Fit to the job description is ${fit}/100 — ${fitWord} overlap between the JD and ${possessive(first)} portfolio, bio and tags` +
      (coveredTerms.length ? `, which cover ${coveredTerms.slice(0, 2).join(' and ')}.` : '.'),
  )

  const gains = breakdown.rows
    .filter((r) => r.points > 0)
    .sort((a, b) => b.points - a.points || b.adjustment.points - a.adjustment.points)
  if (gains.length) {
    const top = gains[0]
    parts.push(
      `Your preferences added ${bonus} point${bonus === 1 ? '' : 's'}` +
        `${capped ? ` (capped at +${ADJUSTMENT_CAP})` : ''}, the most from "${top.adjustment.label}" (+${top.points}).`,
    )
  } else if (adjustments.length) {
    parts.push('None of your preferences added points.')
  }

  const unmetStrong = adjustments.find((a) => a.level === 'strong' && a.outcome === 'not_met')
  if (unmetStrong)
    parts.push(
      `Worth checking: "${unmetStrong.label}" is marked Important and isn't met (${lowerFirst(unmetStrong.detail)}).`,
    )
  else if (adjustments.some((a) => a.level === 'strong'))
    parts.push('Everything marked Important is met or partly met.')

  parts.push(`The score reflects fit to this brief, not overall caliber — weigh it alongside ${possessive(first)} portfolio and references.`)
  return parts.join(' ')
}
