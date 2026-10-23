import { AlertTriangle, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { LIVE_COUNT_DEBOUNCE_MS, LOW_POOL_WARNING } from '../../lib/matching/config'
import type { Requirement } from '../../lib/matching/types'
import { describeRequirement } from '../../lib/requirements/labels'
import { rowHasValue, type SearchState } from '../../lib/requirements/model'

// Live count (match rework spec §2, Step 2): candidates meeting every Required
// row, debounced; at 0 it says which Required rows to loosen (and what each
// would admit); under 5 it warns.

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
    const musts = reqs.filter((r) => r.level === 'must' && rowHasValue(r))
    // At zero: what each Required row would admit if it were removed.
    const loosen =
      count === 0
        ? musts
            .map((r) => ({
              row: r,
              admits: countFn(
                reqs.filter((x) => x.id !== r.id),
                s,
              ),
            }))
            .filter((l) => l.admits > 0)
            .sort((a, b) => b.admits - a.admits)
        : []
    return { count, mustCount: musts.length, loosen }
  }, [reqs, s, countFn])
}

export function LiveCount({
  count,
  mustCount,
  loosen,
  onFocusRow,
}: ReturnType<typeof useMustHaveCount> & { onFocusRow: (id: string) => void }) {
  if (count === 0)
    return (
      <div className="rounded-lg bg-gold-300/20 px-3 py-2 text-xs leading-snug text-ink">
        <p className="flex items-center gap-1.5 font-semibold">
          <AlertTriangle size={13} className="text-gold-700" aria-hidden />
          No candidates meet everything marked Must have
        </p>
        {loosen.length > 0 ? (
          <p className="mt-1 text-ink-soft">
            Loosen one:{' '}
            {loosen.slice(0, 3).map((l, i) => (
              <span key={l.row.id}>
                {i > 0 && ', '}
                <button
                  type="button"
                  onClick={() => onFocusRow(l.row.id)}
                  className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-600"
                >
                  {describeRequirement(l.row)}
                </button>{' '}
                (→ {l.admits})
              </span>
            ))}
          </p>
        ) : (
          <p className="mt-1 text-ink-soft">Loosen more than one Must have, or clear the search term.</p>
        )}
      </div>
    )

  return (
    <div aria-live="polite" className="text-xs leading-snug">
      <p className="flex items-center gap-1.5 font-medium text-ink">
        <Users size={13} className="text-ink-faint" aria-hidden />
        {count} candidate{count === 1 ? '' : 's'}{' '}
        {mustCount > 0 ? `meet${count === 1 ? 's' : ''} everything marked Must have` : 'in the pool — nothing marked Must have'}
      </p>
      {count < LOW_POOL_WARNING && (
        <p className="mt-0.5 text-gold-700">
          That's a small pool — consider loosening a Must have to compare more people.
        </p>
      )}
    </div>
  )
}
