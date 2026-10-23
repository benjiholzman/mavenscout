import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import type { Gap } from '../../lib/completeness'
import { fmtDate } from '../../lib/dates'
import { recheckLapsed } from '../../lib/verification/window'
import type { Profile } from '../../types/db'

// What the saved profile still misses against the minimums and maximums
// (spec §7.1) and verification (§3, §10). Drafts fix these before
// submitting; listed profiles seeded before the minimums or verification
// stay listed and see them as warnings. Verification items MavenScout is
// checking are listed separately: they don't block submitting. A listed
// profile in its re-check window sees the deadline.

export function CompletenessPanel({
  gaps,
  listed,
  waiting = [],
  profile,
}: {
  gaps: Gap[]
  listed: boolean
  /** Verification items MavenScout checks next. */
  waiting?: string[]
  profile?: Pick<Profile, 'verification_recheck_until'>
}) {
  const recheck = profile?.verification_recheck_until ?? null
  const deadline = recheck && (
    <p className="flex items-start gap-2 rounded-card border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      {recheckLapsed(profile!) ? (
        <span>
          <strong>Unlisted since {fmtDate(recheck.slice(0, 10))}</strong> until we’ve checked your changed details
          again. Your profile returns as soon as the check is done.
        </span>
      ) : (
        <span>
          <strong>Re-check due by {fmtDate(recheck.slice(0, 10))}.</strong> Something we’d checked changed. Your
          profile stays listed until then; after that it’s unlisted until the check is done.
        </span>
      )}
    </p>
  )
  const waitingList = waiting.length > 0 && (
    <div className="rounded-card border border-line bg-white px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Clock size={15} className="shrink-0 text-brand-500" /> Being checked by MavenScout
      </p>
      <ul className="mt-1.5 space-y-0.5">
        {waiting.map((w) => (
          <li key={w} className="text-sm text-ink-soft">
            <a href="#verification" className="hover:text-ink">
              {w}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )

  if (gaps.length === 0)
    return (
      <div className="space-y-3">
        {deadline}
        <p className="flex items-center gap-2 rounded-card border border-line bg-white px-4 py-3 text-sm text-ink-soft">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          {waiting.length ? 'Nothing left for you to do: every minimum is met.' : 'Your profile meets every minimum.'}
        </p>
        {waitingList}
      </div>
    )
  return (
    <div className="space-y-3">
      {deadline}
      <div className="rounded-card border border-amber-200 bg-amber-50 px-4 py-3.5" role="status">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <AlertTriangle size={16} className="shrink-0" />
          {gaps.length} {gaps.length === 1 ? 'thing' : 'things'} to fix
        </p>
        <p className="mt-0.5 text-xs text-amber-900/80">
          {listed
            ? 'Your profile stays listed. These requirements are newer than your profile; edits can’t take a section further from them.'
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
      {waitingList}
    </div>
  )
}
