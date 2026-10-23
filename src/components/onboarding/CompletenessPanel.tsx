import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Gap } from '../../lib/completeness'

// What the saved profile still misses against the minimums and maximums
// (spec §7.1). Drafts fix these before submitting; listed profiles seeded
// before the minimums stay listed and see them as warnings.

export function CompletenessPanel({ gaps, listed }: { gaps: Gap[]; listed: boolean }) {
  if (gaps.length === 0)
    return (
      <p className="flex items-center gap-2 rounded-card border border-line bg-white px-4 py-3 text-sm text-ink-soft">
        <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
        Your profile meets every minimum.
      </p>
    )
  return (
    <div className="rounded-card border border-amber-200 bg-amber-50 px-4 py-3.5" role="status">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertTriangle size={16} className="shrink-0" />
        {gaps.length} {gaps.length === 1 ? 'thing' : 'things'} to fix
      </p>
      <p className="mt-0.5 text-xs text-amber-900/80">
        {listed
          ? 'Your profile stays listed. These minimums are newer than your profile; edits can’t take a section further from them.'
          : 'Fix these before submitting your profile for review. You can save sections while you build it up.'}
      </p>
      <ul className="mt-2 space-y-1">
        {gaps.map((g) => (
          <li key={g.message} className="text-sm">
            <a href={`#${g.section}`} className="text-amber-950 underline decoration-amber-400 underline-offset-2 hover:decoration-amber-700">
              {g.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
