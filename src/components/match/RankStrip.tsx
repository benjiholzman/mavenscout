import { BAND_LABELS } from '../../lib/matching/config'
import { preferenceScoreLabel } from '../../lib/matching/display'
import { isPreferenceResult, type Band, type MatchResult } from '../../lib/matching/types'

// The rank strip (match rework spec §7.1): "#1 · 82 · Strong match" plus an
// "About this result" link. A preferences-only run (§11) has no bands: a
// neutral strip with "#1 · Meets 23 of 46 preference points (50%)" on rows,
// shortened to "Meets 23 of 46 pts (50%)" on cards, where the full form
// doesn't fit beside "About this result". Fixed height and never expands, so ranked cards
// stay uniform. `card` sits flush in the top of a flip card's frame; `row`
// is the compact form for opening / shared-shortlist rows.

export const BAND_STYLES: Record<Band, { strip: string; dot: string; text: string }> = {
  strong: { strip: 'bg-brand-50', dot: 'bg-brand-500', text: 'text-brand-800' },
  good: { strip: 'bg-brand-50/50', dot: 'bg-brand-300', text: 'text-brand-700' },
  partial: { strip: 'bg-gold-300/15', dot: 'bg-gold-500', text: 'text-gold-700' },
  weak: { strip: 'bg-paper', dot: 'bg-ink-faint/60', text: 'text-ink-soft' },
}

/** Preferences-only results: one neutral style, so nothing reads as a band. */
export const PREFERENCE_STYLE = { strip: 'bg-paper', text: 'text-ink' }

export function RankStrip({
  rank,
  result,
  onAbout,
  variant = 'card',
}: {
  rank: number
  result: MatchResult
  onAbout: () => void
  variant?: 'card' | 'row'
}) {
  const style = isPreferenceResult(result) ? PREFERENCE_STYLE : BAND_STYLES[result.band]
  const label = isPreferenceResult(result) ? (
    <span className={`flex min-w-0 items-center gap-1.5 truncate font-semibold ${style.text}`}>
      <span className="tabular-nums">#{rank}</span>
      <span aria-hidden className="font-normal opacity-50">·</span>
      <span className="truncate font-medium tabular-nums" title={preferenceScoreLabel(result)}>
        {preferenceScoreLabel(result, { compact: variant === 'card' })}
      </span>
    </span>
  ) : (
    <span className={`flex min-w-0 items-center gap-1.5 truncate font-semibold ${style.text}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${BAND_STYLES[result.band].dot}`} aria-hidden />
      <span className="tabular-nums">#{rank}</span>
      <span aria-hidden className="font-normal opacity-50">·</span>
      <span className="tabular-nums">{result.total_score}</span>
      <span aria-hidden className="font-normal opacity-50">·</span>
      <span className="truncate">{BAND_LABELS[result.band]}</span>
    </span>
  )
  const about = (
    <button
      type="button"
      onClick={onAbout}
      className="shrink-0 font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-600"
    >
      About this result
    </button>
  )
  if (variant === 'row')
    return (
      <div className={`inline-flex h-7 max-w-full items-center gap-2.5 rounded-full px-3 text-xs ${style.strip}`}>
        {label}
        {about}
      </div>
    )
  return (
    <div
      className={`flex h-9 shrink-0 items-center justify-between gap-2 rounded-t-card border-b border-line-soft px-3.5 text-[13px] ${style.strip}`}
    >
      {label}
      {about}
    </div>
  )
}
