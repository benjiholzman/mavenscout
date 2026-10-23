import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Search, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { locationLabel } from '../../lib/filters'
import { runBlockerFor } from '../../lib/matching/preferences'
import type { ExtractedRequirements, RankingMode } from '../../lib/matching/types'
import { KIND_LABELS } from '../../lib/requirements/labels'
import { jdSuggestedValues } from '../../lib/requirements/model'
import { isPriorityKey, type PriorityKey } from '../../lib/requirements/priorities'
import type { RequirementsStore } from '../../lib/requirements/store'
import { JdStep } from './JdStep'
import { LiveCount, useMustHaveCount, type CountFn } from './LiveCount'
import { PriorityEditor, type PickerOptions } from './PriorityEditors'
import { PriorityList } from './PriorityList'

// The ranking drawer (match rework spec §8): slides in from the right edge,
// full viewport height, up to 640px wide (the directory stays partly in view),
// over the card grid with a light scrim. On phones it's a full-screen sheet.
// Clicking the scrim or pressing Esc closes it; nothing is lost, because the
// JD and rows live outside it.
//
// Two tabs share one set of priorities; the tab decides the run's mode: "Match
// to a job description" (Fit plus priorities) or "Rank by priorities" (spec
// §11). Tapping a priority slides its editor in over the list, with a back
// arrow (push navigation, no stacked modals). The live count and Run stay
// pinned at the bottom throughout.

export interface JdState {
  text: string
  setText: (text: string) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  reading: boolean
  onRead: () => void
  /** What the last "Read job description" found; null until read. */
  extracted: ExtractedRequirements | null
  /** "Clear suggestions": takes the pre-filled places and languages out. */
  onClearSuggestions: () => void
}

const TABS: { value: RankingMode; label: string }[] = [
  { value: 'jd', label: 'Match to a job description' },
  { value: 'preferences', label: 'Rank by priorities' },
]

function SectionHeading({ children }: { children: string }) {
  return <h3 className="mb-2.5 text-sm font-semibold text-ink">{children}</h3>
}

export function RankingPanel({
  open,
  onClose,
  tab,
  onTab,
  jd,
  store,
  options,
  countFn,
  poolSize,
  focusId,
  orgPrefill,
  onRun,
  running = false,
  runLabel = 'Run ranking',
  linkedOpeningName,
}: {
  open: boolean
  onClose: () => void
  tab: RankingMode
  onTab: (tab: RankingMode) => void
  jd: JdState
  store: RequirementsStore
  options: PickerOptions
  countFn: CountFn
  poolSize: number
  /** A row to open (from the filter bar's chips). */
  focusId: string | null
  orgPrefill: string
  onRun: () => void
  running?: boolean
  runLabel?: string
  linkedOpeningName?: string | null
}) {
  const { requirements, search } = store.state
  const counts = useMustHaveCount(requirements, search, countFn)
  const reduceMotion = useReducedMotion()
  const panelRef = useRef<HTMLElement>(null)
  const [editing, setEditing] = useState<PriorityKey | null>(null)

  /** Opens the editor holding a row (or scrolls to the filter switches). */
  const openRow = useCallback(
    (id: string) => {
      const row = requirements.find((r) => r.id === id)
      if (!row) return
      if (isPriorityKey(row.kind)) setEditing(row.kind)
      else {
        setEditing(null)
        document.getElementById('priority-filters')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    },
    [requirements],
  )

  // The drawer overlays the page: stop the page behind it scrolling, move
  // focus into it, and let Esc go back from an editor, then close.
  useEffect(() => {
    if (!open) {
      setEditing(null)
      return
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (editing) setEditing(null)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, editing, onClose])

  // Opened from a filter-bar chip: straight to that priority.
  useEffect(() => {
    if (open && focusId) openRow(focusId)
    // Only when a new row is asked for, not on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, focusId])

  // Coming back from an editor returns focus to its line.
  const back = () => {
    const key = editing
    setEditing(null)
    if (key) requestAnimationFrame(() => document.getElementById(`priority-${key}`)?.focus())
  }

  const suggested = jdSuggestedValues(requirements, jd.extracted)
  const fromJd = new Set<PriorityKey>(suggested.map((s) => s.kind))

  const runBlocker = runBlockerFor({
    mode: tab,
    jdText: jd.text,
    read: !!jd.extracted,
    requirements,
    poolCount: counts.count,
  })

  const slide = { duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' } as const

  const priorities = (
    <section>
      <SectionHeading>Your priorities</SectionHeading>
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
        <span className="font-medium text-ink-faint">Pool:</span>
        {search.term.trim() ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5">
            <Search size={11} aria-hidden />
            Search: "{search.term.trim()}"
            {search.mode === 'full' && <span className="text-ink-faint">· full profiles</span>}
            <button type="button" onClick={store.clearSearch} aria-label="Clear search term" className="text-ink-faint hover:text-ink">
              <X size={11} />
            </button>
          </span>
        ) : (
          <span>all {poolSize} approved candidates, narrowed by anything marked Must have</span>
        )}
      </div>
      <PriorityList store={store} onOpen={setEditing} fromJd={fromJd} />
    </section>
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-50 bg-ink/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            key="drawer"
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Rank candidates"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={slide}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-paper shadow-2xl outline-none sm:w-[min(640px,calc(100vw-240px))] sm:border-l sm:border-line"
          >
            <header className="shrink-0 border-b border-line bg-white px-4 pt-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-1.5 text-base font-semibold">
                    <Sparkles size={15} className="text-gold-500" aria-hidden /> Rank candidates
                  </h2>
                  <p className="mt-0.5 text-[11.5px] text-ink-faint">
                    {linkedOpeningName ? `For: ${linkedOpeningName} · ` : ''}Placeholder scorer this build — the real
                    engine drops in behind the same interface.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close ranking panel"
                  className="rounded-full p-1.5 text-ink-faint hover:bg-paper hover:text-ink"
                >
                  <X size={18} />
                </button>
              </div>
              <div role="tablist" aria-label="How to rank" className="mt-3 flex gap-1">
                {TABS.map((t) => {
                  const active = tab === t.value
                  return (
                    <button
                      key={t.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setEditing(null)
                        onTab(t.value)
                      }}
                      className={`-mb-px flex-1 border-b-2 px-2 pb-2.5 pt-1 text-[13px] font-medium leading-tight transition-colors ${
                        active ? 'border-ink text-ink' : 'border-transparent text-ink-faint hover:text-ink'
                      }`}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </header>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div
                role="tabpanel"
                aria-hidden={!!editing || undefined}
                className="h-full space-y-6 overflow-y-auto overscroll-contain px-4 py-4"
              >
                {tab === 'jd' && (
                  <section className="space-y-3">
                    <SectionHeading>Job description</SectionHeading>
                    <JdStep
                      text={jd.text}
                      onText={jd.setText}
                      collapsed={jd.collapsed}
                      onEdit={() => jd.setCollapsed(false)}
                      onRead={jd.onRead}
                      reading={jd.reading}
                    />
                    {jd.extracted &&
                      (suggested.length > 0 ? (
                        <p className="text-[11.5px] leading-snug text-ink-soft">
                          Pre-filled below at Nice to have, from your JD:{' '}
                          <span className="font-medium text-ink">{suggested.map((s) => (s.kind === 'location' ? locationLabel(s.value) : s.value)).join(', ')}</span>.{' '}
                          <button
                            type="button"
                            onClick={jd.onClearSuggestions}
                            className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-600"
                          >
                            Clear suggestions
                          </button>
                        </p>
                      ) : (
                        <p className="text-[11.5px] leading-snug text-ink-faint">
                          Read. No places or languages from this JD to pre-fill.
                        </p>
                      ))}
                  </section>
                )}
                {priorities}
              </div>

              <AnimatePresence initial={false}>
                {editing && (
                  <motion.div
                    key={editing}
                    role="region"
                    aria-label={KIND_LABELS[editing]}
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={slide}
                    className="absolute inset-0 flex flex-col bg-paper"
                  >
                    <div className="flex shrink-0 items-center gap-1.5 border-b border-line bg-white px-2 py-2">
                      <button
                        type="button"
                        onClick={back}
                        aria-label="Back to your priorities"
                        className="rounded-full p-2 text-ink-soft hover:bg-paper hover:text-ink"
                      >
                        <ArrowLeft size={18} />
                      </button>
                      <h3 className="text-sm font-semibold text-ink">{KIND_LABELS[editing]}</h3>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                      <PriorityEditor priority={editing} store={store} options={options} orgPrefill={orgPrefill} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <footer className="shrink-0 space-y-2.5 border-t border-line bg-white px-4 py-3">
              <LiveCount {...counts} onFocusRow={openRow} />
              <button
                type="button"
                disabled={!!runBlocker || running}
                onClick={onRun}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles size={15} className="text-gold-300" aria-hidden />
                {running ? 'Ranking…' : runLabel}
              </button>
              {runBlocker && <p className="text-center text-[11.5px] text-ink-faint">{runBlocker}</p>}
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
