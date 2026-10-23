import { ArrowUpDown, Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SortMode } from '../../lib/sort'
import { FilterChip } from '../ui/FilterChip'

const LABELS: Record<SortMode, string> = {
  recommended: 'Recommended',
  available_soonest: 'Available soonest',
  newly_added: 'Newly added',
  recently_updated: 'Recently updated',
}

const MODES: SortMode[] = ['recommended', 'available_soonest', 'newly_added', 'recently_updated']

/** Sort control, styled like the filter-bar dropdowns: a chip that opens a
 *  panel below it on desktop and a bottom sheet at phone width. */
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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ranked) setOpen(false)
  }, [ranked])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <FilterChip
        active={false}
        open={ranked ? undefined : open}
        onClick={() => setOpen(!open)}
        disabled={ranked}
        title={ranked ? 'Ranked results are always in rank order' : undefined}
        ariaLabel={`Sort by: ${ranked ? 'Ranked by match' : LABELS[value]}`}
        icon={<ArrowUpDown size={14} className="shrink-0 text-ink-faint" aria-hidden />}
      >
        <span className="whitespace-nowrap">{ranked ? 'Ranked by match' : LABELS[value]}</span>
      </FilterChip>

      {open && (
        <div
          role="listbox"
          aria-label="Sort by"
          className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border border-line bg-white p-2 shadow-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-56 sm:rounded-xl"
        >
          <div className="mb-1 flex items-center justify-between px-2 pt-1 sm:hidden">
            <span className="text-sm font-semibold">Sort by</span>
            <button className="text-sm text-brand-600" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
          <p className="hidden px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-ink-faint sm:block">
            Sort by
          </p>
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="option"
              aria-selected={m === value}
              onClick={() => {
                onChange(m)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-paper ${
                m === value ? 'font-semibold text-brand-700' : 'font-medium text-ink'
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{LABELS[m]}</span>
              {m === value && <Check size={14} strokeWidth={3} className="shrink-0 text-brand-500" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
