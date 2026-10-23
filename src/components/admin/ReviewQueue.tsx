import { Check, Inbox, ShieldCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Profile, VerificationEvidence } from '../../types/db'

// Admin review queue (PRD 7.10/7.20): every submitted profile gets one of
// three outcomes — rejected / approved as a Member / verified as a Featured
// Member. Featured applications (verification_status='pending') surface here too, with their
// evidence (file paths are stubs — only explanations carry real content).

export function ReviewQueue() {
  const [pending, setPending] = useState<Profile[] | null>(null)
  const [evidence, setEvidence] = useState<Map<string, VerificationEvidence[]>>(new Map())

  const load = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or('approval_status.eq.pending,verification_status.eq.pending')
      .order('created_at', { ascending: false })
    const rows = (data as Profile[]) ?? []
    setPending(rows)
    if (rows.length) {
      const { data: ev } = await supabase
        .from('verification_evidence')
        .select('*')
        .in('profile_id', rows.map((p) => p.id))
      const map = new Map<string, VerificationEvidence[]>()
      for (const e of (ev as VerificationEvidence[]) ?? []) {
        map.set(e.profile_id, [...(map.get(e.profile_id) ?? []), e])
      }
      setEvidence(map)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const decide = async (
    p: Profile,
    outcome: 'rejected' | 'approved_standard' | 'verified_premium',
  ) => {
    const patch =
      outcome === 'rejected'
        ? { approval_status: 'rejected', verification_status: 'unverified' }
        : outcome === 'approved_standard'
          ? {
              approval_status: 'approved',
              verification_status: 'unverified',
              is_premium: false,
              // Admin approval stands in for the billing event this build (7.8).
              subscription_status: 'active',
            }
          : {
              approval_status: 'approved',
              verification_status: 'verified',
              is_premium: true,
              subscription_status: 'active',
            }
    await supabase.from('profiles').update(patch).eq('id', p.id)
    load()
  }

  if (!pending) return <p className="text-sm text-ink-faint">Loading…</p>
  if (pending.length === 0)
    return (
      <div className="flex flex-col items-center rounded-card border border-dashed border-line py-14 text-center">
        <Inbox size={24} className="text-ink-faint/60" />
        <p className="mt-3 text-sm font-medium text-ink-soft">All clear</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          New profile submissions and Featured Member applications land here for review.
        </p>
      </div>
    )

  return (
    <div className="space-y-4">
      {pending.map((p) => (
        <div key={p.id} className="rounded-card border border-line bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">
                {p.name || <em className="text-ink-faint">Unnamed draft</em>}{' '}
                <span className="text-xs font-normal text-ink-faint">
                  {p.consultant_type} · {p.handle}
                </span>
              </p>
              <p className="mt-0.5 text-sm text-ink-soft">{p.headline || '—'}</p>
              <p className="mt-1 text-xs text-ink-faint">
                {p.approval_status === 'pending' ? 'New profile submission' : 'Featured Member application'}
                {' · '}
                <Link to={`/profile/${p.handle}`} className="text-brand-600">
                  preview profile
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => decide(p, 'rejected')}
                className="flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                <X size={13} /> Reject
              </button>
              <button
                onClick={() => decide(p, 'approved_standard')}
                className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-ink-faint"
              >
                <Check size={13} /> Approve — Member
              </button>
              <button
                onClick={() => decide(p, 'verified_premium')}
                className="flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/85"
              >
                <ShieldCheck size={13} className="text-gold-300" /> Verify — Featured Member
              </button>
            </div>
          </div>
          {(evidence.get(p.id) ?? []).length > 0 && (
            <div className="mt-3 rounded-lg bg-paper p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Verification evidence ({evidence.get(p.id)!.length})
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {evidence.get(p.id)!.map((e) => (
                  <li key={e.id} className="text-sm text-ink-soft">
                    <span className="font-medium">{e.file_path.split('/').pop()}</span>
                    <span className="text-xs text-ink-faint"> (file stubbed, not stored)</span> —{' '}
                    {e.explanation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
