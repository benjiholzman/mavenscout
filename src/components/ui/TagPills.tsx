import { TIER_LABELS } from '../../lib/expertise'
import type { ExpertiseTag } from '../../types/db'

/** Expertise tags by tier (profiles-membership §6): Core as prominent chips,
 *  Strong as smaller chips, and Working knowledge (full profile only, so
 *  opt-in here) as plain text chips. */
export function TagPills({ tags, showWorking = false }: { tags: ExpertiseTag[]; showWorking?: boolean }) {
  const core = tags.filter((t) => t.tier === 'core')
  const strong = tags.filter((t) => t.tier === 'strong')
  const working = showWorking ? tags.filter((t) => t.tier === 'working') : []
  return (
    <div className="space-y-3">
      {core.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">{TIER_LABELS.core}</p>
          <div className="flex flex-wrap gap-1.5">
            {core.map((t) => (
              <span key={t.name} className="rounded-full bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white">
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {strong.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">{TIER_LABELS.strong}</p>
          <div className="flex flex-wrap gap-1.5">
            {strong.map((t) => (
              <span key={t.name} className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs text-brand-800">
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {working.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">{TIER_LABELS.working}</p>
          <div className="flex flex-wrap gap-1.5">
            {working.map((t) => (
              <span key={t.name} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink-soft">
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
