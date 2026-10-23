import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { monthRangeLabel, type AvailabilityFilter, type AvailabilityWhen } from '../../lib/filters'

// The availability choices (PRD 7.16), shared by the filter modal and the
// ranking drawer's Availability row so the two stay one control: which tracks
// count (multi-select, never neither) and when by (one preset, or a month
// or months from the picker). onChange only ever sends a complete value: "By
// a specific month…" and "Specific dates…" open the picker and change nothing
// until the month (or the start and end months) are picked.

const TRACKS = [
  { key: 'partTime', label: 'Part-time' },
  { key: 'fullTime', label: 'Full-time' },
] as const

const PRESETS: { value: AvailabilityWhen; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'now', label: 'Available now' },
  { value: 'within_1m', label: 'Within 1 month' },
  { value: 'within_3m', label: 'Within 3 months' },
  { value: 'by_month', label: 'By a specific month…' },
  { value: 'between', label: 'Specific dates…' },
]

type Picking = 'by_month' | 'between' | null
const NONE = { byMonth: null, fromMonth: null, untilMonth: null }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const ym = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`
const monthName = (v: string) => `${MONTHS[Number(v.slice(5)) - 1]} ${v.slice(0, 4)}`

export function AvailabilityControls({
  value,
  onChange,
  compact = false,
}: {
  value: AvailabilityFilter
  onChange: (next: AvailabilityFilter) => void
  /** Smaller chips for the ranking drawer. */
  compact?: boolean
}) {
  const [picking, setPicking] = useState<Picking>(null)
  const chip = (on: boolean, extra = '') =>
    `rounded-full border font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
      compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
    } ${on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line bg-white text-ink-soft hover:border-ink-faint'} ${extra}`
  const heading = compact ? 'mb-1.5 text-xs font-medium text-ink-soft' : 'mb-2 text-sm font-medium'
  // The picker closes once the month(s) are picked; the chip reopens it.

  return (
    <div className={compact ? 'space-y-3' : 'space-y-5'}>
      <div>
        <p className={heading}>Engagement</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Engagement">
          {TRACKS.map((t) => {
            const on = value[t.key]
            const other = t.key === 'partTime' ? value.fullTime : value.partTime
            const locked = on && !other // the last one on can't be turned off
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={on}
                aria-disabled={locked}
                title={locked ? 'At least one is needed' : undefined}
                onClick={() => !locked && onChange({ ...value, [t.key]: !on })}
                className={chip(on, locked ? 'cursor-default' : '')}
              >
                {t.label}
              </button>
            )
          })}
        </div>
        {!compact && <p className="mt-1.5 text-xs text-ink-faint">Both selected means either.</p>}
      </div>

      <div>
        <p className={heading}>Available</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Available">
          {PRESETS.map((p) => {
            const on = picking ? picking === p.value : value.when === p.value
            const chosen =
              p.value === 'by_month' && value.when === 'by_month' && value.byMonth
                ? `By ${monthName(value.byMonth)}`
                : p.value === 'between' && value.when === 'between' && value.fromMonth && value.untilMonth
                  ? monthRangeLabel(value.fromMonth, value.untilMonth)
                  : null
            return (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  if (p.value === 'by_month' || p.value === 'between') return setPicking(p.value)
                  setPicking(null)
                  onChange({ ...value, when: p.value, ...NONE })
                }}
                className={chip(on)}
              >
                {chosen ?? p.label}
              </button>
            )
          })}
        </div>
        {picking === 'by_month' && (
          <MonthPicker
            start={value.when === 'by_month' ? value.byMonth : null}
            compact={compact}
            onPick={(m) => {
              setPicking(null)
              onChange({ ...value, when: 'by_month', ...NONE, byMonth: m })
            }}
          />
        )}
        {picking === 'between' && (
          <RangePicker
            value={value.when === 'between' ? [value.fromMonth, value.untilMonth] : [null, null]}
            compact={compact}
            onPick={(from, until) => {
              setPicking(null)
              onChange({ ...value, when: 'between', ...NONE, fromMonth: from, untilMonth: until })
            }}
          />
        )}
        {!compact && (
          <p className="mt-2 text-xs text-ink-faint">
            Experts already available are included. Timed choices count availability updated in the last 90 days.
          </p>
        )}
      </div>
    </div>
  )
}

/** Start and end months: the first pick is the start, the second the end
 *  (picking an earlier month restarts from it). Nothing is sent until both
 *  are picked; the same month twice is a one-month window. */
function RangePicker({
  value,
  onPick,
  compact,
}: {
  value: [string | null, string | null]
  onPick: (from: string, until: string) => void
  compact: boolean
}) {
  const [start, setStart] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const shown: [string | null, string | null] = start ? [start, null] : value
  return (
    <div>
      <p className="mt-2.5 text-xs text-ink-soft" aria-live="polite">
        {start ? (
          <>
            From <b className="font-medium text-ink">{monthName(start)}</b>. Now pick the end month.
          </>
        ) : (
          'Pick the start month, then the end month.'
        )}
      </p>
      <MonthPicker
        start={shown[0]}
        end={shown[1] ?? (start ? hover : null)}
        compact={compact}
        onHover={start ? setHover : undefined}
        onPick={(m) => {
          if (!start || m < start) return setStart(m)
          onPick(start, m)
        }}
      />
    </div>
  )
}

/** A year of months to pick from; months before this one are disabled.
 *  With `end`, the months from `start` to `end` show as a range. */
function MonthPicker({
  start,
  end = null,
  onPick,
  onHover,
  compact,
}: {
  start: string | null
  end?: string | null
  onPick: (ym: string) => void
  onHover?: (ym: string | null) => void
  compact: boolean
}) {
  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = ym(thisYear, now.getMonth())
  const [year, setYear] = useState(start ? Number(start.slice(0, 4)) : thisYear)

  return (
    <div className="mt-2.5 w-full max-w-xs rounded-xl border border-line bg-white p-2.5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous year"
          disabled={year <= thisYear}
          onClick={() => setYear(year - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-paper disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        <span className="text-sm font-semibold tabular-nums text-ink" aria-live="polite">
          {year}
        </span>
        <button
          type="button"
          aria-label="Next year"
          onClick={() => setYear(year + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-paper"
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
      <div
        className="grid grid-cols-4 gap-1"
        role="group"
        aria-label={`Months of ${year}`}
        onMouseLeave={onHover ? () => onHover(null) : undefined}
      >
        {MONTHS.map((label, i) => {
          const m = ym(year, i)
          const past = m < thisMonth
          const on = m === start || m === end
          const inRange = !!start && !!end && m > start && m < end
          return (
            <button
              key={m}
              type="button"
              disabled={past}
              aria-pressed={on}
              aria-label={`${label} ${year}`}
              onClick={() => onPick(m)}
              onMouseEnter={onHover && !past ? () => onHover(m) : undefined}
              className={`rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                compact ? 'py-1.5 text-xs' : 'py-2 text-sm'
              } ${
                on
                  ? 'bg-brand-500 text-white'
                  : inRange
                    ? 'bg-brand-50 text-brand-700'
                    : past
                    ? 'cursor-not-allowed text-ink-faint/50'
                    : `text-ink-soft hover:bg-brand-50 hover:text-brand-700 ${m === thisMonth ? 'ring-1 ring-inset ring-line' : ''}`
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
