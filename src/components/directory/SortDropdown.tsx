import { ArrowUpDown } from 'lucide-react'
import type { SortMode } from '../../lib/sort'

const LABELS: Record<SortMode, string> = {
  shuffle: 'Featured shuffle',
  newly_added: 'Newly Added',
  location: 'Location (A–Z)',
  career_level: 'Career Level',
}

const MODES: SortMode[] = ['shuffle', 'newly_added', 'location', 'career_level']

export function SortDropdown({
  value,
  onChange,
  ranked = false,
}: {
  value: SortMode
  onChange: (mode: SortMode) => void
  /** Ranking mode: order is always rank order, so the control is locked
   *  (match rework spec §2.2). */
  ranked?: boolean
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-ink-soft">
      <ArrowUpDown size={14} className="text-ink-faint" />
      <span className="sr-only">Sort by</span>
      <select
        value={ranked ? 'ranked' : value}
        disabled={ranked}
        title={ranked ? 'Ranked results are always in rank order' : undefined}
        onChange={(e) => onChange(e.target.value as SortMode)}
        className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium outline-none focus:border-brand-400 disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink-soft"
      >
        {ranked ? (
          <option value="ranked">Ranked by match</option>
        ) : (
          MODES.map((m) => (
            <option key={m} value={m}>
              {LABELS[m]}
            </option>
          ))
        )}
      </select>
    </label>
  )
}
