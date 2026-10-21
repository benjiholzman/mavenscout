import { Search, Sparkles, X } from 'lucide-react'
import { useEffect } from 'react'
import type { RequirementsStore } from '../../lib/requirements/store'
import { JdStep } from './JdStep'
import { LiveCount, useMustHaveCount, type CountFn } from './LiveCount'
import { RequirementsGrid, type GridOptions } from './RequirementsGrid'

// The ranking panel (match rework spec §8). One element, two layouts:
// - desktop (lg+): ~400px column left of the card grid, sticky under the
//   site header, scrolling independently, Run pinned to its bottom;
// - phones/tablets: a full-screen sheet with numbered steps
//   (job description → requirements → run).
// Filter-bar controls stay in sync because both read the same store.

export interface JdState {
  text: string
  setText: (text: string) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  reading: boolean
  onRead: () => void
  /** True once "Read job description" has run for the current text. */
  read: boolean
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
  onRun,
  running = false,
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
  /** Runs the ranking. Absent until scoring is wired up. */
  onRun?: () => void
  running?: boolean
}) {
  const { requirements, search } = store.state
  const counts = useMustHaveCount(requirements, search, countFn)

  // Full-screen sheet below lg: stop the page behind it from scrolling.
  useEffect(() => {
    if (!open || !window.matchMedia('(max-width: 1023px)').matches) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (open && focusId)
      document.getElementById(`req-row-${focusId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [open, focusId])

  if (!open) return null

  const runBlocker = !jd.read
    ? 'Read the job description first.'
    : counts.count === 0
      ? 'No candidates meet your must-haves.'
      : null

  return (
    <aside
      aria-label="Rank by job description"
      className="fixed inset-0 z-50 flex flex-col bg-paper lg:sticky lg:inset-auto lg:top-[76px] lg:z-auto lg:h-[calc(100vh-92px)] lg:overflow-hidden lg:rounded-card lg:border lg:border-line lg:bg-white lg:shadow-card"
    >
      <header className="flex items-start justify-between gap-3 border-b border-line bg-white px-4 py-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-semibold">
            <Sparkles size={15} className="text-gold-500" aria-hidden /> Rank by job description
          </h2>
          <p className="mt-0.5 text-[11.5px] text-ink-faint">
            Placeholder scorer this build — the real engine drops in behind the same interface.
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

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <section>
          <StepHeading n={1}>Job description</StepHeading>
          <JdStep
            text={jd.text}
            onText={jd.setText}
            collapsed={jd.collapsed}
            onEdit={() => jd.setCollapsed(false)}
            onRead={jd.onRead}
            reading={jd.reading}
          />
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
              <span>all {poolSize} approved candidates, narrowed by your must-haves</span>
            )}
          </div>
          <RequirementsGrid store={store} options={options} focusId={focusId} />
        </section>
      </div>

      <footer className="space-y-2.5 border-t border-line bg-white px-4 py-3">
        <LiveCount {...counts} onFocusRow={onFocusRow} />
        <button
          type="button"
          disabled={!onRun || !!runBlocker || running}
          onClick={onRun}
          title={!onRun ? 'Scoring is connected in the next build stage' : (runBlocker ?? undefined)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles size={15} className="text-gold-300" aria-hidden />
          {running ? 'Ranking…' : 'Run ranking'}
        </button>
        {runBlocker && <p className="text-center text-[11.5px] text-ink-faint">{runBlocker}</p>}
      </footer>
    </aside>
  )
}
