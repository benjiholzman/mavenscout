import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fmtDate } from '../../lib/dates'
import { MEMBERSHIP_LABELS, type VideoQnaStatus } from '../../lib/membership'
import { testimonialRequired } from '../../lib/testimonials/rules'
import type { Profile } from '../../types/db'

// Membership level and review (spec §2, §7.1, §10): choose Member or Featured
// Member, then submit for review once every minimum is met. Choosing a level
// is a scaffold for checkout: it sets is_premium directly and no payment is
// taken (Billing shows the fee). Featured status itself starts once all the
// Video Q&As are in. Where Featured needs an audio testimonial and Member
// doesn't (config TESTIMONIAL_REQUIRED), a listed Member publishes one before
// switching, so a listed Featured Member always has one.

const LEVELS = [
  {
    premium: false,
    label: MEMBERSHIP_LABELS.member,
    points: ['3 portfolio projects · 2 social links', 'Up to 1 audio testimonial', 'Listed once verified'],
  },
  {
    premium: true,
    label: MEMBERSHIP_LABELS.featured,
    points: [
      'Up to 10 projects · 5 social links · custom domain',
      'All 5 Video Q&As and an audio testimonial (required) · more testimonials',
      'Shown first while browsing · gold card. Never affects ranking',
    ],
  },
]

export function MembershipSection({
  profile,
  gapCount,
  videoQnas,
  hasEmployerTestimonial,
  save,
}: {
  profile: Profile
  gapCount: number
  videoQnas: VideoQnaStatus | null
  /** A published audio testimonial on an employer entry. */
  hasEmployerTestimonial: boolean
  save: (patch: Partial<Profile>) => Promise<string | null>
}) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (patch: Partial<Profile>) => {
    setBusy(true)
    setError(await save(patch))
    setBusy(false)
  }

  // Drafts can switch freely: the completeness panel holds Submit instead.
  const needsTestimonialFirst = (premium: boolean) =>
    profile.approval_status === 'approved' &&
    !hasEmployerTestimonial &&
    testimonialRequired({ is_premium: premium }) &&
    !testimonialRequired(profile)

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {LEVELS.map((l) => {
          const chosen = profile.is_premium === l.premium
          const blocked = !chosen && needsTestimonialFirst(l.premium)
          return (
            <button
              key={l.label}
              type="button"
              disabled={busy || chosen || blocked}
              onClick={() => run({ is_premium: l.premium })}
              aria-pressed={chosen}
              className={`rounded-xl border p-4 text-left transition ${
                chosen
                  ? l.premium
                    ? 'border-2 border-gold-500 bg-white'
                    : 'border-2 border-brand-500 bg-white'
                  : 'border-line bg-paper/60 hover:border-ink-faint disabled:cursor-not-allowed disabled:hover:border-line'
              }`}
            >
              <p className="flex items-center gap-1.5 font-display font-semibold">
                {l.premium && <Sparkles size={15} className="text-gold-500" />}
                {l.label}
              </p>
              <p className="mt-0.5 text-xs text-ink-faint">
                {chosen
                  ? 'Your level'
                  : blocked
                    ? 'Publish an audio testimonial on an employer entry first'
                    : 'Choose this level'}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                {l.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-ink-faint">
        Demo build: changing level takes no payment; see{' '}
        <Link to="/billing" className="font-medium text-brand-600">
          Billing
        </Link>{' '}
        for the fee.
        {profile.is_premium &&
          videoQnas &&
          !videoQnas.complete &&
          ` Featured status starts once all ${videoQnas.required} Video Q&As are in (${videoQnas.answered} so far); until then you're listed as a Member.`}
      </p>

      <div className="border-t border-line pt-4">
        <p className="text-sm font-medium">Review</p>
        {profile.approval_status === 'approved' ? (
          <p className="mt-1 text-sm text-ink-soft">Your profile is approved. Edits publish immediately.</p>
        ) : profile.approval_status === 'rejected' ? (
          <p className="mt-1 text-sm text-red-700">Not approved — contact support.</p>
        ) : profile.submitted_at ? (
          <p className="mt-1 text-sm text-ink-soft">
            Submitted on {fmtDate(profile.submitted_at.slice(0, 10))} — an admin reviews it next.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || gapCount > 0}
              onClick={() => run({ submitted_at: new Date().toISOString() })}
              className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit for review
            </button>
            <span className="text-xs text-ink-faint">
              {gapCount > 0
                ? `Fix the ${gapCount} ${gapCount === 1 ? 'item' : 'items'} in the list at the top first.`
                : 'Every minimum is met.'}
            </span>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
