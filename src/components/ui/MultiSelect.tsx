import { Check, ChevronRight, Info } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { treeValues, type TreeNode } from '../../lib/tree'
import { CountBadge, FilterChip } from './FilterChip'

export type { TreeNode } from '../../lib/tree'

export interface OptionGroup {
  /** Group/category label; selectable itself when `selectableGroup`. */
  label: string
  items: string[]
}

/** A tree node as shown: its key (label path), visible children, and whether
 *  the search matched something below it (which expands it). */
interface Shown {
  node: TreeNode
  key: string
  children: Shown[]
  matchBelow: boolean
}

const KEY_SEP = '›'

/** Filter-bar multi-select. Flat (options), or multi-level (groups — two
 *  levels — or tree, any depth). In a multi-level list parents collapse and
 *  expand; the search box expands whatever holds a match. Selecting a parent
 *  includes everything under it (shown ticked and locked).
 *  The panel is absolute on desktop and a fixed bottom sheet at phone width. */
export function MultiSelect({
  label,
  options,
  groups,
  selectableGroup = false,
  tree,
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
  inline = false,
}: {
  label: string
  options?: string[]
  groups?: OptionGroup[]
  selectableGroup?: boolean
  /** Nested options of any depth (locations: continent → region → country → city). */
  tree?: TreeNode[]
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
  /** A search box over the options. Multi-level lists always have one. */
  searchable?: boolean
  /** Extra words a value is found by (e.g. aliases), besides its label. */
  searchTerms?: (value: string) => string[]
  open: boolean
  onToggle: (open: boolean) => void
  /** Filter-bar chips: an × clears the selection without opening the panel,
   *  and a single selection shows its own name instead of the label. */
  onClear?: () => void
  /** The ranking drawer's editors: no chip, the panel always shown in place
   *  (pass open). */
  inline?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])
  const q = query.trim().toLowerCase()
  const hit = (text: string, value?: string) =>
    [text, ...(value ? (searchTerms?.(value) ?? []) : [])].some((t) => t.toLowerCase().includes(q))

  const nodes = useMemo<TreeNode[] | null>(
    () =>
      tree ??
      groups?.map((g) => ({
        label: g.label,
        value: selectableGroup ? g.label : undefined,
        children: g.items.map((v) => ({ label: formatValue(v), value: v })),
      })) ??
      null,
    // formatValue is a plain mapping; a new function each render needn't rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tree, groups, selectableGroup],
  )
  const withSearch = searchable || !!nodes

  /** Visible nodes: everything without a query; with one, a node that
   *  matches, holds a match, or sits under a matching parent. */
  const shown = useMemo(() => {
    if (!nodes) return null
    const walk = (list: TreeNode[], path: string, underHit: boolean): Shown[] =>
      list.flatMap((node) => {
        const key = path ? `${path}${KEY_SEP}${node.label}` : node.label
        const self = !!q && hit(node.label, node.value)
        const children = walk(node.children ?? [], key, underHit || self)
        const matchBelow = children.some((c) => c.matchBelow || (!!q && hit(c.node.label, c.node.value)))
        return !q || self || underHit || children.length > 0 ? [{ node, key, children, matchBelow }] : []
      })
    return walk(nodes, '', false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, q])

  // Expanded parents. Opening the panel expands the way to each selection;
  // typing a query expands every parent holding a match (and collapses the
  // rest), clearing it collapses everything. Toggling still works either way.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!open || !nodes) return
    const keys = new Set<string>()
    const walk = (list: TreeNode[], path: string[]): void =>
      list.forEach((n) => {
        const here = [...path, n.label]
        if (n.value && selected.includes(n.value)) path.forEach((_, i) => keys.add(path.slice(0, i + 1).join(KEY_SEP)))
        walk(n.children ?? [], here)
      })
    walk(nodes, [])
    setExpanded(keys)
    // Only on opening: selecting shouldn't fold or unfold anything.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nodes])
  const firstQuery = useRef(true)
  useEffect(() => {
    if (firstQuery.current) {
      firstQuery.current = false
      return
    }
    if (!shown) return
    const keys = new Set<string>()
    const walk = (list: Shown[]): void =>
      list.forEach((s) => {
        if (q && s.matchBelow) keys.add(s.key)
        walk(s.children)
      })
    walk(shown)
    setExpanded(keys)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])
  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const shownOptions = options?.filter((v) => !q || hit(formatValue(v), v))

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

  /** Selecting a parent drops its descendants: the parent already includes them. */
  const toggleValue = (value: string, node?: TreeNode) => {
    if (selected.includes(value)) return onChange(selected.filter((v) => v !== value))
    const below = new Set(treeValues(node?.children ?? []))
    onChange([...selected.filter((v) => !below.has(v)), value])
  }

  const Checkbox = ({ checked, implied = false }: { checked: boolean; implied?: boolean }) => (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
        implied
          ? 'border-brand-200 bg-brand-200 text-white'
          : checked
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-line bg-white'
      }`}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </span>
  )

  const Trailing = ({ value, off, includedIn }: { value?: string; off: boolean; includedIn: string | null }) =>
    off ? (
      <span className="ml-auto shrink-0 pl-2 text-[11px] font-normal italic text-ink-faint">{disabledLabel}</span>
    ) : includedIn ? (
      <span className="ml-auto shrink-0 pl-2 text-[11px] font-normal italic text-ink-faint">included</span>
    ) : counts && value ? (
      <span className="ml-auto shrink-0 pl-2 text-xs font-normal tabular-nums text-ink-faint">{counts.get(value) ?? 0}</span>
    ) : null

  const optionRow = (value: string) => {
    const checked = selected.includes(value)
    const off = disabledValues?.includes(value) ?? false
    return (
      <button
        key={value}
        type="button"
        disabled={off}
        onClick={() => toggleValue(value)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium hover:bg-paper disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-transparent"
      >
        <Checkbox checked={checked} />
        <span className="min-w-0 truncate">{formatValue(value)}</span>
        <Trailing value={value} off={off} includedIn={null} />
      </button>
    )
  }

  const selectedBelow = (node: TreeNode) => {
    const below = treeValues(node.children ?? [])
    return selected.filter((v) => below.includes(v)).length
  }

  /** One tree level. `includedIn` is the selected ancestor's label, if any. */
  const treeRows = (list: Shown[], depth: number, includedIn: string | null): ReactNode =>
    list.map(({ node, key, children }) => {
      const isParent = children.length > 0
      const isOpen = expanded.has(key)
      const checked = !!node.value && selected.includes(node.value)
      const off = !!node.value && (disabledValues?.includes(node.value) ?? false)
      const inside = node.value && checked ? node.label : includedIn
      const pad = { paddingLeft: `${depth * 16 + 4}px` }
      const chevron = isParent ? (
        <ChevronRight size={14} className={`shrink-0 text-ink-faint transition ${isOpen ? 'rotate-90' : ''}`} aria-hidden />
      ) : (
        <span className="w-3.5 shrink-0" aria-hidden />
      )
      const below = isParent && !isOpen && !checked ? selectedBelow(node) : 0
      return (
        <div key={key}>
          {node.value ? (
            <div className="flex items-center rounded-lg hover:bg-paper" style={pad}>
              {isParent ? (
                <button
                  type="button"
                  onClick={() => toggleExpanded(key)}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.label}`}
                  className="-my-1 flex h-9 w-7 shrink-0 items-center justify-center rounded-md hover:bg-line/50"
                >
                  {chevron}
                </button>
              ) : (
                <span className="w-7 shrink-0" aria-hidden />
              )}
              <button
                type="button"
                disabled={off || !!includedIn}
                title={includedIn ? `Included in ${includedIn}` : undefined}
                onClick={() => toggleValue(node.value!, node)}
                className={`flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-left text-sm disabled:cursor-not-allowed disabled:text-ink-faint ${
                  isParent ? 'font-medium' : ''
                }`}
              >
                <Checkbox checked={checked || !!includedIn} implied={!!includedIn} />
                <span className="min-w-0 truncate">{node.label}</span>
                {below > 0 && <span className="shrink-0 text-[11px] font-medium text-brand-600">{below} selected</span>}
                <Trailing value={node.value} off={off} includedIn={includedIn} />
              </button>
            </div>
          ) : (
            // A header (not selectable): the whole row folds it.
            <button
              type="button"
              onClick={() => toggleExpanded(key)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-1.5 rounded-lg py-2 pr-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint hover:bg-paper hover:text-ink-soft"
              style={{ paddingLeft: `${depth * 16 + 11}px` }}
            >
              {chevron}
              <span className="min-w-0 truncate">{node.label}</span>
              {below > 0 && (
                <span className="ml-auto shrink-0 text-[11px] font-medium normal-case tracking-normal text-brand-600">
                  {below} selected
                </span>
              )}
            </button>
          )}
          {isParent && isOpen && treeRows(children, depth + 1, inside)}
        </div>
      )
    })

  const nothingShown = q && (shownOptions ?? shown ?? []).length === 0

  return (
    <div ref={ref} className="relative">
      {!inline && (
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
      )}

      {open && (
        <div
          className={inline ? 'rounded-xl border border-line bg-white p-2' : `fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-line bg-white p-2 shadow-xl sm:absolute sm:inset-x-auto sm:bottom-auto ${alignRight ? 'sm:right-0' : 'sm:left-0'} sm:top-full sm:mt-2 sm:max-h-96 sm:w-72 sm:rounded-xl`}
        >
          <div className={`mb-1 flex items-center justify-between px-2 pt-1 sm:hidden ${inline ? 'hidden' : ''}`}>
            <span className="text-sm font-semibold">{label}</span>
            <button className="text-sm text-brand-600" onClick={() => onToggle(false)}>
              Done
            </button>
          </div>
          {(header || withSearch) && (
            // Pinned while the options scroll (the panel has p-2, hence -top-2).
            <div className="sticky -top-2 z-10 -mx-2 mb-1 space-y-2 border-b border-line bg-white px-4 pb-2 pt-2">
              {withSearch && (
                <input
                  type="search"
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
          {shownOptions?.map(optionRow)}
          {shown && treeRows(shown, 0, null)}
          {nothingShown && <p className="px-2 py-2 text-sm text-ink-faint">No matches for “{query.trim()}”.</p>}
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
