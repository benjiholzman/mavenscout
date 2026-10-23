import { ChevronRight } from 'lucide-react'
import { KIND_LABELS, LEVEL_LABELS } from '../../lib/requirements/labels'
import { makeRow } from '../../lib/requirements/model'
import { PRIORITY_KEYS, prioritySummary, type PriorityKey } from '../../lib/requirements/priorities'
import type { RequirementsStore } from '../../lib/requirements/store'
import { Switch } from '../ui/Switch'
import { NO_PREFERENCE } from './LevelControl'

// "Your priorities": every priority, one tappable summary line each
// ("Location · Kenya, Ethiopia · Important"), then the two filter-only
// switches. Shared by both tabs.

export function PriorityList({
  store,
  onOpen,
  fromJd,
}: {
  store: RequirementsStore
  onOpen: (key: PriorityKey) => void
  /** Priorities holding values "Read job description" pre-filled. */
  fromJd: Set<PriorityKey>
}) {
  const reqs = store.state.requirements
  const filterOn = (kind: 'video_qna' | 'audio_testimonial') => reqs.some((r) => r.kind === kind)
  const setFilter = (kind: 'video_qna' | 'audio_testimonial', on: boolean) =>
    on ? store.addRow(makeRow(kind)) : store.apply((rs) => rs.filter((r) => r.kind !== kind))

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {PRIORITY_KEYS.map((key) => {
          const s = prioritySummary(key, reqs)
          return (
            <li key={key}>
              <button
                type="button"
                id={`priority-${key}`}
                onClick={() => onOpen(key)}
                className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm hover:bg-paper focus-visible:bg-paper focus-visible:outline-none"
              >
                <span className="line-clamp-2 min-w-0 flex-1">
                  <span className="font-semibold text-ink">{KIND_LABELS[key]}</span>
                  <span className="text-ink-faint"> · </span>
                  <span className={s.none ? 'text-ink-faint' : 'text-ink-soft'}>{s.none ? NO_PREFERENCE : s.value}</span>
                </span>
                {fromJd.has(key) && (
                  <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                    from JD
                  </span>
                )}
                {s.level && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      s.level === 'must' ? 'bg-ink text-white' : 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                    }`}
                  >
                    {LEVEL_LABELS[s.level]}
                  </span>
                )}
                <ChevronRight size={16} className="shrink-0 text-ink-faint" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>

      {/* Filters only: never priorities, never points (profiles-membership §2.2). */}
      <section id="priority-filters">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Only show candidates with…</h4>
        <div className="mt-2 space-y-2.5">
          <Switch checked={filterOn('video_qna')} onChange={(on) => setFilter('video_qna', on)} label="Video Q&As" />
          <Switch
            checked={filterOn('audio_testimonial')}
            onChange={(on) => setFilter('audio_testimonial', on)}
            label="Audio testimonials"
          />
        </div>
        <p className="mt-1.5 text-[11.5px] leading-snug text-ink-faint">Filters only: these never add points.</p>
      </section>
    </div>
  )
}
