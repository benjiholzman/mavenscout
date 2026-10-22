// Small two-or-three-way segmented control (radio group), styled like the
// requirement rows' LevelControl: language proficiency and its minimum.

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled = false,
  className = '',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  /** Accessible name of the group. */
  label: string
  disabled?: boolean
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={`inline-grid gap-0.5 rounded-full border border-line bg-paper p-0.5 ${disabled ? 'opacity-50' : ''} ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed ${
              active ? 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-200' : 'text-ink-faint hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
