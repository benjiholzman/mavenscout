import type { Level } from '../../lib/matching/types'
import { LEVEL_LABELS } from '../../lib/requirements/labels'

// How much a pick matters, always low → high: Nice to have | Important |
// ┃ ⏷ Must have. Must have sits apart, behind a divider with a funnel,
// because it's a filter rather than a weight. New picks start at Important;
// nothing ever defaults to Must have. Segments grow to fill the row but never
// shrink below their label: the control wraps instead.

const LEVELS: Level[] = ['slight', 'strong', 'must']

const SELECTED: Record<Level, string> = {
  slight: 'border-brand-200 bg-brand-50 font-semibold text-brand-700',
  strong: 'border-brand-100 bg-brand-100 font-semibold text-brand-700',
  must: 'border-ink bg-ink font-semibold text-white',
}

export function FunnelIcon({ size = 11, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <path d="M4 5h16l-6 7.5V19l-4 1.5v-8z" />
    </svg>
  )
}

export function StrengthControl({
  value,
  onChange,
  label,
}: {
  value: Level
  onChange: (level: Level) => void
  /** What it's the strength of, for screen readers ("French"). */
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={`${label}: how much it matters`}
      className="flex w-full max-w-[340px] flex-wrap items-center gap-0.5 rounded-[9px] border border-line bg-white p-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      {LEVELS.map((level) => {
        const on = value === level
        return (
          <span key={level} className="contents">
            {level === 'must' && <span aria-hidden className="mx-[3px] h-[18px] w-px shrink-0 bg-[#D5CFC4]" />}
            <button
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(level)}
              className={`flex h-7 flex-auto shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-[7px] border px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                on ? SELECTED[level] : 'border-transparent font-medium text-ink-soft hover:bg-[#F6F3EE]'
              }`}
            >
              {level === 'must' && <FunnelIcon />}
              {LEVEL_LABELS[level]}
            </button>
          </span>
        )
      })}
    </div>
  )
}

/** Small two- or three-way toggle inside a picked row: a language's minimum
 *  level, an employer's Now / Before / Either, the engagement type. */
export function MiniToggle<T extends string>({
  value,
  options,
  onChange,
  label,
  className = '',
  tall = false,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
  className?: string
  /** 36px instead of 28px (the Availability tab's engagement). */
  tall?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex gap-0.5 rounded-lg bg-paper p-0.5 ring-1 ring-line ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`flex-1 whitespace-nowrap rounded-md px-2.5 text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              tall ? 'h-9' : 'h-7'
            } ${on ? 'bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]' : 'font-medium text-ink-soft hover:text-ink'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
