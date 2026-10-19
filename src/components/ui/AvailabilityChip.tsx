import { fmtMonth, fmtMonthYear, parseLocalDate } from '../../lib/dates'
import type { AvailabilityTrack } from '../../types/db'
import { Tooltip } from './Tooltip'

// Compact availability chip (PRD 7.16): the chip shows only when a track
// starts ("Now", "From Mar 2027", "Unavailable"); the tooltip carries the full
// range. Display only — the directory filter still matches full date ranges.

const TRACKS = {
  PT: 'Part-time',
  FT: 'Full-time',
} as const

const TONES = {
  now: { tab: 'bg-emerald-100 text-emerald-800', value: 'text-ink-soft' },
  future: { tab: 'bg-amber-100 text-amber-800', value: 'text-ink-soft' },
  unavailable: { tab: 'bg-ink/5 text-ink-faint', value: 'text-ink-faint' },
}

/** "Nov to Dec 2026" within a year; "Nov 2026 to Feb 2027" across years. */
function fmtRange(from: string, until: string): string {
  const sameYear = parseLocalDate(from).getFullYear() === parseLocalDate(until).getFullYear()
  return `${sameYear ? fmtMonth(from) : fmtMonthYear(from)} to ${fmtMonthYear(until)}`
}

export function describeAvailability(track: AvailabilityTrack | null) {
  if (!track || track.status === 'unavailable') {
    return { tone: 'unavailable' as const, short: 'Unavailable', full: 'Unavailable' }
  }
  if (track.status === 'available_now') {
    return {
      tone: 'now' as const,
      short: 'Now',
      full: track.until ? `Now to ${fmtMonthYear(track.until)}` : 'Now',
    }
  }
  if (!track.from) return { tone: 'future' as const, short: 'Soon', full: 'Soon' }
  return {
    tone: 'future' as const,
    short: `From ${fmtMonthYear(track.from)}`,
    full: track.until ? fmtRange(track.from, track.until) : `From ${fmtMonthYear(track.from)}`,
  }
}

export function AvailabilityChip({
  kind,
  track,
  align = 'start',
}: {
  kind: keyof typeof TRACKS
  track: AvailabilityTrack | null
  align?: 'start' | 'center' | 'end'
}) {
  const { tone, short, full } = describeAvailability(track)
  const t = TONES[tone]
  return (
    <Tooltip
      tapToggle
      align={align}
      content={
        <>
          <span className="block font-semibold">{TRACKS[kind]} availability:</span>
          <span className="block">{full}</span>
        </>
      }
    >
      <button
        type="button"
        aria-label={`${TRACKS[kind]} availability: ${full}`}
        className="inline-flex items-stretch whitespace-nowrap rounded-md border border-line bg-white text-[12.5px] leading-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
      >
        <span className={`rounded-l-[5px] px-1.5 py-px font-bold ${t.tab}`}>{kind}</span>
        <span className={`px-[7px] py-px font-medium ${t.value}`}>{short}</span>
      </button>
    </Tooltip>
  )
}
