import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Search, Sparkles, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { runBlockerFor } from '../../lib/matching/preferences'
import type { ExtractedRequirements } from '../../lib/matching/types'
import type { RequirementsStore } from '../../lib/requirements/store'
import { JdStep } from './JdStep'
import { JdSuggestions } from './JdSuggestions'
import { LiveCount, useMustHaveCount, type CountFn } from './LiveCount'
import { RequirementsGrid, type GridOptions } from './RequirementsGrid'

// The ranking drawer (match rework spec §8): slides in from the right edge,
// full viewport height, ~480px wide, over the card grid with a light scrim.
// Clicking the scrim or pressing Esc closes it; nothing is lost, because the
// JD, suggestions and rows live outside it. Header and footer (live count +
// Run) stay pinned while the content between them scrolls. On phones it's a
// full-screen sheet with numbered steps. The JD is optional: without one the
// run sorts by the preference rows alone (spec §11).

export interface JdState {
  text: string
  setText: (text: string) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  reading: boolean
  onRead: () => void
  /** Suggestions from the last "Read job description"; null until read. */
  extracted: ExtractedRequirements | null
}

function StepHeading({ n, children }: { n: number; children: string }) {
  return (
    <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-ink">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
        {n}
      </span>
      {children}
    </h3>
  )
}

export function RankingPanel({
  open,
  onClose,
  jd,
  store,
  options,
  countFn,
  poolSize,
  focusId,
  onFocusRow,
  orgPrefill,
  onRun,
  running = false,
  runLabel = 'Run ranking',
  linkedOpeningName,
}: {
  open: boolean
  onClose: () => void
  jd: JdState
  store: RequirementsStore
  options: GridOptions
  countFn: CountFn
  poolSize: number
  focusId: string | null
  onFocusRow: (id: string) => void
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

  // The drawer overlays the page: stop the page behind it scrolling, close on
  // Esc, and move focus into it.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  useEffect(() => {
    if (open && focusId)
      document.getElementById(`req-row-${focusId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [open, focusId])

  const runBlocker = runBlockerFor({
    jdText: jd.text,
    read: !!jd.extracted,
    requirements,
    poolCount: counts.count,
  })

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
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-paper shadow-2xl outline-none sm:w-[480px] sm:border-l sm:border-line"
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line bg-white px-4 py-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 text-base font-semibold">
                  <Sparkles size={15} className="text-gold-500" aria-hidden /> Rank candidates
                </h2>
                <p className="mt-0.5 text-[11.5px] text-ink-faint">
                  {linkedOpeningName ? `For: ${linkedOpeningName} · ` : ''}Placeholder scorer this build — the
                  real engine drops in behind the same interface.
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
            </header>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-4">
              <section className="space-y-3">
                <StepHeading n={1}>Job description (optional)</StepHeading>
                <JdStep
                  text={jd.text}
                  onText={jd.setText}
                  collapsed={jd.collapsed}
                  onEdit={() => jd.setCollapsed(false)}
                  onRead={jd.onRead}
                  reading={jd.reading}
                />
                {jd.extracted && (
                  <JdSuggestions extracted={jd.extracted} requirements={requirements} onAdd={store.addSuggestions} />
                )}
              </section>

              <section>
                <StepHeading n={2}>Review requirements</StepHeading>
                <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                  <span className="font-medium text-ink-faint">Pool:</span>
                  {search.term.trim() ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5">
                      <Search size={11} aria-hidden />
                      Search: "{search.term.trim()}"
                      {search.mode === 'full' && <span className="text-ink-faint">· full profiles</span>}
                      <button
                        type="button"
                        onClick={store.clearSearch}
                        aria-label="Clear search term"
                        className="text-ink-faint hover:text-ink"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ) : (
                    <span>all {poolSize} approved candidates, narrowed by anything marked Required</span>
                  )}
                </div>
                <RequirementsGrid
                  store={store}
                  options={options}
                  focusId={focusId}
                  onFocusRow={onFocusRow}
                  orgPrefill={orgPrefill}
                />
              </section>
            </div>

            <footer className="shrink-0 space-y-2.5 border-t border-line bg-white px-4 py-3">
              <LiveCount {...counts} onFocusRow={onFocusRow} />
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
