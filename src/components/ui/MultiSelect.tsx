import { Check, Info } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { CountBadge, FilterChip } from './FilterChip'

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
  disabledValues,
  disabledLabel,
  selected,
  onChange,
  disabled = false,
  disabledNote,
  note,
  header,
  searchable = false,
  searchTerms,
  open,
  onToggle,
  onClear,
}: {
  label: string
  options?: string[]
  groups?: OptionGroup[]
  selectableGroup?: boolean
  /** Display label for a value (e.g. strip the country from "Lagos, Nigeria"). */
  formatValue?: (value: string) => string
  /** Optional per-value result counts, shown right-aligned on each row. */
  counts?: Map<string, number>
  /** Values that can't be picked here, labelled with `disabledLabel`
   *  (e.g. "already required" in a preference row). */
  disabledValues?: string[]
  disabledLabel?: string
  selected: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  disabledNote?: string
  /** Short explanatory line shown at the bottom of the open panel. */
  note?: string
  /** Extra control pinned above the options (e.g. a language's minimum level). */
  header?: ReactNode
  /** A search box over the options (long lists such as expertise). */
  searchable?: boolean
  /** Extra words a value is found by (e.g. aliases), besides its label. */
  searchTerms?: (value: string) => string[]
  open: boolean
  onToggle: (open: boolean) => void
  /** Filter-bar chips: an × clears the selection without opening the panel,
   *  and a single selection shows its own name instead of the label. */
  onClear?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])
  const q = query.trim().toLowerCase()
  const shown = (value: string) =>
    !q || [formatValue(value), ...(searchTerms?.(value) ?? [])].some((t) => t.toLowerCase().includes(q))
  const shownOptions = options?.filter(shown)
  const shownGroups = groups
    ?.map((g) => ({ ...g, items: g.items.filter(shown), labelShown: selectableGroup && shown(g.label) }))
    .filter((g) => g.items.length > 0 || g.labelShown)
  // The desktop panel opens to the right of its button, or to the left when
  // that would run past the window edge (buttons near the end of a row).
  const [alignRight, setAlignRight] = useState(false)
  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const PANEL_WIDTH = 288 // sm:w-72
    setAlignRight(ref.current.getBoundingClientRect().left + PANEL_WIDTH > window.innerWidth - 8)
  }, [open])

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
    const off = disabledValues?.includes(value) ?? false
    return (
      <button
        type="button"
        disabled={off}
        onClick={() => toggleValue(value)}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-paper disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-transparent ${
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
        {off ? (
          <span className="ml-auto shrink-0 pl-2 text-[11px] font-normal italic text-ink-faint">{disabledLabel}</span>
        ) : (
          counts && (
            <span className="ml-auto shrink-0 pl-2 text-xs font-normal tabular-nums text-ink-faint">
              {counts.get(value) ?? 0}
            </span>
          )
        )}
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <FilterChip
        active={selected.length > 0}
        open={open}
        onClick={() => onToggle(!open)}
        onClear={onClear}
        clearLabel={`Clear ${label}`}
        disabled={disabled}
        title={disabled ? disabledNote : undefined}
      >
        {onClear && selected.length === 1 ? (
          <span className="max-w-[12rem] truncate sm:max-w-[16rem]" title={formatValue(selected[0])}>
            {formatValue(selected[0])}
          </span>
        ) : (
          <>
            {label}
            {selected.length > 0 && <CountBadge n={selected.length} />}
          </>
        )}
      </FilterChip>

      {open && (
        <div
          className={`fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-line bg-white p-2 shadow-xl sm:absolute sm:inset-x-auto sm:bottom-auto ${alignRight ? 'sm:right-0' : 'sm:left-0'} sm:top-full sm:mt-2 sm:max-h-96 sm:w-72 sm:rounded-xl`}
        >
          <div className="mb-1 flex items-center justify-between px-2 pt-1 sm:hidden">
            <span className="text-sm font-semibold">{label}</span>
            <button className="text-sm text-brand-600" onClick={() => onToggle(false)}>
              Done
            </button>
          </div>
          {(header || searchable) && (
            // Pinned while the options scroll (the panel has p-2, hence -top-2).
            <div className="sticky -top-2 z-10 -mx-2 mb-1 space-y-2 border-b border-line bg-white px-4 pb-2 pt-2">
              {searchable && (
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}`}
                  aria-label={`Search ${label.toLowerCase()}`}
                  className="w-full rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-brand-400"
                />
              )}
              {header}
            </div>
          )}
          {shownOptions?.map((opt) => <Row key={opt} value={opt} />)}
          {q && (shownOptions ?? shownGroups ?? []).length === 0 && (
            <p className="px-2 py-2 text-sm text-ink-faint">No matches for “{query.trim()}”.</p>
          )}
          {shownGroups?.map((g) => (
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
          {note && (
            <p className="mt-1 flex gap-1.5 border-t border-line px-2 pb-1 pt-2 text-xs leading-snug text-ink-faint">
              <Info size={13} className="mt-px shrink-0" aria-hidden />
              {note}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
