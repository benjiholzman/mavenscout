import type { Level } from '../../lib/matching/types'
import { LEVEL_LABELS } from '../../lib/requirements/labels'

// Importance control for a priority (match rework spec §3), labelled for
// managers. "No preference" (null) means the priority has no row; the other
// levels are a row's level. A priority's Preferred section offers only Nice to
// have / Important.

export const NO_PREFERENCE = 'No preference'

const ALL: (Level | null)[] = [null, 'slight', 'strong', 'must']

export function LevelControl({
  value,
  onChange,
  rowLabel,
  levels = ALL,
}: {
  value: Level | null
  onChange: (level: Level | null) => void
  rowLabel: string
  levels?: (Level | null)[]
}) {
  return (
    <div
      role="radiogroup"
      aria-label={`${rowLabel}: importance`}
      className="grid gap-0.5 rounded-full border border-line bg-paper p-0.5"
      style={{ gridTemplateColumns: `repeat(${levels.length}, minmax(0, 1fr))` }}
    >
      {levels.map((level) => {
        const active = value === level
        return (
          <button
            key={level ?? 'none'}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(level)}
            className={`rounded-full px-1 py-1.5 text-xs font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              active
                ? level === 'must'
                  ? 'bg-ink text-white shadow-sm'
                  : level === null
                    ? 'bg-white text-ink shadow-sm ring-1 ring-line'
                    : 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-200'
                : 'text-ink-faint hover:text-ink'
            }`}
          >
            {level ? LEVEL_LABELS[level] : NO_PREFERENCE}
          </button>
        )
      })}
    </div>
  )
}
