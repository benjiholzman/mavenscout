import { ChevronDown, X } from 'lucide-react'
import type { ReactNode } from 'react'

/** The filter bar's chip: the button that opens a filter's dropdown, with an
 *  × beside the label while the filter is active that clears it without
 *  opening anything. Shared by the multi-selects, Availability and Sort. */
export function FilterChip({
  children,
  icon,
  active,
  open,
  onClick,
  onClear,
  clearLabel,
  disabled = false,
  title,
  ariaLabel,
}: {
  children: ReactNode
  icon?: ReactNode
  active: boolean
  /** Shows the chevron, turned while open; omit for chips that open a modal. */
  open?: boolean
  onClick: () => void
  /** Shown as an × while active. */
  onClear?: () => void
  clearLabel?: string
  disabled?: boolean
  title?: string
  ariaLabel?: string
}) {
  const showClear = active && !!onClear && !disabled
  return (
    <div
      className={`flex max-w-full items-center rounded-full border text-sm font-medium transition ${
        disabled
          ? 'cursor-not-allowed border-line text-ink-faint/60'
          : active
            ? 'border-brand-500 bg-brand-50 text-brand-700'
            : 'border-line bg-white text-ink-soft hover:border-ink-faint'
      }`}
    >
      <button
        type="button"
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={onClick}
        className={`flex min-w-0 items-center gap-1.5 py-1.5 pl-3.5 disabled:cursor-not-allowed ${showClear ? 'pr-1' : 'pr-3.5'}`}
      >
        {icon}
        {children}
        {open !== undefined && !showClear && (
          <ChevronDown size={14} className={`shrink-0 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
        )}
      </button>
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          title={clearLabel}
          className="mr-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-brand-600 hover:bg-brand-100 hover:text-brand-800"
        >
          <X size={13} strokeWidth={2.5} aria-hidden />
        </button>
      )}
    </div>
  )
}

/** The count of selected values in a small circle. */
export function CountBadge({ n }: { n: number }) {
  return (
    <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-semibold tabular-nums text-white">
      {n}
    </span>
  )
}
