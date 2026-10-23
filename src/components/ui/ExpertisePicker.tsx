import { Plus } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { searchExpertise, type ExpertiseIndex } from '../../lib/expertise'

// Picks one item from the unified expertise list (profiles-membership §6).
// Search covers names, aliases ('M&E', 'PFM') and old names; with no query the
// whole list shows under its browsing-group subheadings. Used by the profile
// editor's tier sections and the ranking drawer's Expertise editor.

export function ExpertisePicker({
  index,
  onPick,
  exclude = [],
  disabled = false,
  placeholder = 'Search, e.g. Nutrition, M&E, PFM',
  label = 'Add expertise',
  autoFocus = false,
  inline = false,
}: {
  index: ExpertiseIndex
  onPick: (name: string) => void
  /** Items already chosen; not offered. */
  exclude?: string[]
  disabled?: boolean
  placeholder?: string
  /** Accessible name of the search box. */
  label?: string
  autoFocus?: boolean
  /** The ranking drawer's Expertise editor: the list stays open below the
   *  box (grouped browse until something is typed). */
  inline?: boolean
}) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [openState, setOpen] = useState(autoFocus)
  const open = inline || openState
  const [active, setActive] = useState(0)

  const matches = useMemo(() => searchExpertise(index, query, exclude), [index, query, exclude])
  // Group subheadings when browsing; a flat best-first list when searching.
  const browsing = query.trim() === ''
  const pick = (name: string) => {
    onPick(name)
    setQuery('')
    setActive(0)
  }

  return (
    <div className="relative">
      <Plus size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input
        role="combobox"
        aria-label={label}
        aria-expanded={open && matches.length > 0}
        aria-controls={`${listId}-list`}
        aria-activedescendant={open && matches.length > 0 ? `${listId}-opt-${active}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        autoFocus={autoFocus}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && matches.length) {
            e.preventDefault()
            setOpen(true)
            setActive((a) => (a + 1) % matches.length)
          } else if (e.key === 'ArrowUp' && matches.length) {
            e.preventDefault()
            setActive((a) => (a - 1 + matches.length) % matches.length)
          } else if (e.key === 'Enter') {
            e.preventDefault()
            if (open && matches[active]) pick(matches[active]!.name)
          } else if (e.key === 'Escape') {
            e.stopPropagation() // inside the ranking drawer, Esc closes this list, not the drawer
            setOpen(false)
          }
        }}
        className="w-full rounded-lg border border-line py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-400 disabled:cursor-not-allowed disabled:bg-paper"
      />
      {open && matches.length > 0 && (
        <ul
          id={`${listId}-list`}
          role="listbox"
          className={`${inline ? 'max-h-80' : 'absolute left-0 right-0 top-full z-30 max-h-72 shadow-card'} mt-1 overflow-y-auto rounded-lg border border-line bg-white py-1`}
        >
          {matches.map((item, i) => {
            const heading = browsing && (i === 0 || matches[i - 1]!.group !== item.group)
            return (
              <li key={item.name} role="presentation">
                {heading && (
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    {item.group}
                  </p>
                )}
                <div
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // mousedown, not click: fires before the input's blur closes the list
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(item.name)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-baseline justify-between gap-2 px-3 py-1.5 text-sm ${i === active ? 'bg-brand-50' : ''}`}
                >
                  <span className="min-w-0">{item.name}</span>
                  {!browsing && <span className="shrink-0 text-[11px] text-ink-faint">{item.group}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {open && query.trim() && matches.length === 0 && (
        <p className="mt-1 text-xs text-ink-faint">Nothing on the list matches “{query.trim()}”.</p>
      )}
    </div>
  )
}
