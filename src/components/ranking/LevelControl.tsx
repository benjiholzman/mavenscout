import type { Level } from '../../lib/matching/types'

// Importance control for a requirement row (match rework spec §3): three
// levels, labelled for managers. There's no "no preference" — removing the
// row means that.

export const LEVEL_LABELS: Record<Level, string> = {
  slight: 'Nice to have',
  strong: 'Important',
  must: 'Required',
}

const LEVELS: Level[] = ['slight', 'strong', 'must']

export function LevelControl({
  value,
  onChange,
  rowLabel,
}: {
  value: Level
  onChange: (level: Level) => void
  rowLabel: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={`${rowLabel}: importance`}
      className="grid grid-cols-3 gap-0.5 rounded-full border border-line bg-paper p-0.5"
    >
      {LEVELS.map((level) => {
        const active = value === level
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(level)}
            className={`whitespace-nowrap rounded-full px-1 py-1.5 text-xs font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              active
                ? level === 'must'
                  ? 'bg-ink text-white shadow-sm'
                  : 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-200'
                : 'text-ink-faint hover:text-ink'
            }`}
          >
            {LEVEL_LABELS[level]}
          </button>
        )
      })}
    </div>
  )
}
