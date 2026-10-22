import { Plus, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useLanguages } from '../../hooks/useLanguages'
import { LANGUAGE_MAX } from '../../lib/config'
import { PROFICIENCY_LABELS } from '../../lib/languages'
import type { Proficiency, SpokenLanguage } from '../../types/db'
import { Segmented } from '../ui/Segmented'

// Languages spoken (profiles-membership §13 step 1, §7.1): picked from the
// canonical list, each at Fluent or Working, up to LANGUAGE_MAX. Missing a
// language? Admins add it to the list.

const LEVELS = (['fluent', 'working'] as const).map((v) => ({ value: v, label: PROFICIENCY_LABELS[v] }))

export function LanguagesEditor({
  value,
  onChange,
}: {
  value: SpokenLanguage[]
  onChange: (next: SpokenLanguage[]) => void
}) {
  const all = useLanguages()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const chosen = new Set(value.map((l) => l.name))
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const left = all.filter((n) => !chosen.has(n))
    return [
      ...left.filter((n) => n.toLowerCase().startsWith(q)),
      ...left.filter((n) => !n.toLowerCase().startsWith(q) && n.toLowerCase().includes(q)),
    ].slice(0, 8)
  }, [all, query, value])
  const full = value.length >= LANGUAGE_MAX

  const add = (name: string) => {
    if (!name || chosen.has(name) || full) return
    onChange([...value, { name, proficiency: 'fluent' }])
    setQuery('')
    setActive(0)
  }
  const setLevel = (name: string, proficiency: Proficiency) =>
    onChange(value.map((l) => (l.name === name ? { ...l, proficiency } : l)))

  return (
    <div className="text-sm">
      <p className="flex items-baseline justify-between font-medium">
        Languages
        <span className="text-xs font-normal text-ink-faint">
          {value.length}/{LANGUAGE_MAX}
        </span>
      </p>
      {value.length > 0 && (
        <ul className="mt-1.5 divide-y divide-line-soft rounded-lg border border-line">
          {value.map((l) => (
            <li key={l.name} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate">{l.name}</span>
              <Segmented
                label={`${l.name}: proficiency`}
                value={l.proficiency}
                options={LEVELS}
                onChange={(p) => setLevel(l.name, p)}
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.name !== l.name))}
                aria-label={`Remove ${l.name}`}
                className="p-1 text-ink-faint hover:text-ink"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative mt-2">
        <Plus size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          role="combobox"
          aria-label="Add a language"
          aria-expanded={open && matches.length > 0}
          aria-controls={`${listId}-list`}
          aria-activedescendant={open && matches.length > 0 ? `${listId}-opt-${active}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={full}
          value={query}
          placeholder={full ? `Up to ${LANGUAGE_MAX} languages` : 'Add a language'}
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
              setActive((a) => (a + 1) % matches.length)
            } else if (e.key === 'ArrowUp' && matches.length) {
              e.preventDefault()
              setActive((a) => (a - 1 + matches.length) % matches.length)
            } else if (e.key === 'Enter') {
              e.preventDefault()
              if (matches[active]) add(matches[active])
            } else if (e.key === 'Escape') setOpen(false)
          }}
          className="w-full rounded-lg border border-line py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-400 disabled:bg-paper"
        />
        {open && matches.length > 0 && (
          <ul
            id={`${listId}-list`}
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-card"
          >
            {matches.map((name, i) => (
              <li
                key={name}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault()
                  add(name)
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-3 py-2 ${i === active ? 'bg-brand-50' : ''}`}
              >
                {name}
              </li>
            ))}
          </ul>
        )}
        {open && query.trim() && matches.length === 0 && all.length > 0 && (
          <p className="mt-1 text-xs text-ink-faint">Not on the language list. Ask an admin to add it.</p>
        )}
      </div>
    </div>
  )
}
