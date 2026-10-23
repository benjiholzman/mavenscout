import { Check } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useOrganizations } from '../../hooks/useOrganizations'
import {
  normalizeOrgName,
  ORG_TYPE_LABELS,
  orgAcronym,
  orgLogoUrl,
  resolveOrganization,
  searchOrganizations,
} from '../../lib/organizations'
import { OrgLogo } from './OrgLogo'

// Organization autocomplete (profiles-membership §8): suggests organizations
// from the canonical list by name or alias, and falls back to free text for
// anything not on it. Picking one stores its canonical name and id; typing
// clears the id. A typed name that matches the list by alias or as a country
// office ("UNICEF Ethiopia") still gets that organization's logo at read time,
// and the line under the field says so.

export function OrgPicker({
  label,
  value,
  orgId,
  onChange,
  placeholder = 'Start typing, e.g. World Bank, GIZ, UNICEF',
  optional = false,
  compact = false,
  className = '',
}: {
  /** Visible label; with `compact`, used as the accessible name only. */
  label: string
  value: string
  orgId: string | null | undefined
  /** `orgId` is set only when an organization is picked from the list. */
  onChange: (name: string, orgId: string | null) => void
  placeholder?: string
  optional?: boolean
  /** Small inline variant (requirement rows): no visible label, text-xs. */
  compact?: boolean
  className?: string
}) {
  const index = useOrganizations()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const suggestions = useMemo(() => searchOrganizations(index, value, 8), [index, value])
  const exactPick = suggestions.some((o) => normalizeOrgName(o.name) === normalizeOrgName(value))
  const showFreeText = value.trim().length > 0 && !exactPick
  const optionCount = suggestions.length + (showFreeText ? 1 : 0)
  const resolved = resolveOrganization(index, value, orgId)

  const pick = (i: number) => {
    if (i < suggestions.length) onChange(suggestions[i]!.name, suggestions[i]!.id)
    else onChange(value.trim(), null)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || optionCount === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % optionCount)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + optionCount) % optionCount)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(active)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className={`block ${compact ? 'text-xs' : 'text-sm'} ${className}`}>
      <label htmlFor={`${listId}-input`} className={compact ? 'sr-only' : 'font-medium'}>
        {label}
        {optional && <span className="font-normal text-ink-faint"> (optional)</span>}
      </label>
      <div className={`relative ${compact ? '' : 'mt-1'}`}>
        <input
          id={`${listId}-input`}
          role="combobox"
          aria-expanded={open && optionCount > 0}
          aria-controls={`${listId}-list`}
          aria-activedescendant={open && optionCount > 0 ? `${listId}-opt-${active}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value, null)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className={`w-full rounded-lg border border-line outline-none focus:border-brand-400 ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}
        />
        {open && optionCount > 0 && (
          <ul
            id={`${listId}-list`}
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-card"
          >
            {suggestions.map((org, i) => (
              <li
                key={org.id}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: fires before the input's blur closes the list
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(i)
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 ${i === active ? 'bg-brand-50' : ''}`}
              >
                <OrgLogo
                  url={orgLogoUrl(org)}
                  name={org.name}
                  acronym={orgAcronym(org)}
                  className="h-6 w-6 rounded-md"
                  monogramClassName="text-[10px] font-bold"
                />
                <span className="min-w-0 flex-1 truncate">{org.name}</span>
                <span className="shrink-0 text-xs text-ink-faint">{ORG_TYPE_LABELS[org.type]}</span>
              </li>
            ))}
            {showFreeText && (
              <li
                id={`${listId}-opt-${suggestions.length}`}
                role="option"
                aria-selected={active === suggestions.length}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(suggestions.length)
                }}
                onMouseEnter={() => setActive(suggestions.length)}
                className={`cursor-pointer border-t border-line-soft px-3 py-2 text-ink-soft ${active === suggestions.length ? 'bg-brand-50' : ''}`}
              >
                Use “{value.trim()}” as typed
              </li>
            )}
          </ul>
        )}
      </div>
      {value.trim() && (
        <p className={`mt-1 flex items-center gap-1.5 text-ink-faint ${compact ? 'text-[11px]' : 'text-xs'}`}>
          {resolved && (orgId || normalizeOrgName(resolved.name) === normalizeOrgName(value)) ? (
            <>
              <Check size={12} className="text-brand-600" /> On the organizations list · {ORG_TYPE_LABELS[resolved.type]}
            </>
          ) : resolved ? (
            <>Matched to {resolved.name}: shown with its logo</>
          ) : (
            <>Not on the organizations list: shown with initials</>
          )}
        </p>
      )}
    </div>
  )
}
