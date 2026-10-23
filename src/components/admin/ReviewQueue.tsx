import { Check, Inbox, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { completenessGaps, type Gap } from '../../lib/completeness'
import { fmtDate } from '../../lib/dates'
import { MEMBERSHIP_LABELS } from '../../lib/membership'
import { loadOrgIndex } from '../../lib/organizations'
import { supabase } from '../../lib/supabase'
import { verificationState, type VerificationState } from '../../lib/verification/state'
import type { AudioTestimonial, Profile, VerificationCheck, VerificationEvidence } from '../../types/db'

// Admin review queue (PRD 7.10; profiles-membership §7.1): new profiles wait
// here. Approve needs the profile submitted and every minimum met, including
// a published audio testimonial on an employer entry (spec §4.1); Reject is
// always available. The membership level is the consultant's own choice.
// Approve also needs verification passed (spec §10): identity, most recent
// employer, most recent degree and every certification labelled. Those are
// checked in the Verification tab.

export function ReviewQueue() {
  const [pending, setPending] = useState<Profile[] | null>(null)
  const [gaps, setGaps] = useState<Map<string, Gap[]>>(new Map())
  const [verification, setVerification] = useState<Map<string, VerificationState>>(new Map())

  const load = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('approval_status', 'pending')
      .order('submitted_at', { ascending: true, nullsFirst: false })
    const rows = (data as Profile[]) ?? []
    const counts = new Map<string, number>()
    const testimonials = new Map<string, AudioTestimonial[]>()
    if (rows.length) {
      const ids = rows.map((p) => p.id)
      const [{ data: items }, { data: audio }, { data: checks }, { data: evidence }, orgs] = await Promise.all([
        supabase.from('portfolio_items').select('profile_id').in('profile_id', ids),
        supabase.from('audio_testimonials').select('*').in('profile_id', ids),
        supabase.from('verification_checks').select('*').in('profile_id', ids),
        supabase.from('verification_evidence').select('*').in('profile_id', ids),
        loadOrgIndex(),
      ])
      for (const it of items ?? []) counts.set(it.profile_id, (counts.get(it.profile_id) ?? 0) + 1)
      for (const t of (audio as AudioTestimonial[]) ?? [])
        testimonials.set(t.profile_id, [...(testimonials.get(t.profile_id) ?? []), t])
      setVerification(
        new Map(
          rows.map((p) => [
            p.id,
            verificationState({
              profile: p,
              checks: ((checks as VerificationCheck[]) ?? []).filter((c) => c.profile_id === p.id),
              evidence: ((evidence as VerificationEvidence[]) ?? []).filter((e) => e.profile_id === p.id),
              testimonials: testimonials.get(p.id) ?? [],
              orgs,
            }),
          ]),
        ),
      )
    }
    // Featured status isn't known here, so portfolio counts use the Member
    // limits, the ones every new profile starts from.
    setGaps(new Map(rows.map((p) => [p.id, completenessGaps({ profile: p, portfolioCount: counts.get(p.id) ?? 0, testimonials: testimonials.get(p.id) ?? [] })])))
    setPending(rows)
  }
  useEffect(() => {
    load()
  }, [])

  const decide = async (p: Profile, outcome: 'rejected' | 'approved') => {
    const patch =
      outcome === 'rejected'
        ? { approval_status: 'rejected' }
        : // Admin approval stands in for the billing event this build.
          { approval_status: 'approved', subscription_status: 'active' }
    await supabase.from('profiles').update(patch).eq('id', p.id)
    load()
  }

  if (!pending) return <p className="text-sm text-ink-faint">Loading…</p>
  if (pending.length === 0)
    return (
      <div className="flex flex-col items-center rounded-card border border-dashed border-line py-14 text-center">
        <Inbox size={24} className="text-ink-faint/60" />
        <p className="mt-3 text-sm font-medium text-ink-soft">All clear</p>
        <p className="mt-0.5 text-xs text-ink-faint">New profiles land here for review.</p>
      </div>
    )

  return (
    <div className="space-y-4">
      {pending.map((p) => {
        const missing = gaps.get(p.id) ?? []
        const v = verification.get(p.id)
        const unchecked = v ? [...v.missing, ...v.required.filter((i) => i.status !== 'labelled').map((i) => `${i.title}: ${i.summary}`)] : []
        const blocker = !p.submitted_at
          ? 'Not submitted yet'
          : missing.length > 0
            ? 'Below the profile minimums'
            : !v?.passed
              ? 'Verification isn’t complete'
              : null
        return (
          <div key={p.id} className="rounded-card border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {p.name || <em className="text-ink-faint">Unnamed draft</em>}{' '}
                  <span className="text-xs font-normal text-ink-faint">
                    {MEMBERSHIP_LABELS[p.is_premium ? 'featured' : 'member']} · {p.handle}
                  </span>
                </p>
                <p className="mt-0.5 text-sm text-ink-soft">{p.headline || '—'}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  {p.submitted_at ? `Submitted ${fmtDate(p.submitted_at.slice(0, 10))}` : 'Draft — not submitted yet'}
                  {' · '}
                  <Link to={`/profile/${p.handle}`} className="text-brand-600">
                    preview profile
                  </Link>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => decide(p, 'rejected')}
                  className="flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  <X size={13} /> Reject
                </button>
                <button
                  onClick={() => decide(p, 'approved')}
                  disabled={!!blocker}
                  title={blocker ?? undefined}
                  className="flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Check size={13} /> Approve
                </button>
              </div>
            </div>
            {unchecked.length > 0 && (
              <div className="mt-3 rounded-lg bg-paper p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Not verified yet ({unchecked.length}) · check them in the Verification tab
                </p>
                <ul className="mt-1.5 space-y-0.5 text-sm text-ink-soft">
                  {unchecked.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </div>
            )}
            {missing.length > 0 && (
              <div className="mt-3 rounded-lg bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                  Below the minimums ({missing.length})
                </p>
                <ul className="mt-1.5 space-y-0.5 text-sm text-amber-950">
                  {missing.map((g) => (
                    <li key={g.message}>{g.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
