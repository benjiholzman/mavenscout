import { Check, Minus, Pause, Play, Sparkles, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEditorProfile } from '../hooks/useEditorProfile'
import { fmtDate } from '../lib/dates'
import { isFeaturedPending, MEMBERSHIP_LABELS, membershipLevel, type MembershipLevel } from '../lib/membership'
import { useSession } from '../lib/session'
import { TESTIMONIAL_MATRIX, TESTIMONIAL_REQUIREMENT_LINE } from '../lib/testimonials/copy'
import type { SubscriptionStatus } from '../types/db'

// /billing (PRD 7.9b; levels per profiles-membership §2) — SCAFFOLD: no live
// Stripe. Pause/cancel/resume drive `subscription_status` directly for demo
// realism (cancel → profile unpublishes; resume → republishes) since that
// field already gates visibility app-wide. The Subscribe action is
// deliberately non-functional; real Stripe Checkout + webhook sync is the
// developer's integration, after which these buttons stop writing the field
// directly. Prices are sample values (commercial settings, spec §12).

const PRICES: Record<MembershipLevel, { month: string; amount: string }> = {
  member: { month: '$12/month (sample price)', amount: '$12.00' },
  featured: { month: '$29/month (sample price)', amount: '$29.00' },
}

/** Spec §2.2. Membership never changes AI rank. */
const MATRIX: { label: string; member: string | boolean; featured: string | boolean }[] = [
  { label: 'Portfolio items', member: 'Exactly 3', featured: '3 to 10' },
  { label: 'Audio testimonials', ...TESTIMONIAL_MATRIX },
  { label: 'Video Q&As (all 5 standard questions)', member: false, featured: 'Required' },
  { label: 'Video Q&A tab on your profile', member: false, featured: true },
  { label: 'Social / account links', member: '2', featured: '5' },
  { label: 'Custom domain for your personal site', member: false, featured: true },
  { label: 'Placement while browsing (no ranking)', member: 'Normal', featured: 'Shown first' },
  { label: 'Featured badge + gold card border', member: false, featured: true },
  { label: 'Effect on AI ranking', member: 'None', featured: 'None' },
]

/** Both levels (spec §2.1). */
const SHARED = [
  'Full verification: identity, most recent employer and degree, every certification',
  ...(TESTIMONIAL_REQUIREMENT_LINE ? [TESTIMONIAL_REQUIREMENT_LINE] : []),
  'Expertise: 3 Core, 5 Strong, up to 10 Working knowledge',
  'The same flip-card faces in the directory',
  'Your personal website, with a small "Listed on MavenScout" footer',
]

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled — profile unlisted',
  paused: 'Paused — profile unlisted',
  none: 'No subscription',
}

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check size={15} className="mx-auto text-brand-600" />
  if (value === false) return <Minus size={14} className="mx-auto text-ink-faint/50" />
  return <span>{value}</span>
}

export default function Billing() {
  const { role } = useSession()
  const { profile, save, videoQnas } = useEditorProfile()
  const [message, setMessage] = useState<string | null>(null)

  if (role !== 'consultant')
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Billing applies to consultant/firm accounts — hiring accounts are free. Use the dev
          role switcher to view as a consultant.
        </p>
      </div>
    )
  if (!profile) return <p className="mx-auto max-w-3xl px-4 py-16 text-ink-faint">Loading…</p>

  const status = profile.subscription_status
  const level = membershipLevel(profile)
  const pending = isFeaturedPending(profile)

  const setStatus = async (next: SubscriptionStatus, note: string) => {
    const err = await save({ subscription_status: next })
    setMessage(err ?? note)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-semibold">Billing</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Demo build: payments aren't wired — subscription controls below drive the real
        publication logic, but no money moves.
      </p>

      {/* Current status */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Current plan</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {MEMBERSHIP_LABELS[profile.is_premium ? 'featured' : 'member']}
            <span
              className={`ml-2.5 align-middle text-xs font-medium ${
                status === 'active' ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {STATUS_LABELS[status]}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-ink-faint">
            {PRICES[level].month} · profile:{' '}
            <Link to={`/profile/${profile.handle}`} className="text-brand-600">/{profile.handle}</Link>
          </p>
          {pending && (
            // Featured starts (and its fee) once every Video Q&A is in (§2.2).
            <p className="mt-2 max-w-md rounded-lg bg-amber-50 px-3 py-2 text-xs text-gold-800">
              Featured status starts when all {videoQnas?.required ?? 5} Video Q&As are in
              {videoQnas ? ` (${videoQnas.answered} of ${videoQnas.required} so far)` : ''}. Until
              then your profile shows as a Member and is billed as one.{' '}
              <Link to="/onboarding#media" className="font-medium underline">
                Record your videos
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {status === 'active' && (
            <>
              <button
                onClick={() => setStatus('paused', 'Subscription paused — your profile is now unlisted until you resume.')}
                className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-ink-faint"
              >
                <Pause size={14} /> Pause
              </button>
              <button
                onClick={() => setStatus('canceled', 'Subscription canceled — your profile is now unlisted. Resume any time.')}
                className="flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                <XCircle size={14} /> Cancel
              </button>
            </>
          )}
          {(status === 'paused' || status === 'canceled' || status === 'none') && (
            <button
              onClick={() => setStatus('active', 'Subscription resumed — your profile is listed again.')}
              className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <Play size={14} /> Resume
            </button>
          )}
        </div>
      </div>
      {message && (
        <p className="mt-2 rounded-lg bg-brand-50 px-3.5 py-2.5 text-sm text-ink-soft">{message}</p>
      )}

      {/* Tier matrix — feature labels wrap so the two tier columns stay
          on-screen even at phone width (no horizontal scroll). */}
      <div className="mt-8 rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="px-3 py-3 font-semibold sm:px-4">Feature</th>
              <th className={`w-20 px-1 py-3 text-center font-semibold sm:w-28 sm:px-4 ${level === 'member' ? 'text-brand-700' : ''}`}>
                {MEMBERSHIP_LABELS.member}
              </th>
              <th className={`w-20 px-1 py-3 text-center font-semibold sm:w-28 sm:px-4 ${level === 'featured' ? 'text-gold-700' : ''}`}>
                <span className="inline-flex items-center gap-1">
                  <Sparkles size={13} className="hidden shrink-0 text-gold-500 sm:inline" /> {MEMBERSHIP_LABELS.featured}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((row) => (
              <tr key={row.label} className="border-b border-line/60 last:border-0">
                <td className="px-3 py-2.5 text-xs leading-snug text-ink-soft sm:px-4 sm:text-sm">{row.label}</td>
                <td className="px-1 py-2.5 text-center text-xs sm:px-4 sm:text-sm"><Cell value={row.member} /></td>
                <td className="px-1 py-2.5 text-center text-xs sm:px-4 sm:text-sm"><Cell value={row.featured} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/50 px-4 py-3">
          <div className="text-xs text-ink-faint">
            <p className="font-medium text-ink-soft">Both levels include</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {SHARED.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="mt-2">
              Featured Members are listed as Members straight away; Featured status and the higher
              fee start once all 5 Video Q&As are in.
            </p>
          </div>
          <button
            disabled
            title="Coming soon — payments are wired by the developer (Stripe Checkout)"
            className="cursor-not-allowed rounded-full bg-ink/30 px-5 py-2 text-sm font-medium text-white"
          >
            Subscribe — coming soon
          </button>
        </div>
      </div>

      {/* Billing history — stub */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold">Billing history</h2>
        <p className="mt-0.5 text-xs text-ink-faint">
          Sample rows — real history arrives with the Stripe integration.
        </p>
        <div className="mt-3 overflow-hidden rounded-card border border-line bg-white">
          {[2, 1, 0].map((monthsAgo) => {
            const d = new Date()
            d.setMonth(d.getMonth() - monthsAgo)
            return (
              <div
                key={monthsAgo}
                className="flex items-center justify-between border-b border-line/60 px-4 py-2.5 text-sm last:border-0"
              >
                <span className="text-ink-soft">
                  {MEMBERSHIP_LABELS[level]} membership —{' '}
                  {fmtDate(d.toISOString().slice(0, 10))}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-medium">{PRICES[level].amount}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    sample
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
