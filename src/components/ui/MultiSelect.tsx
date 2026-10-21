import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef } from 'react'

export interface OptionGroup {
  /** Group/category label; selectable itself when `selectableGroup`. */
  label: string
  items: string[]
}

/** Filter-bar multi-select. Flat (options) or grouped/hierarchical (groups —
 *  used for the two-tier taxonomies, where selecting the group means "broad").
 *  The panel is absolute on desktop and a fixed bottom sheet at phone width. */
export function MultiSelect({
  label,
  options,
  groups,
  selectableGroup = false,
  formatValue = (v) => v,
  counts,
  selected,
  onChange,
  disabled = false,
  disabledNote,
  open,
  onToggle,
}: {
  label: string
  options?: string[]
  groups?: OptionGroup[]
  selectableGroup?: boolean
  /** Display label for a value (e.g. strip the country from "Lagos, Nigeria"). */
  formatValue?: (value: string) => string
  /** Optional per-value result counts, shown right-aligned on each row. */
  counts?: Map<string, number>
  selected: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  disabledNote?: string
  open: boolean
  onToggle: (open: boolean) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, onToggle])

  const toggleValue = (value: string) =>
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    )

  const Row = ({ value, indent = false }: { value: string; indent?: boolean }) => {
    const checked = selected.includes(value)
    return (
      <button
        type="button"
        onClick={() => toggleValue(value)}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-paper ${
          indent ? 'pl-7' : 'font-medium'
        }`}
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
            checked ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-white'
          }`}
        >
          {checked && <Check size={12} strokeWidth={3} />}
        </span>
        <span className="min-w-0 truncate">{formatValue(value)}</span>
        {counts && (
          <span className="ml-auto shrink-0 pl-2 text-xs font-normal tabular-nums text-ink-faint">
            {counts.get(value) ?? 0}
          </span>
        )}
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        title={disabled ? disabledNote : undefined}
        onClick={() => onToggle(!open)}
        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
          disabled
            ? 'cursor-not-allowed border-line text-ink-faint/60'
            : selected.length > 0
              ? 'border-brand-500 bg-brand-50 text-brand-700'
              : 'border-line bg-white text-ink-soft hover:border-ink-faint'
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="rounded-full bg-brand-500 px-1.5 text-xs font-semibold text-white">
            {selected.length}
          </span>
        )}
        <ChevronDown size={14} className={open ? 'rotate-180 transition' : 'transition'} />
      </button>

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-line bg-white p-2 shadow-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:max-h-96 sm:w-72 sm:rounded-xl">
          <div className="mb-1 flex items-center justify-between px-2 pt-1 sm:hidden">
            <span className="text-sm font-semibold">{label}</span>
            <button className="text-sm text-brand-600" onClick={() => onToggle(false)}>
              Done
            </button>
          </div>
          {options?.map((opt) => <Row key={opt} value={opt} />)}
          {groups?.map((g) => (
            <div key={g.label} className="mb-1">
              {selectableGroup ? (
                <Row value={g.label} />
              ) : (
                <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {g.label}
                </p>
              )}
              {g.items.map((item) => (
                <Row key={item} value={item} indent />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
