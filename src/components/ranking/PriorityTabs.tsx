import { Check, ChevronRight, Search } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { searchExpertise, type ExpertiseIndex } from '../../lib/expertise'
import { DEFAULT_AVAILABILITY, type AvailabilityFilter } from '../../lib/filters'
import { MAX_EMPLOYER_PRIORITIES, MAX_EXPERTISE_PRIORITIES, MAX_LANGUAGE_PRIORITIES } from '../../lib/matching/config'
import type { Requirement, RequirementKind, RequirementOf, RequirementValueByKind } from '../../lib/matching/types'
import { CAREER_LEVEL_SHORT } from '../../lib/requirements/labels'
import { isMust, makeRow, rowHasValue, rowItems } from '../../lib/requirements/model'
import {
  addEmployer,
  addExpertise,
  addLanguage,
  availabilityRow,
  CAREER_LEVEL_RANGES,
  DEFAULT_LEVEL,
  hasAvailabilityTime,
  ORG_RELATIONS,
  relationOf,
  rowWithItem,
  selectedValues,
  selectOne,
  setLevel,
  toggleMedia,
  updateRow,
  withoutItem,
  type TabKey,
} from '../../lib/requirements/priorities'
import type { TreeNode } from '../../lib/tree'
import { OrgLogo } from '../ui/OrgLogo'
import { MiniToggle, StrengthControl } from './StrengthControl'

// The priorities modal's tab bodies. Each reads the draft rows and writes
// through `apply`, so every edit is normalized like any other requirements
// change. A ticked or selected item expands to a second line holding its
// strength control; unticking collapses it. Counts are how many experts in
// the whole pool meet that item alone.

export interface PickerOptions {
  /** The unified expertise list. */
  expertise: ExpertiseIndex
  /** Continent → sub-region → country → city (lib/locations). */
  locations: TreeNode[]
  languages: string[]
  workArrangements: string[]
}

export interface EmployerOption {
  name: string
  orgId: string | null
  /** "UN agency"; null for an employer not on the organizations list. */
  typeLabel: string | null
  logoUrl: string | null
  acronym: string | null
  /** "other UN agencies"; null when there's no peer group to offer. */
  peerLabel: string | null
}

export interface TabProps {
  reqs: Requirement[]
  apply: (fn: (rows: Requirement[]) => Requirement[]) => void
  options: PickerOptions
  employers: EmployerOption[]
  /** Experts in the whole pool meeting one row on its own. */
  count: (row: Requirement) => number
}

/** "9 experts" for a value of a kind, as a Must have on its own. */
function useCounter(count: TabProps['count']) {
  return useMemo(() => {
    const cache = new Map<string, number>()
    return <K extends RequirementKind>(kind: K, value: RequirementValueByKind[K]): number => {
      const key = `${kind}:${JSON.stringify(value)}`
      if (!cache.has(key)) cache.set(key, count(makeRow(kind, value, { level: 'must' })))
      return cache.get(key)!
    }
  }, [count])
}

// ---- shared pieces -------------------------------------------------------------

export function TabHeader({ title, helper }: { title: string; helper: string }) {
  return (
    <div className="shrink-0 px-4 pb-3.5 pt-4 sm:px-7 sm:pt-5">
      <h3 className="font-display text-[19px] font-semibold leading-tight text-ink">{title}</h3>
      <p className="mt-1 text-[13.5px] leading-snug text-ink-soft">{helper}</p>
    </div>
  )
}

/** The bordered card a tab's picker sits in; its lists scroll inside it. */
function PickerCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col rounded-xl border border-line bg-white sm:min-h-[460px] sm:flex-1 sm:overflow-hidden ${className}`}
    >
      {children}
    </div>
  )
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative shrink-0 border-b border-line p-3">
      <Search size={16} className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-[10px] border border-line pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
    </div>
  )
}

export const expertsLabel = (n: number) => `${n} expert${n === 1 ? '' : 's'}`

function Count({ n }: { n: number }) {
  return <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-[#9AA6AB]">{expertsLabel(n)}</span>
}

function CheckboxMark({ on, disabled = false }: { on: boolean; disabled?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px] ${
        on ? 'border-brand-500 bg-brand-500 text-white' : disabled ? 'border-line bg-white' : 'border-[#B9C3C7] bg-white'
      }`}
    >
      {on && <Check size={11} strokeWidth={3.2} />}
    </span>
  )
}

function RadioMark({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] bg-white ${
        on ? 'border-brand-500' : 'border-[#B9C3C7]'
      }`}
    >
      {on && <span className="h-2 w-2 rounded-full bg-brand-500" />}
    </span>
  )
}

/** A checkbox row that expands to a second line once ticked. */
function CheckRow({
  on,
  disabled = false,
  onToggle,
  label,
  children,
  extra,
  className = '',
}: {
  on: boolean
  disabled?: boolean
  onToggle: () => void
  /** Line one, after the checkbox. */
  label: ReactNode
  /** Line two, shown when ticked. */
  children?: ReactNode
  /** Right side of line one (the count). */
  extra?: ReactNode
  className?: string
}) {
  return (
    <li className={`rounded-lg ${on ? 'bg-[#F7FBFC]' : ''} ${className}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        disabled={disabled}
        onClick={onToggle}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          disabled ? 'cursor-not-allowed text-[#B9C3C7]' : on ? 'text-ink' : 'text-ink hover:bg-[#F6F3EE]'
        }`}
      >
        <CheckboxMark on={on} disabled={disabled} />
        <span className="flex min-w-0 flex-1 items-center gap-2">{label}</span>
        {extra}
      </button>
      {on && children && <div className="flex flex-wrap items-center gap-2 pb-2.5 pl-[34px] pr-2">{children}</div>}
    </li>
  )
}

function LimitNote({ max, noun }: { max: number; noun: string }) {
  return (
    <p className="shrink-0 border-t border-line bg-paper px-3 py-2 text-xs text-ink-soft">
      You've picked {max} {noun}, the most. Untick one to choose another.
    </p>
  )
}

/** "Must haves here count as any of" — shown once two items in one area are
 *  Must have, since that's how the filter reads them. */
function AnyOfNote({ rows, noun }: { rows: Requirement[]; noun: string }) {
  if (rows.filter(isMust).length < 2) return null
  return (
    <p className="shrink-0 border-t border-line bg-paper px-3 py-2 text-xs leading-snug text-ink-soft">
      Must have {noun} count as any of: an expert needs at least one of them.
    </p>
  )
}

// ---- Expertise ------------------------------------------------------------------

export function ExpertiseTab({ reqs, apply, options, count }: TabProps) {
  const index = options.expertise
  const rows = reqs.filter((r): r is RequirementOf<'expertise'> => r.kind === 'expertise' && r.value.name !== '')
  const picked = new Map(rows.map((r) => [r.value.name, r]))
  const atCap = rows.length >= MAX_EXPERTISE_PRIORITIES
  const [query, setQuery] = useState('')
  const firstGroup = rows.length ? index.groups.findIndex((g) => g.items.includes(rows[0].value.name)) : 0
  const [active, setActive] = useState(Math.max(0, firstGroup))
  const counter = useCounter(count)
  const group = index.groups[active]

  const item = (name: string, label: ReactNode = name) => {
    const row = picked.get(name)
    return (
      <CheckRow
        key={name}
        on={!!row}
        disabled={!row && atCap}
        onToggle={() => apply((rs) => (row ? withoutItem(rs, 'expertise', name) : addExpertise(rs, name)))}
        label={<span className="min-w-0">{label}</span>}
        extra={<Count n={counter('expertise', { name })} />}
      >
        {row && <StrengthControl value={row.level} label={name} onChange={(l) => apply((rs) => setLevel(rs, row.id, l))} />}
      </CheckRow>
    )
  }

  const results = query.trim() ? searchExpertise(index, query) : null
  return (
    <PickerCard>
      <SearchField value={query} onChange={setQuery} placeholder={`Search all ${index.groups.length} categories, e.g. Nutrition, M&E`} />
      {results ? (
        <ul className="min-h-0 flex-1 space-y-0.5 p-2 sm:overflow-y-auto">
          {results.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-ink-faint">No matching expertise.</li>
          ) : (
            results.map((r) =>
              item(
                r.name,
                <>
                  {r.name} <span className="text-ink-faint">· {r.group}</span>
                </>,
              ),
            )
          )}
        </ul>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col sm:grid sm:grid-cols-[minmax(96px,170px)_minmax(0,1fr)]">
          {/* Phones: the categories as a scrolling strip above the areas. */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-line bg-paper px-3 py-2 sm:hidden" aria-label="Categories">
            {index.groups.map((g, i) => {
              const n = g.items.filter((name) => picked.has(name)).length
              return (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-current={i === active}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] ${
                    i === active ? 'border-brand-500 bg-white font-semibold text-ink' : 'border-line bg-white text-ink-soft'
                  }`}
                >
                  {g.label}
                  {n > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-semibold text-white">
                      {n}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <ul className="hidden min-h-0 overflow-y-auto border-r border-line bg-paper py-1 sm:block" aria-label="Categories">
            {index.groups.map((g, i) => {
              const n = g.items.filter((name) => picked.has(name)).length
              const on = i === active
              return (
                <li key={g.label}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-current={on}
                    className={`flex w-full items-center gap-1.5 border-l-[3px] py-[9px] pl-[11px] pr-2 text-left text-[13.5px] leading-snug ${
                      on ? 'border-brand-500 bg-white font-semibold text-ink' : 'border-transparent text-ink-soft hover:bg-[#F6F3EE]'
                    }`}
                  >
                    <span className="min-w-0 flex-1">{g.label}</span>
                    {n > 0 && (
                      <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-semibold text-white">
                        {n}
                      </span>
                    )}
                    <ChevronRight size={14} className="shrink-0 text-ink-faint" aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="min-h-0 p-2 sm:overflow-y-auto">
            {group && (
              <>
                <p className="px-2 pb-1.5 pt-2 text-[11.5px] font-semibold uppercase tracking-[.08em] text-ink-faint">{group.label}</p>
                <ul className="space-y-0.5">{group.items.map((name) => item(name))}</ul>
              </>
            )}
          </div>
        </div>
      )}
      {atCap && <LimitNote max={MAX_EXPERTISE_PRIORITIES} noun="areas" />}
    </PickerCard>
  )
}

// ---- Career level / Work arrangement (one choice) ------------------------------

function OptionCard({
  on,
  onSelect,
  title,
  description,
  extra,
  children,
}: {
  on: boolean
  onSelect: () => void
  title: string
  description: string
  extra?: ReactNode
  children?: ReactNode
}) {
  return (
    <li className={`rounded-[10px] border ${on ? 'border-brand-200 bg-[#F7FBFC]' : 'border-transparent'}`}>
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={onSelect}
        className={`flex w-full items-center gap-3 rounded-[10px] p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          on ? '' : 'hover:bg-[#F6F3EE]'
        }`}
      >
        <RadioMark on={on} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">{title}</span>
          <span className="block text-[13px] text-ink-faint">{description}</span>
        </span>
        {extra}
      </button>
      {on && children && <div className="pb-3.5 pl-[46px] pr-3.5">{children}</div>}
    </li>
  )
}

const ARRANGEMENT_DESCRIPTIONS: Record<string, string> = {
  Remote: 'Works from anywhere',
  Hybrid: 'Mix of remote and on-site',
  'On-site': 'Based at your office or project site',
}
const ARRANGEMENT_ORDER = ['Remote', 'Hybrid', 'On-site']

export function ChoiceTab({ kind, reqs, apply, options, count }: TabProps & { kind: 'career_level' | 'work_arrangement' }) {
  const counter = useCounter(count)
  const chosen = selectedValues(reqs, kind)
  const row = reqs.find((r) => r.kind === kind)
  const choices =
    kind === 'career_level'
      ? Object.entries(CAREER_LEVEL_SHORT).map(([value, label]) => ({
          value,
          label,
          description: CAREER_LEVEL_RANGES[value] ?? '',
        }))
      : [...options.workArrangements]
          .sort((a, b) => (ARRANGEMENT_ORDER.indexOf(a) + 1 || 9) - (ARRANGEMENT_ORDER.indexOf(b) + 1 || 9))
          .map((v) => ({ value: v, label: v, description: ARRANGEMENT_DESCRIPTIONS[v] ?? '' }))
  const noun = kind === 'career_level' ? 'Career level' : 'Work arrangement'
  return (
    <ul role="radiogroup" aria-label={noun} className="space-y-1">
      <OptionCard
        on={chosen.length === 0}
        onSelect={() => apply((rs) => selectOne(rs, kind, null))}
        title="No preference"
        description={`${noun} won’t affect the ranking`}
      />
      {choices.map((c) => {
        const on = chosen.includes(c.value)
        return (
          <OptionCard
            key={c.value}
            on={on}
            onSelect={() => !on && apply((rs) => selectOne(rs, kind, c.value))}
            title={c.label}
            description={c.description}
            extra={<Count n={counter(kind, { values: [c.value] })} />}
          >
            {row && (
              <StrengthControl value={row.level} label={c.label} onChange={(l) => apply((rs) => setLevel(rs, row.id, l))} />
            )}
          </OptionCard>
        )
      })}
    </ul>
  )
}

// ---- Languages --------------------------------------------------------------------

export function LanguagesTab({ reqs, apply, options, count }: TabProps) {
  const [query, setQuery] = useState('')
  const counter = useCounter(count)
  const rows = reqs.filter((r): r is RequirementOf<'language'> => r.kind === 'language')
  const atCap = rows.length >= MAX_LANGUAGE_PRIORITIES
  const q = query.trim().toLowerCase()
  const list = options.languages.filter((l) => !q || l.toLowerCase().includes(q))
  return (
    <PickerCard>
      <SearchField value={query} onChange={setQuery} placeholder="Search languages" />
      <ul className="min-h-0 flex-1 space-y-0.5 p-2 sm:overflow-y-auto">
        {list.length === 0 && <li className="px-2 py-6 text-center text-sm text-ink-faint">No matching languages.</li>}
        {list.map((name) => {
          const row = rowWithItem(rows, 'language', name) as RequirementOf<'language'> | undefined
          return (
            <CheckRow
              key={name}
              on={!!row}
              disabled={!row && atCap}
              onToggle={() => apply((rs) => (row ? withoutItem(rs, 'language', name) : addLanguage(rs, name)))}
              label={<span className="min-w-0 truncate">{name}</span>}
              extra={<Count n={counter('language', { values: [name], min: 'working' })} />}
            >
              {row && (
                <>
                  <MiniToggle
                    label={`${name}: minimum level`}
                    value={row.value.min ?? 'working'}
                    options={[
                      { value: 'working', label: 'Working+' },
                      { value: 'fluent', label: 'Fluent' },
                    ]}
                    onChange={(min) => apply((rs) => updateRow(rs, { ...row, value: { ...row.value, min } }))}
                  />
                  <StrengthControl value={row.level} label={name} onChange={(l) => apply((rs) => setLevel(rs, row.id, l))} />
                </>
              )}
            </CheckRow>
          )
        })}
      </ul>
      <AnyOfNote rows={rows} noun="languages" />
      {atCap && <LimitNote max={MAX_LANGUAGE_PRIORITIES} noun="languages" />}
    </PickerCard>
  )
}

// ---- Employers ---------------------------------------------------------------------

export function EmployersTab({ reqs, apply, employers, count }: TabProps) {
  const [query, setQuery] = useState('')
  const counter = useCounter(count)
  const rows = reqs.filter((r): r is RequirementOf<'org_history'> => r.kind === 'org_history' && rowItems(r).length > 0)
  const atCap = rows.length >= MAX_EMPLOYER_PRIORITIES
  const q = query.trim().toLowerCase()
  const list = employers.filter((e) => !q || e.name.toLowerCase().includes(q) || e.acronym?.toLowerCase().includes(q))
  return (
    <PickerCard>
      <SearchField value={query} onChange={setQuery} placeholder="Search organizations" />
      <ul className="min-h-0 flex-1 space-y-0.5 p-2 sm:overflow-y-auto">
        {list.length === 0 && <li className="px-2 py-6 text-center text-sm text-ink-faint">No matching organizations.</li>}
        {list.map((e) => {
          const row = rowWithItem(rows, 'org_history', e.name) as RequirementOf<'org_history'> | undefined
          return (
            <CheckRow
              key={e.name}
              on={!!row}
              disabled={!row && atCap}
              onToggle={() => apply((rs) => (row ? withoutItem(rs, 'org_history', e.name) : addEmployer(rs, e.name, e.orgId)))}
              label={
                <>
                  <OrgLogo
                    url={e.logoUrl}
                    name={e.name}
                    acronym={e.acronym}
                    className="h-[26px] w-[26px] shrink-0 rounded-md"
                    monogramClassName="text-[8.5px] font-bold"
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{e.name}</span>
                    {e.typeLabel && <span className="block text-xs text-ink-faint">{e.typeLabel}</span>}
                  </span>
                </>
              }
              extra={<Count n={counter('org_history', { org: e.name, org_id: e.orgId, scope: 'ever', peers: [] })} />}
            >
              {row && (
                <>
                  <MiniToggle
                    label={`${e.name}: when`}
                    value={relationOf(row)}
                    options={ORG_RELATIONS}
                    onChange={(scope) => apply((rs) => updateRow(rs, { ...row, value: { ...row.value, scope } }))}
                  />
                  <StrengthControl value={row.level} label={e.name} onChange={(l) => apply((rs) => setLevel(rs, row.id, l))} />
                  {e.peerLabel && (
                    <label className="flex w-full cursor-pointer items-center gap-2 pt-0.5 text-[13px] text-ink-soft">
                      <input
                        type="checkbox"
                        checked={!!row.value.includePeers}
                        onChange={(ev) =>
                          apply((rs) =>
                            updateRow(rs, {
                              ...row,
                              value: {
                                ...row.value,
                                scope: relationOf(row),
                                includePeers: ev.target.checked || undefined,
                              },
                            }),
                          )
                        }
                        className="h-4 w-4 rounded border-[#B9C3C7] accent-brand-500"
                      />
                      Also count {e.peerLabel}
                    </label>
                  )}
                </>
              )}
            </CheckRow>
          )
        })}
      </ul>
      <AnyOfNote rows={rows} noun="employers" />
      {atCap && <LimitNote max={MAX_EMPLOYER_PRIORITIES} noun="organizations" />}
    </PickerCard>
  )
}

// ---- Location ------------------------------------------------------------------------

interface FlatPlace {
  node: TreeNode
  path: string[] // labels from the root, the node's own last
}

function flatten(nodes: TreeNode[], above: string[] = []): FlatPlace[] {
  return nodes.flatMap((n) => [{ node: n, path: [...above, n.label] }, ...flatten(n.children ?? [], [...above, n.label])])
}

export function LocationTab({ reqs, apply, options, count }: TabProps) {
  const counter = useCounter(count)
  const [query, setQuery] = useState('')
  const chosen = selectedValues(reqs, 'location')
  const row = reqs.find((r) => r.kind === 'location')
  const flat = useMemo(() => flatten(options.locations), [options.locations])
  // One open branch at a time; it starts at the selection, and the manager's
  // own toggles win after that.
  const [open, setOpen] = useState<string[]>(() => {
    const hit = flat.find((f) => f.node.value && chosen.includes(f.node.value))
    return hit ? hit.path.slice(0, -1) : []
  })
  const toggle = (path: string[]) =>
    setOpen((cur) => (path.every((p, i) => cur[i] === p) && cur.length >= path.length ? path.slice(0, -1) : path))
  const select = (value: string) => apply((rs) => selectOne(rs, 'location', value))
  const strength = row && (
    <StrengthControl value={row.level} label="Location" onChange={(l) => apply((rs) => setLevel(rs, row.id, l))} />
  )

  const renderNodes = (nodes: TreeNode[], depth: number, above: string[]): ReactNode =>
    nodes.map((n) => {
      const path = [...above, n.label]
      const parent = !!n.children?.length
      const expanded = parent && path.every((p, i) => open[i] === p)
      const on = !!n.value && chosen.includes(n.value)
      return (
        <li key={path.join('›')}>
          <div
            className={`rounded-lg ${on ? 'bg-[#F7FBFC]' : ''}`}
            style={{ paddingLeft: depth * 20 }}
          >
            <div className={`flex items-center gap-1 rounded-lg pr-2 ${on ? '' : 'hover:bg-[#F6F3EE]'}`}>
              {parent ? (
                <button
                  type="button"
                  onClick={() => toggle(path)}
                  aria-label={`${expanded ? 'Collapse' : 'Expand'} ${n.label}`}
                  aria-expanded={expanded}
                  className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md text-ink-faint hover:text-ink"
                >
                  <ChevronRight size={15} className={`transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`} />
                </button>
              ) : (
                <span className="w-[26px] shrink-0" aria-hidden />
              )}
              {n.value ? (
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => select(n.value!)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <RadioMark on={on} />
                  <span className="min-w-0 flex-1 truncate">{n.label}</span>
                  <Count n={counter('location', { values: [n.value] })} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(path)}
                  className="min-w-0 flex-1 truncate py-2 text-left text-sm font-medium text-ink-soft"
                >
                  {n.label}
                </button>
              )}
            </div>
            {on && strength && <div className="pb-2.5 pr-2" style={{ paddingLeft: 60 }}>{strength}</div>}
          </div>
          {expanded && <ul>{renderNodes(n.children!, depth + 1, path)}</ul>}
        </li>
      )
    })

  const q = query.trim().toLowerCase()
  const results = q ? flat.filter((f) => f.node.value && f.node.label.toLowerCase().includes(q)) : null
  return (
    <PickerCard>
      <SearchField value={query} onChange={setQuery} placeholder="Search continents, regions, countries, cities" />
      <ul role="radiogroup" aria-label="Location" className="min-h-0 flex-1 p-2 sm:overflow-y-auto">
        {results
          ? results.length === 0
            ? <li className="px-2 py-6 text-center text-sm text-ink-faint">No matching places.</li>
            : results.map((f) => {
                const on = chosen.includes(f.node.value!)
                return (
                  <li key={f.path.join('›')} className={`rounded-lg ${on ? 'bg-[#F7FBFC]' : ''}`}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        select(f.node.value!)
                        setOpen(f.path.slice(0, -1))
                        setQuery('')
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-ink ${on ? '' : 'hover:bg-[#F6F3EE]'}`}
                    >
                      <RadioMark on={on} />
                      <span className="min-w-0 flex-1 truncate">
                        {f.node.label}
                        {f.path.length > 1 && <span className="text-ink-faint"> · {f.path.slice(0, -1).reverse().join(', ')}</span>}
                      </span>
                      <Count n={counter('location', { values: [f.node.value!] })} />
                    </button>
                  </li>
                )
              })
          : renderNodes(options.locations, 0, [])}
      </ul>
    </PickerCard>
  )
}

// ---- Availability --------------------------------------------------------------------

type Preset = 'now_open' | 'now_3m' | 'now_6m' | 'next' | 'custom'

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function firstOfNextMonth(now = new Date()): string {
  return ymd(new Date(now.getFullYear(), now.getMonth() + 1, 1))
}

function presetOf(v: AvailabilityFilter): Preset | null {
  if (v.when === 'now_open' || v.when === 'now_3m' || v.when === 'now_6m') return v.when
  if (v.when === 'dates') return v.fromDate === firstOfNextMonth() && !v.untilDate ? 'next' : 'custom'
  return null
}

type Engagement = 'either' | 'pt' | 'ft'
const engagementOf = (v: AvailabilityFilter): Engagement => (v.partTime && v.fullTime ? 'either' : v.partTime ? 'pt' : 'ft')
const tracksOf = (e: Engagement) => ({ partTime: e !== 'ft', fullTime: e !== 'pt' })

export function AvailabilityTab({ reqs, apply, count }: TabProps) {
  const row = availabilityRow(reqs)
  // Before a time is picked there's no row yet: the engagement waits here.
  const [pendingEngagement, setPendingEngagement] = useState<Engagement>('either')
  const value = row?.value ?? { ...DEFAULT_AVAILABILITY, ...tracksOf(pendingEngagement) }
  const preset = row ? presetOf(row.value) : null
  const [customOpen, setCustomOpen] = useState(preset === 'custom')
  const showCustom = customOpen || preset === 'custom'
  const nextLabel = useMemo(() => {
    const d = new Date(`${firstOfNextMonth()}T00:00:00`)
    return `From 1 ${d.toLocaleDateString('en-GB', { month: 'short' })}, open-ended`
  }, [])

  const write = (next: AvailabilityFilter) =>
    apply((rs) =>
      row
        ? updateRow(rs, { ...row, value: next })
        : [...rs, makeRow('availability', next, { level: DEFAULT_LEVEL })],
    )
  const base = { byMonth: null, fromMonth: null, untilMonth: null, fromDate: null, untilDate: null }
  const pick = (p: Preset) => {
    const tracks = { partTime: value.partTime, fullTime: value.fullTime }
    setCustomOpen(p === 'custom')
    if (p === 'custom') {
      const today = new Date()
      const until = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate())
      write({ ...tracks, ...base, when: 'dates', fromDate: value.fromDate ?? ymd(today), untilDate: value.untilDate ?? ymd(until) })
    } else if (p === 'next') write({ ...tracks, ...base, when: 'dates', fromDate: firstOfNextMonth() })
    else write({ ...tracks, ...base, when: p })
  }
  const setEngagement = (e: Engagement) => {
    setPendingEngagement(e)
    if (row) write({ ...row.value, ...tracksOf(e) })
  }
  const timed = hasAvailabilityTime(row)
  // A row from the filter bar may set only the engagement; it still counts.
  const counts = !!row && rowHasValue(row)
  const presets: { value: Preset; label: string }[] = [
    { value: 'now_open', label: 'Now, open-ended' },
    { value: 'now_3m', label: 'Now, for 3 months' },
    { value: 'now_6m', label: 'Now, for 6 months' },
    { value: 'next', label: nextLabel },
    { value: 'custom', label: 'Custom dates…' },
  ]
  const legacy = row && timed && preset === null

  return (
    <div className="flex flex-col gap-[18px] rounded-xl border border-line bg-white p-[18px]">
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink">Engagement</p>
        <MiniToggle
          tall
          label="Engagement"
          className="w-full max-w-[360px]"
          value={engagementOf(value)}
          options={[
            { value: 'either', label: 'Either' },
            { value: 'pt', label: 'Part-time' },
            { value: 'ft', label: 'Full-time' },
          ]}
          onChange={setEngagement}
        />
      </div>
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink">Needed</p>
        <div role="radiogroup" aria-label="Needed" className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const on = p.value === 'custom' ? showCustom : preset === p.value
            return (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pick(p.value)}
                className={`rounded-full border px-3.5 py-2 text-[13.5px] transition-colors ${
                  on ? 'border-brand-500 bg-brand-50 font-medium text-brand-700' : 'border-line text-ink-soft hover:border-ink-faint'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        {legacy && <p className="mt-2 text-xs text-ink-faint">Saved earlier as an older choice; pick one above to change it.</p>}
        {showCustom && row && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-xs font-medium text-ink-soft">
              From
              <input
                type="date"
                value={row.value.fromDate ?? ''}
                onChange={(e) => e.target.value && write({ ...row.value, ...base, when: 'dates', fromDate: e.target.value, untilDate: row.value.untilDate ?? null })}
                className="mt-1 block h-10 rounded-[10px] border border-line px-3 text-sm text-ink outline-none focus:border-brand-500"
              />
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Until
              <input
                type="date"
                value={row.value.untilDate ?? ''}
                disabled={!row.value.untilDate}
                min={row.value.fromDate ?? undefined}
                onChange={(e) => e.target.value && write({ ...row.value, untilDate: e.target.value })}
                className="mt-1 block h-10 rounded-[10px] border border-line px-3 text-sm text-ink outline-none focus:border-brand-500 disabled:bg-paper disabled:text-ink-faint"
              />
            </label>
            <label className="flex h-10 cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
              <input
                type="checkbox"
                checked={!row.value.untilDate}
                onChange={(e) => {
                  const from = row.value.fromDate ? new Date(`${row.value.fromDate}T00:00:00`) : new Date()
                  write({
                    ...row.value,
                    untilDate: e.target.checked ? null : ymd(new Date(from.getFullYear(), from.getMonth() + 3, from.getDate())),
                  })
                }}
                className="h-4 w-4 accent-brand-500"
              />
              Open-ended
            </label>
          </div>
        )}
      </div>
      <div className="border-t border-[#F1EDE7] pt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-ink">How much it matters</p>
          {row && counts && <Count n={count({ ...row, level: 'must' })} />}
        </div>
        {row && counts ? (
          <StrengthControl value={row.level} label="Availability" onChange={(l) => apply((rs) => setLevel(rs, row.id, l))} />
        ) : (
          <p className="text-[13px] text-ink-faint">Pick when you need them first.</p>
        )}
      </div>
    </div>
  )
}

// ---- Profile media --------------------------------------------------------------------

const MEDIA: { kind: 'video_qna' | 'audio_testimonial'; title: string; description: string }[] = [
  { kind: 'video_qna', title: 'Video Q&As', description: 'Recorded answers to standard questions' },
  { kind: 'audio_testimonial', title: 'Audio testimonial', description: 'A referee speaking about their work' },
]

export function MediaTab({ reqs, apply, count }: TabProps) {
  const counter = useCounter(count)
  return (
    <ul className="overflow-hidden rounded-xl border border-line bg-white">
      {MEDIA.map((m) => {
        const row = reqs.find((r) => r.kind === m.kind)
        return (
          <li key={m.kind} className={`border-b border-[#F1EDE7] last:border-b-0 ${row ? 'bg-[#F7FBFC]' : ''}`}>
            <button
              type="button"
              role="checkbox"
              aria-checked={!!row}
              onClick={() => apply((rs) => toggleMedia(rs, m.kind, !row))}
              className={`flex w-full items-center gap-3 px-3.5 py-4 text-left ${row ? '' : 'hover:bg-[#F6F3EE]'}`}
            >
              <CheckboxMark on={!!row} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink">{m.title}</span>
                <span className="block text-[13px] text-ink-faint">{m.description}</span>
              </span>
              <Count n={counter(m.kind, {})} />
            </button>
            {row && (
              <div className="pb-3.5 pl-11 pr-3.5">
                <StrengthControl value={row.level} label={m.title} onChange={(l) => apply((rs) => setLevel(rs, row.id, l))} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function TabBody({ tab, ...props }: TabProps & { tab: TabKey }) {
  switch (tab) {
    case 'expertise':
      return <ExpertiseTab {...props} />
    case 'career_level':
      return <ChoiceTab kind="career_level" {...props} />
    case 'work_arrangement':
      return <ChoiceTab kind="work_arrangement" {...props} />
    case 'language':
      return <LanguagesTab {...props} />
    case 'org_history':
      return <EmployersTab {...props} />
    case 'location':
      return <LocationTab {...props} />
    case 'availability':
      return <AvailabilityTab {...props} />
    case 'media':
      return <MediaTab {...props} />
  }
}
