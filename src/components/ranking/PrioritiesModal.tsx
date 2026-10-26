import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronLeft, List, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { locationLabel } from '../../lib/filters'
import { runBlockerFor } from '../../lib/matching/preferences'
import type { ExtractedRequirements, Level, RankingMode, Requirement, RequirementOf } from '../../lib/matching/types'
import {
  clearJdSuggestions,
  EMPTY_SEARCH,
  isMust,
  jdPrefills,
  jdSuggestedValues,
  normalizeRequirements,
  rowHasValue,
  sameRows,
} from '../../lib/requirements/model'
import {
  clearTab,
  entryName,
  entryText,
  priorityRows,
  removeRow,
  setLevel,
  TAB_BY_KEY,
  tabOf,
  tabRows,
  TABS,
  type TabKey,
} from '../../lib/requirements/priorities'
import { useRequirements, type RequirementsState } from '../../lib/requirements/store'
import { JdStep } from './JdStep'
import { PriorityPanel, SummaryBoard } from './PriorityGroups'
import { PoolPreview, useMustHaveCount, type CountFn } from './PoolPreview'
import { TabBody, TabHeader, type EmployerOption, type PickerOptions } from './PriorityTabs'

// "Set your priorities" — the ranking modal (replaces the side drawer).
//
// Step 1: eight areas down the left, the area's picker in the middle, and
// "Your priorities" on the right, grouped by strength. Step 2 (optional): the
// job-description workflow — paste, read, see what it pre-filled.
//
// Edits go to a DRAFT copy of the requirements, taken when the modal opens.
// "See my matches" commits the draft and ranks by priorities; "See your
// matches" on step 2 commits it and ranks against the JD. Closing with
// changes asks before discarding them. Removing or clearing can be undone
// from a toast. On phones it's a full-screen sheet: the areas become a
// scrolling strip and "Your priorities" lives on the Summary tab.

type View = TabKey | 'summary'

export interface JdModalState {
  text: string
  setText: (text: string) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  reading: boolean
  /** Reads the JD; resolves with what it found (null if it couldn't). */
  read: () => Promise<ExtractedRequirements | null>
  extracted: ExtractedRequirements | null
}

const UNDO_MS = 6000

export function PrioritiesModal({
  open,
  onClose,
  committed,
  initialView,
  options,
  employers,
  peerLabel,
  countFn,
  poolSize,
  jd,
  onCommit,
  running,
  linkedOpeningName,
}: {
  open: boolean
  onClose: () => void
  /** The directory's requirements; copied into the draft on open. */
  committed: RequirementsState
  /** Open on this tab (from a filter-bar chip); else Summary if anything is
   *  set, Expertise if not. */
  initialView: TabKey | null
  options: PickerOptions
  employers: EmployerOption[]
  peerLabel: (r: RequirementOf<'org_history'>) => string | null
  countFn: CountFn
  poolSize: number
  jd: JdModalState
  onCommit: (state: RequirementsState, mode: RankingMode) => void
  running: boolean
  linkedOpeningName: string | null
}) {
  const draft = useRequirements()
  const { requirements: reqs, search } = draft.state
  const [view, setView] = useState<View>('expertise')
  const [stage, setStage] = useState<1 | 2>(1)
  const [confirming, setConfirming] = useState(false)
  const [undo, setUndo] = useState<{ text: string; prev: Requirement[] } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout>>()
  const baseline = useRef<Requirement[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  // Opening: copy the committed rows into the draft and pick the first view.
  useEffect(() => {
    if (!open) return
    const rows = normalizeRequirements(committed.requirements)
    baseline.current = rows
    draft.hydrate({ requirements: rows, search: committed.search })
    setStage(1)
    setConfirming(false)
    setUndo(null)
    setView(initialView ?? (priorityRows(rows).length > 0 ? 'summary' : 'expertise'))
    requestAnimationFrame(() => panelRef.current?.focus())
    // Only on opening; later changes to the committed rows (none happen while
    // it's open) shouldn't reset the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => () => clearTimeout(undoTimer.current), [])

  const dirty = !sameRows(reqs, baseline.current)
  const requestClose = useCallback(() => {
    if (dirty) setConfirming(true)
    else onClose()
  }, [dirty, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (confirming) setConfirming(false)
      else requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, confirming, requestClose])

  const apply = draft.apply
  const undoable = (text: string, fn: (rows: Requirement[]) => Requirement[]) => {
    setUndo({ text, prev: reqs })
    apply(fn)
    clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS)
  }
  const restore = () => {
    if (!undo) return
    draft.hydrate({ requirements: undo.prev, search })
    setUndo(null)
  }

  const rows = useMemo(() => priorityRows(reqs), [reqs])
  const text = useCallback((r: Requirement) => entryText(r, peerLabel), [peerLabel])
  const changeLevel = (id: string, level: Level) => apply((rs) => setLevel(rs, id, level))
  const count = useCallback((row: Requirement) => countFn([row], EMPTY_SEARCH), [countFn])
  const pool = useMustHaveCount(reqs, search, countFn)
  const ranksAnything = reqs.some((r) => !isMust(r) && rowHasValue(r))
  const unset = TABS.filter((t) => tabRows(reqs, t.key).length === 0).map((t) => t.key)

  const jdBlocker = runBlockerFor({ mode: 'jd', jdText: jd.text, read: !!jd.extracted, requirements: reqs, poolCount: pool.count })
  const suggested = jdSuggestedValues(reqs, jd.extracted)

  const readJd = async () => {
    const found = await jd.read()
    if (found) draft.addSuggestions(jdPrefills(found))
  }

  const commit = (mode: RankingMode) => onCommit(draft.state, mode)
  const goTo = (v: View) => {
    setStage(1)
    setView(v)
  }

  if (!open) return null

  const tabDef = view === 'summary' ? null : TAB_BY_KEY.get(view)!
  const showPanel = view !== 'summary'

  return (
    <AnimatePresence>
      <motion.div
        key="priorities"
        className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/40 sm:items-center sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.15 }}
        onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
      >
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="priorities-title"
          tabIndex={-1}
          initial={{ y: reduceMotion ? 0 : 24, opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 30, stiffness: 340 }}
          className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-[0_30px_70px_-20px_rgba(34,51,59,.5)] outline-none sm:h-[min(780px,calc(100vh-48px))] sm:max-w-[1140px] sm:rounded-[20px]"
        >
          {/* Header */}
          <header className="flex shrink-0 items-start gap-4 border-b border-line px-4 py-3.5 sm:px-6 sm:py-[18px]">
            <div className="min-w-0 flex-1">
              <h2 id="priorities-title" className="font-display text-lg font-semibold leading-tight text-ink sm:text-[22px]">
                Set your priorities
              </h2>
              <p className="mt-1 hidden text-[13.5px] leading-snug text-ink-soft sm:block">
                {linkedOpeningName ? <span className="font-medium text-ink">For {linkedOpeningName}. </span> : null}
                Tell us what matters. Must haves filter the pool; everything else shapes the ranking.
              </p>
            </div>
            <Steps stage={stage} onStage={setStage} />
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-[#F3EFE9] hover:text-ink"
            >
              <X size={18} />
            </button>
          </header>

          {/* Body */}
          {stage === 1 ? (
            <div
              className={`flex min-h-0 flex-1 flex-col md:grid ${
                showPanel
                  ? 'md:grid-cols-[minmax(150px,200px)_minmax(0,1fr)] lg:grid-cols-[minmax(150px,200px)_minmax(0,1fr)_auto]'
                  : 'md:grid-cols-[minmax(150px,200px)_minmax(0,1fr)]'
              }`}
            >
              <Sidebar
                view={view}
                onView={setView}
                reqs={reqs}
                total={rows.length}
                onClear={(key) => undoable(`Cleared ${TAB_BY_KEY.get(key)!.noun}`, (rs) => clearTab(rs, key))}
              />
              <div className="flex min-h-0 flex-1 flex-col">
                {tabDef ? (
                  <TabHeader title={tabDef.label} helper={tabDef.helper} />
                ) : (
                  <TabHeader title="Summary" helper="Everything you’ve set, grouped by strength. Drag one to change it, or click it to edit." />
                )}
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-6 sm:px-7">
                  {view === 'summary' ? (
                    <SummaryBoard
                      rows={rows}
                      text={text}
                      onSetLevel={changeLevel}
                      onOpen={setView}
                      onRemove={(r) => undoable(`Removed ${entryName(r)}`, (rs) => removeRow(rs, r.id))}
                      unset={unset}
                    />
                  ) : (
                    <TabBody key={view} tab={view} reqs={reqs} apply={apply} options={options} employers={employers} count={count} />
                  )}
                </div>
              </div>
              {showPanel && (
                <div className="hidden min-h-0 lg:block">
                  <PriorityPanel rows={rows} text={text} onSetLevel={changeLevel} onOpen={setView} />
                </div>
              )}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7">
              <div className="mx-auto max-w-2xl space-y-3">
                <h3 className="font-display text-[19px] font-semibold text-ink">Match to a job description</h3>
                <p className="text-[13.5px] leading-snug text-ink-soft">
                  Each expert gets a Fit score against the job description, combined with your{' '}
                  {rows.length > 0 ? (
                    <button type="button" onClick={() => goTo('summary')} className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2">
                      {rows.length} priorit{rows.length === 1 ? 'y' : 'ies'}
                    </button>
                  ) : (
                    'priorities'
                  )}
                  . Placeholder scorer this build — the real engine drops in behind the same interface.
                </p>
                <JdStep
                  text={jd.text}
                  onText={jd.setText}
                  collapsed={jd.collapsed}
                  onEdit={() => jd.setCollapsed(false)}
                  onRead={readJd}
                  reading={jd.reading}
                />
                {jd.extracted &&
                  (suggested.length > 0 ? (
                    <p className="text-[12.5px] leading-snug text-ink-soft">
                      Added to your priorities at Nice to have, from your JD:{' '}
                      <span className="font-medium text-ink">
                        {suggested.map((s) => (s.kind === 'location' ? locationLabel(s.value) : s.value)).join(', ')}
                      </span>
                      .{' '}
                      <button
                        type="button"
                        onClick={() => apply((rs) => clearJdSuggestions(rs, jd.extracted))}
                        className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-600"
                      >
                        Clear suggestions
                      </button>
                    </p>
                  ) : (
                    <p className="text-[12.5px] leading-snug text-ink-faint">Read. No places or languages from this JD to add.</p>
                  ))}
              </div>
            </div>
          )}

          {/* Undo toast */}
          <div className="pointer-events-none absolute inset-x-0 bottom-[120px] z-20 flex justify-center px-4 sm:bottom-[84px]">
            <AnimatePresence>
              {undo && (
                <motion.div
                  key="undo"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-ink py-2 pl-4 pr-2 text-sm text-white shadow-lg"
                  role="status"
                >
                  <span className="min-w-0 truncate">{undo.text}</span>
                  <button type="button" onClick={restore} className="shrink-0 rounded-full px-2.5 py-1 font-semibold text-gold-300 hover:bg-white/10">
                    Undo
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <footer className="flex shrink-0 flex-wrap items-center gap-x-3.5 gap-y-2.5 border-t border-line bg-[#FCFBF9] px-4 py-3 sm:flex-nowrap sm:px-6 sm:py-3.5">
            {stage === 1 ? (
              <button
                type="button"
                onClick={() => undoable('Cleared all priorities', () => [])}
                disabled={reqs.length === 0}
                className="order-1 text-sm text-ink-soft underline underline-offset-[3px] hover:text-ink disabled:cursor-default disabled:no-underline disabled:opacity-40"
              >
                Clear all
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStage(1)}
                className="order-1 flex items-center gap-0.5 text-sm font-medium text-ink-soft hover:text-ink"
              >
                <ChevronLeft size={16} aria-hidden /> Back to priorities
              </button>
            )}
            <div className="order-3 w-full min-w-0 sm:order-2 sm:w-auto sm:flex-1">
              <PoolPreview
                {...pool}
                poolSize={poolSize}
                ranking={ranksAnything || stage === 2}
                onFocusRow={(r) => {
                  const tab = tabOf(r.kind)
                  if (tab) goTo(tab)
                }}
              />
              {stage === 2 && jdBlocker && <p className="mt-0.5 text-xs text-ink-faint">{jdBlocker}</p>}
            </div>
            <div className="order-2 ml-auto flex items-center gap-2 sm:order-3 sm:ml-0">
              {stage === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setStage(2)}
                    className="hidden h-11 items-center whitespace-nowrap rounded-full border border-[#D5CFC4] bg-white px-5 text-[14.5px] font-medium text-ink hover:border-ink-faint sm:flex"
                  >
                    Match to a Job Description
                  </button>
                  <button
                    type="button"
                    onClick={() => setStage(2)}
                    className="flex h-11 items-center whitespace-nowrap rounded-full border border-[#D5CFC4] bg-white px-4 text-sm font-medium text-ink hover:border-ink-faint sm:hidden"
                  >
                    Add a JD
                  </button>
                  <button
                    type="button"
                    disabled={running || (pool.mustCount > 0 && pool.count === 0)}
                    onClick={() => commit('preferences')}
                    className="flex h-11 items-center whitespace-nowrap rounded-full bg-brand-500 px-5 text-[14.5px] font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
                  >
                    {running ? 'Ranking…' : 'See my matches'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={running || !!jdBlocker}
                  onClick={() => commit('jd')}
                  className="flex h-11 items-center whitespace-nowrap rounded-full bg-brand-500 px-6 text-[14.5px] font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {running ? 'Ranking…' : 'See your matches'}
                </button>
              )}
            </div>
          </footer>

          {/* Discard confirmation */}
          {confirming && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink/30 p-4" onMouseDown={(e) => e.target === e.currentTarget && setConfirming(false)}>
              <div role="alertdialog" aria-labelledby="discard-title" aria-describedby="discard-body" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
                <h3 id="discard-title" className="font-display text-lg font-semibold text-ink">
                  Discard your priorities?
                </h3>
                <p id="discard-body" className="mt-1.5 text-sm text-ink-soft">
                  The changes you made since opening this won’t be applied.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setConfirming(false)}
                    className="h-10 rounded-full border border-[#D5CFC4] bg-white px-4 text-sm font-medium text-ink hover:border-ink-faint"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirming(false)
                      onClose()
                    }}
                    className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/85"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function Steps({ stage, onStage }: { stage: 1 | 2; onStage: (s: 1 | 2) => void }) {
  const step = (n: 1 | 2, label: string) => {
    const state = stage === n ? 'active' : n < stage ? 'done' : 'pending'
    return (
      <button
        type="button"
        onClick={() => onStage(n)}
        aria-current={stage === n ? 'step' : undefined}
        className="flex items-center gap-2 whitespace-nowrap text-[13px]"
      >
        <span
          className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] text-xs font-semibold ${
            state === 'active'
              ? 'border-brand-500 bg-brand-500 text-white'
              : state === 'done'
                ? 'border-brand-100 bg-brand-100 text-brand-700'
                : 'border-[#D5CFC4] bg-white text-ink-faint'
          }`}
        >
          {state === 'done' ? <Check size={12} strokeWidth={3} /> : n}
        </span>
        <span className={state === 'active' ? 'font-semibold text-ink' : 'text-ink-faint'}>{label}</span>
      </button>
    )
  }
  return (
    <nav aria-label="Steps" className="hidden items-center gap-2.5 self-center md:flex">
      {step(1, 'Priorities')}
      <span aria-hidden className="h-px w-7 bg-[#D5CFC4]" />
      {step(2, 'Job description (optional)')}
    </nav>
  )
}

function Sidebar({
  view,
  onView,
  reqs,
  total,
  onClear,
}: {
  view: View
  onView: (v: View) => void
  reqs: Requirement[]
  total: number
  onClear: (key: TabKey) => void
}) {
  const row = (active: boolean) =>
    `flex h-10 w-full items-center gap-2 whitespace-nowrap rounded-[10px] pl-3.5 pr-2 text-left text-[14.5px] transition-colors ${
      active ? 'bg-white font-semibold text-ink shadow-[0_1px_3px_rgba(34,51,59,.1)]' : 'text-ink hover:bg-white/60'
    }`
  return (
    <nav
      aria-label="Priority areas"
      className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-line bg-paper px-2.5 py-2 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:py-3"
    >
      {TABS.map((t) => {
        const set = tabRows(reqs, t.key).length > 0
        const active = view === t.key
        return (
          <div key={t.key} className="group relative shrink-0 md:w-full">
            <button type="button" onClick={() => onView(t.key)} aria-current={active ? 'page' : undefined} className={`${row(active)} ${set ? 'pr-8' : ''}`}>
              <span className="min-w-0 flex-1 md:truncate">{t.label}</span>
            </button>
            {set && (
              <>
                <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-brand-500 md:group-hover:hidden" />
                <button
                  type="button"
                  onClick={() => onClear(t.key)}
                  aria-label={`Clear ${t.label.toLowerCase()}`}
                  className="absolute right-1.5 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint hover:bg-[#F3EFE9] hover:text-ink focus-visible:flex md:group-hover:flex"
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        )
      })}
      <div aria-hidden className="mx-1 my-1 w-px shrink-0 bg-line md:mx-0 md:my-2.5 md:h-px md:w-auto" />
      <button type="button" onClick={() => onView('summary')} aria-current={view === 'summary' ? 'page' : undefined} className={`${row(view === 'summary')} shrink-0 md:shrink`}>
        <List size={16} className="shrink-0 text-ink-faint" aria-hidden />
        <span className="flex-1">Summary</span>
        <span
          className={`flex h-5 min-w-5 items-center justify-center rounded-[10px] px-1.5 text-xs font-semibold ${
            total > 0 ? 'bg-ink text-white' : 'bg-line text-ink-faint'
          }`}
        >
          {total}
        </span>
      </button>
    </nav>
  )
}
