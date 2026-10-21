import { ADJUSTMENT_CAP, BAND_LABELS } from './config'
import type { Adjustment, Band } from './types'
import type { Profile } from '../../types/db'

// ============================================================================
// ⚠ PLACEHOLDER NARRATIVE (docs/MavenScout-match-rework.md §6.2) — ~100 words,
// templated from the actual numbers so it never contradicts them: the band,
// the Fit score, the largest positive adjustment, and the most important
// unmet Strong preference. It never ranks a preference above the profile's
// own evidence. The real generated narrative comes with Loop8's engine.
// ============================================================================

// Keeps proper nouns intact: "No work history at USAID" → "no work history at USAID".
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

export function buildNarrative(args: {
  profile: Profile
  total: number
  band: Band
  fit: number
  bonus: number // capped preference bonus, rounded
  capped: boolean
  adjustments: Adjustment[]
  /** Extracted JD terms the candidate's tags cover, best first. */
  coveredTerms: string[]
}): string {
  const { profile, total, band, fit, bonus, capped, adjustments, coveredTerms } = args
  const first = profile.name.split(' ')[0]
  const parts: string[] = []

  parts.push(`${profile.name} is a ${BAND_LABELS[band].toLowerCase()} for this brief at ${total}/100.`)

  const fitWord = fit >= 70 ? 'strong' : fit >= 50 ? 'moderate' : 'limited'
  parts.push(
    `Fit to the job description is ${fit}/100 — ${fitWord} overlap between the JD and ${first}'s portfolio, bio and tags` +
      (coveredTerms.length ? `, which cover ${coveredTerms.slice(0, 2).join(' and ')}.` : '.'),
  )

  const gains = adjustments.filter((a) => a.points > 0).sort((a, b) => b.points - a.points)
  if (gains.length) {
    const top = gains[0]
    parts.push(
      `Your preferences added ${bonus} point${bonus === 1 ? '' : 's'}` +
        `${capped ? ` (capped at +${ADJUSTMENT_CAP})` : ''}, the most from "${top.label}" (+${Math.round(top.points)}).`,
    )
  } else if (adjustments.length) {
    parts.push('None of your preferences added points.')
  }

  const unmetStrong = adjustments.find((a) => a.level === 'strong' && a.outcome === 'not_met')
  if (unmetStrong)
    parts.push(
      `Worth checking: "${unmetStrong.label}" was a Strong preference and isn't met (${lowerFirst(unmetStrong.detail)}).`,
    )
  else if (adjustments.some((a) => a.level === 'strong'))
    parts.push('Every Strong preference is met or partly met.')

  parts.push(`The score reflects fit to this brief, not overall caliber — weigh it alongside ${first}'s portfolio and references.`)
  return parts.join(' ')
}
