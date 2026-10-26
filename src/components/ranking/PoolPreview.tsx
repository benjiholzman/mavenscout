import { AlertTriangle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { LIVE_COUNT_DEBOUNCE_MS } from '../../lib/matching/config'
import type { Requirement } from '../../lib/matching/types'
import { entryName } from '../../lib/requirements/priorities'
import { isMust, rowHasValue, type SearchState } from '../../lib/requirements/model'

// The modal footer's live pool preview (match rework spec §2, Step 2), from
// the draft: how many experts meet the Must haves, debounced; at 0 it says
// which Must have to relax, and what that would admit.

export type CountFn = (requirements: Requirement[], search: SearchState) => number

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function useMustHaveCount(requirements: Requirement[], search: SearchState, countFn: CountFn) {
  const reqs = useDebounced(requirements, LIVE_COUNT_DEBOUNCE_MS)
  const s = useDebounced(search, LIVE_COUNT_DEBOUNCE_MS)
  return useMemo(() => {
    const count = countFn(reqs, s)
    const musts = reqs.filter((r) => isMust(r) && rowHasValue(r))
    // At zero: what each Must have would admit if it were relaxed.
    const loosen =
      count === 0
        ? musts
            .map((r) => ({ row: r, admits: countFn(reqs.filter((x) => x.id !== r.id), s) }))
            .filter((l) => l.admits > 0)
            .sort((a, b) => b.admits - a.admits)
        : []
    return { count, mustCount: musts.length, loosen }
  }, [reqs, s, countFn])
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="shrink-0" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
    </svg>
  )
}

export function PoolPreview({
  count,
  mustCount,
  loosen,
  poolSize,
  ranking,
  onFocusRow,
}: ReturnType<typeof useMustHaveCount> & {
  poolSize: number
  /** Whether anything is weighted (Nice to have / Important). */
  ranking: boolean
  onFocusRow: (row: Requirement) => void
}) {
  if (mustCount > 0 && count === 0)
    return (
      <p className="flex min-w-0 items-start gap-1.5 text-[13.5px] leading-snug text-gold-800" aria-live="polite">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          No one meets all your Must haves.
          {loosen.length > 0 && (
            <>
              {' '}Try relaxing{' '}
              {loosen.slice(0, 2).map((l, i) => (
                <span key={l.row.id}>
                  {i > 0 && ' or '}
                  <button
                    type="button"
                    onClick={() => onFocusRow(l.row)}
                    className="font-semibold underline decoration-gold-300 underline-offset-2 hover:decoration-gold-700"
                  >
                    {entryName(l.row)}
                  </button>{' '}
                  (→ {l.admits})
                </span>
              ))}
              .
            </>
          )}
        </span>
      </p>
    )
  const text =
    mustCount > 0
      ? `${count} of ${poolSize} expert${poolSize === 1 ? '' : 's'} meet${count === 1 ? 's' : ''} your Must haves`
      : ranking
        ? `All ${count} expert${count === 1 ? '' : 's'} will be ranked`
        : `${count} expert${count === 1 ? '' : 's'} in the pool`
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-[13.5px] text-ink-soft" aria-live="polite">
      <PersonIcon />
      <span className="truncate">{text}</span>
    </p>
  )
}
