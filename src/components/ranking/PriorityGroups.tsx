import { Plus, X } from 'lucide-react'
import { useState, type DragEvent, type ReactNode } from 'react'
import { PREFERENCE_POINTS } from '../../lib/matching/config'
import type { Level, Requirement } from '../../lib/matching/types'
import { AREA_LABELS, TABS, tabOf, type TabKey } from '../../lib/requirements/priorities'
import { InfoTip } from '../ui/InfoTip'
import { FunnelIcon } from './StrengthControl'

// "Your priorities" (the column beside the tabs) and the Summary tab: every
// priority grouped by strength. Click an entry to jump to its tab; drag it to
// another group to change its strength (desktop — on touch screens the tab's
// strength control does the same).

const MIME = 'application/x-mavenscout-priority'

export const STRENGTH_LEGEND = `Nice to have counts ${PREFERENCE_POINTS.slight}× in the match score. Important counts ${PREFERENCE_POINTS.strong}×. Must have is a filter: anyone without it is removed from the pool.`

function useDragLevels(onSetLevel: (id: string, level: Level) => void) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<Level | null>(null)
  return {
    dragId,
    over,
    entry: (id: string) => ({
      draggable: true,
      onDragStart: (e: DragEvent) => {
        e.dataTransfer.setData(MIME, id)
        e.dataTransfer.effectAllowed = 'move'
        setDragId(id)
      },
      onDragEnd: () => {
        setDragId(null)
        setOver(null)
      },
    }),
    group: (level: Level) => ({
      onDragOver: (e: DragEvent) => {
        if (!e.dataTransfer.types.includes(MIME)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (over !== level) setOver(level)
      },
      onDragLeave: (e: DragEvent) => {
        if (!(e.currentTarget as Node).contains(e.relatedTarget as Node | null)) setOver((o) => (o === level ? null : o))
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault()
        const id = e.dataTransfer.getData(MIME)
        setOver(null)
        setDragId(null)
        if (id) onSetLevel(id, level)
      },
    }),
  }
}

function Grip() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" className="shrink-0 fill-[#B9C3C7]" aria-hidden>
      {[0, 1].map((x) => [0, 1, 2].map((y) => <circle key={`${x}${y}`} cx={2 + x * 4} cy={2 + y * 4} r={1.1} />))}
    </svg>
  )
}

const GROUPS: { level: Level; label: string; sub: string; head: string }[] = [
  { level: 'must', label: 'Must haves', sub: '· filtering the pool', head: 'bg-ink text-white' },
  { level: 'strong', label: 'Important', sub: `· weighs ${PREFERENCE_POINTS.strong}×`, head: 'bg-brand-100 text-brand-700' },
  { level: 'slight', label: 'Nice to have', sub: `· weighs ${PREFERENCE_POINTS.slight}×`, head: 'bg-brand-50 text-brand-700' },
]

export interface GroupProps {
  rows: Requirement[]
  text: (r: Requirement) => string
  onSetLevel: (id: string, level: Level) => void
  onOpen: (tab: TabKey) => void
}

function EmptyDrop() {
  return (
    <div className="flex h-[38px] items-center justify-center rounded-[9px] border border-dashed border-[#E1DCD3] text-xs text-ink-faint">
      <span className="hidden md:inline">Drag items here</span>
      <span className="md:hidden">None yet</span>
    </div>
  )
}

/** The column beside the tabs. */
export function PriorityPanel({ rows, text, onSetLevel, onOpen }: GroupProps) {
  const dnd = useDragLevels(onSetLevel)
  return (
    <aside
      aria-label="Your priorities"
      className="flex h-full w-[272px] flex-col gap-3.5 overflow-y-auto border-l border-line bg-paper px-3.5 py-[18px]"
    >
      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-base font-semibold text-ink">Your priorities</h3>
          <InfoTip text={STRENGTH_LEGEND} />
          <span className="ml-auto text-[12.5px] text-ink-faint">{rows.length} set</span>
        </div>
        <p className="mt-0.5 text-[12.5px] text-ink-faint">Drag to change strength. Click to edit.</p>
      </div>
      {GROUPS.map((g) => {
        const items = rows.filter((r) => r.level === g.level)
        const hot = dnd.over === g.level
        return (
          <section
            key={g.level}
            {...dnd.group(g.level)}
            className={`overflow-hidden rounded-xl border-[1.5px] transition-colors duration-[120ms] ${hot ? 'border-brand-500' : 'border-line'}`}
          >
            <header className={`flex items-center gap-1.5 px-3 py-[9px] ${g.head}`}>
              {g.level === 'must' && <FunnelIcon />}
              <span className="text-[13px] font-bold">{g.label}</span>
              <span className="text-xs opacity-80">{g.sub}</span>
              <span className="ml-auto text-xs font-bold">{items.length}</span>
            </header>
            <ul className={`flex flex-col gap-1.5 p-2 transition-colors duration-[120ms] ${hot ? 'bg-brand-50' : 'bg-white'}`}>
              {items.length === 0 && (
                <li>
                  <EmptyDrop />
                </li>
              )}
              {items.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    {...dnd.entry(r.id)}
                    onClick={() => {
                      const tab = tabOf(r.kind)
                      if (tab) onOpen(tab)
                    }}
                    className={`flex w-full cursor-grab items-center gap-2 rounded-[9px] border border-line bg-white px-2 py-[7px] text-left transition hover:border-[#B9C3C7] hover:shadow-[0_2px_6px_rgba(34,51,59,.08)] active:cursor-grabbing ${
                      dnd.dragId === r.id ? 'opacity-40' : ''
                    }`}
                  >
                    <Grip />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10.5px] font-semibold uppercase tracking-[.06em] text-ink-faint">
                        {AREA_LABELS[r.kind]}
                      </span>
                      <span className="block truncate text-[13.5px] text-ink" title={text(r)}>
                        {text(r)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </aside>
  )
}

const COLUMNS: { level: Level; label: string; sub: string }[] = [
  { level: 'slight', label: 'Nice to have', sub: `Weighs ${PREFERENCE_POINTS.slight}×` },
  { level: 'strong', label: 'Important', sub: `Weighs ${PREFERENCE_POINTS.strong}×` },
  { level: 'must', label: 'Must have', sub: 'Filters the pool' },
]

/** The Summary tab: three columns, low → high, and the areas still at No
 *  preference. */
export function SummaryBoard({
  rows,
  text,
  onSetLevel,
  onOpen,
  onRemove,
  unset,
}: GroupProps & { onRemove: (r: Requirement) => void; unset: TabKey[] }) {
  const dnd = useDragLevels(onSetLevel)
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {COLUMNS.map((c) => {
          const items = rows.filter((r) => r.level === c.level)
          const hot = dnd.over === c.level
          return (
            <section
              key={c.level}
              {...dnd.group(c.level)}
              aria-label={c.label}
              className={`flex flex-col gap-2.5 rounded-[14px] border-[1.5px] border-dashed p-3 transition-colors duration-[120ms] md:min-h-[320px] ${
                hot ? 'border-brand-500 bg-brand-50' : 'border-line bg-paper'
              }`}
            >
              <header>
                <div className="flex items-center gap-1.5">
                  {c.level === 'must' && <FunnelIcon size={13} />}
                  <h4 className="font-display text-[15.5px] font-semibold text-ink">{c.label}</h4>
                  <span className="ml-auto text-[13px] font-semibold text-ink-faint">{items.length}</span>
                </div>
                <p className="text-[12.5px] text-ink-soft">{c.sub}</p>
              </header>
              {items.length === 0 && <EmptyDrop />}
              {items.map((r) => (
                <SummaryCard
                  key={r.id}
                  drag={dnd.entry(r.id)}
                  dragging={dnd.dragId === r.id}
                  area={AREA_LABELS[r.kind]}
                  value={text(r)}
                  onOpen={() => {
                    const tab = tabOf(r.kind)
                    if (tab) onOpen(tab)
                  }}
                  onRemove={() => onRemove(r)}
                />
              ))}
            </section>
          )
        })}
      </div>
      {unset.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-soft">No preference</p>
          <div className="flex flex-wrap gap-2">
            {unset.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onOpen(key)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#D5CFC4] bg-white px-3 py-1.5 text-[13px] text-ink-soft hover:border-ink-faint hover:text-ink"
              >
                <Plus size={13} aria-hidden />
                {TABS.find((t) => t.key === key)!.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  drag,
  dragging,
  area,
  value,
  onOpen,
  onRemove,
}: {
  drag: ReturnType<ReturnType<typeof useDragLevels>['entry']>
  dragging: boolean
  area: string
  value: ReactNode
  onOpen: () => void
  onRemove: () => void
}) {
  return (
    <div
      {...drag}
      className={`flex h-[62px] shrink-0 cursor-grab items-center gap-2 rounded-[10px] border border-line bg-white pl-2.5 pr-1.5 active:cursor-grabbing ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      <Grip />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="block text-[11px] font-semibold uppercase tracking-[.06em] text-ink-faint">{area}</span>
        <span className="block truncate text-sm font-medium text-ink">{value}</span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${area}`}
        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-[#F3EFE9] hover:text-ink"
      >
        <X size={14} />
      </button>
    </div>
  )
}
