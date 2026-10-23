import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { videoQnaStatus, type VideoQnaStatus } from '../../lib/membership'
import type { Profile } from '../../types/db'

// Membership overview (PRD 7.10; levels per profiles-membership §2): manually
// set Featured Member (is_premium) / subscription_status per profile — the
// admin-settable stand-in for real Stripe billing events. Featured status
// itself starts only once every Video Q&A is in; until then it reads
// "pending videos".

const SUB_STATUSES = ['active', 'past_due', 'canceled', 'paused', 'none'] as const

export function TierOverview() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const [qna, setQna] = useState<Map<string, VideoQnaStatus>>(new Map())

  const load = () =>
    Promise.all([
      supabase.from('profiles').select('*').order('name'),
      supabase.from('video_responses').select('profile_id,kind,question_id').eq('kind', 'question'),
      supabase.from('interview_questions').select('id').eq('active', true),
    ]).then(([p, v, q]) => {
      const rows = (p.data as Profile[]) ?? []
      setQna(new Map(rows.map((r) => [r.id, videoQnaStatus(r.id, v.data ?? [], q.data ?? [])])))
      setProfiles(rows)
    })
  useEffect(() => {
    load()
  }, [])

  if (!profiles) return <p className="text-sm text-ink-faint">Loading…</p>

  const update = async (id: string, patch: Partial<Profile>) => {
    await supabase.from('profiles').update(patch).eq('id', id)
    load()
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
            <th className="py-2 pr-3 font-semibold">Profile</th>
            <th className="py-2 pr-3 font-semibold">Approval</th>
            <th className="py-2 pr-3 font-semibold">Featured Member</th>
            <th className="py-2 pr-3 font-semibold">Verification</th>
            <th className="py-2 font-semibold">Subscription</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id} className="border-b border-line/60">
              <td className="py-2.5 pr-3">
                <p className="font-medium">{p.name || <em className="text-ink-faint">draft</em>}</p>
                <p className="text-xs text-ink-faint">{p.consultant_type}</p>
              </td>
              <td className="py-2.5 pr-3 text-xs">{p.approval_status}</td>
              <td className="py-2.5 pr-3">
                <button
                  role="switch"
                  aria-checked={p.is_premium}
                  aria-label={`Featured Member for ${p.name}`}
                  onClick={() => update(p.id, { is_premium: !p.is_premium })}
                  className={`relative h-5 w-9 rounded-full transition ${p.is_premium ? 'bg-gold-500' : 'bg-line'}`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${p.is_premium ? 'left-[18px]' : 'left-0.5'}`}
                  />
                </button>
                {p.is_premium && qna.get(p.id) && !qna.get(p.id)!.complete && (
                  <span className="ml-2 align-middle text-[11px] text-amber-700">
                    pending videos ({qna.get(p.id)!.answered}/{qna.get(p.id)!.required})
                  </span>
                )}
              </td>
              <td className="py-2.5 pr-3">
                <select
                  value={p.verification_status}
                  onChange={(e) => update(p.id, { verification_status: e.target.value as Profile['verification_status'] })}
                  className="rounded-lg border border-line bg-white px-2 py-1 text-xs"
                >
                  <option value="unverified">unverified</option>
                  <option value="pending">pending</option>
                  <option value="verified">verified</option>
                </select>
              </td>
              <td className="py-2.5">
                <select
                  value={p.subscription_status}
                  onChange={(e) => update(p.id, { subscription_status: e.target.value as Profile['subscription_status'] })}
                  className="rounded-lg border border-line bg-white px-2 py-1 text-xs"
                >
                  {SUB_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
