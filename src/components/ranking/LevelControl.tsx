import type { Level } from '../../lib/matching/types'

// Four-level importance control for a requirement row (match rework spec §3):
// No preference / Slight / Strong / Must-have. Full width under the row label,
// at every screen size.

const LEVELS: { value: Level; label: string }[] = [
  { value: 'none', label: 'No preference' },
  { value: 'slight', label: 'Slight' },
  { value: 'strong', label: 'Strong' },
  { value: 'must', label: 'Must-have' },
]

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
      className="grid grid-cols-4 gap-0.5 rounded-full border border-line bg-paper p-0.5"
    >
      {LEVELS.map((l) => {
        const active = value === l.value
        return (
          <button
            key={l.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(l.value)}
            className={`rounded-full px-1 py-1.5 text-[11.5px] font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              active
                ? l.value === 'must'
                  ? 'bg-ink text-white shadow-sm'
                  : l.value === 'none'
                    ? 'bg-white text-ink-soft shadow-sm'
                    : 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-200'
                : 'text-ink-faint hover:text-ink'
            }`}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}
