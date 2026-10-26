import { type AvailabilityFilter, type AvailabilityWhen } from '../../lib/filters'
import { Segmented } from '../ui/Segmented'

// The availability choices (PRD 7.16), shared by the filter modal and the
// ranking drawer's Availability row so the two stay one control: which track
// (Part time or Full time; neither picked = either), a shortcut (available
// now, for how long), or custom start and end dates. onChange only ever
// sends a complete value: custom dates apply once the start date is set.

type Track = 'partTime' | 'fullTime'

const TRACKS: { value: Track; label: string }[] = [
  { value: 'partTime', label: 'Part time' },
  { value: 'fullTime', label: 'Full time' },
]

const SHORTCUTS: { value: AvailabilityWhen; label: string }[] = [
  { value: 'now_1m', label: 'Available now for next month' },
  { value: 'now_3m', label: 'Available now for next 3 months' },
  { value: 'now_6m', label: 'Available now for next 6 months' },
  { value: 'now_open', label: 'Available now (open-ended)' },
]

const NONE = { byMonth: null, fromMonth: null, untilMonth: null, fromDate: null, untilDate: null }

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function AvailabilityControls({
  value,
  onChange,
  compact = false,
}: {
  value: AvailabilityFilter
  onChange: (next: AvailabilityFilter) => void
  /** Smaller type for the ranking drawer. */
  compact?: boolean
}) {
  const heading = compact ? 'mb-1.5 text-xs font-medium text-ink-soft' : 'mb-2 text-sm font-medium'
  const track: Track | '' = value.partTime && value.fullTime ? '' : value.partTime ? 'partTime' : 'fullTime'
  const isCustom = value.when === 'dates'
  const fromDate = isCustom ? (value.fromDate ?? '') : ''
  const untilDate = isCustom ? (value.untilDate ?? '') : ''
  const setDates = (from: string, until: string) =>
    onChange(
      from
        ? { ...value, when: 'dates', ...NONE, fromDate: from, untilDate: until && until >= from ? until : null }
        : { ...value, when: 'any', ...NONE },
    )
  const dateInput = `w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink outline-none focus:border-brand-400 ${
    compact ? 'text-xs' : 'text-sm'
  }`

  return (
    <div className={compact ? 'space-y-3' : 'space-y-5'}>
      <div>
        {/* Picking the active track again goes back to either. */}
        <Segmented
          label="Engagement"
          value={track as Track}
          options={TRACKS}
          onChange={(t) =>
            onChange(
              t === track
                ? { ...value, partTime: true, fullTime: true }
                : { ...value, partTime: t === 'partTime', fullTime: t === 'fullTime' },
            )
          }
          className="w-full"
        />
        {!compact && (
          <p className="mt-1.5 text-xs text-ink-faint">
            {track ? 'Pick it again to include either.' : 'Neither picked means either.'}
          </p>
        )}
      </div>

      <div>
        <p className={heading}>Shortcuts</p>
        <div className="flex flex-col gap-1" role="radiogroup" aria-label="Shortcuts">
          {SHORTCUTS.map((s) => {
            const on = value.when === s.value
            return (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ ...value, when: on ? 'any' : s.value, ...NONE })}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  compact ? 'text-xs' : 'text-sm'
                } ${on ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-paper'}`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    on ? 'border-brand-500' : 'border-ink-faint/60'
                  }`}
                  aria-hidden
                >
                  {on && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                </span>
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className={heading}>Custom</p>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="mb-1 block text-xs text-ink-soft">Start date</span>
            <input
              type="date"
              min={today()}
              value={fromDate}
              onChange={(e) => setDates(e.target.value, untilDate)}
              className={dateInput}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-ink-soft">End date</span>
            <input
              type="date"
              min={fromDate || today()}
              value={untilDate}
              disabled={!fromDate}
              onChange={(e) => setDates(fromDate, e.target.value)}
              className={`${dateInput} disabled:cursor-not-allowed disabled:opacity-50`}
            />
          </label>
        </div>
        {!compact && (
          <p className="mt-2 text-xs text-ink-faint">
            Available by the start date and still available on the end date (optional). Timed choices count
            availability updated in the last 90 days.
          </p>
        )}
      </div>
    </div>
  )
}
