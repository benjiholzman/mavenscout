import { ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../types/db'
import { TextArea } from './fields'

// Membership level + Featured Member application (PRD 7.3/7.20; the
// application is removed later in this branch, profiles-membership §2.2):
// 1-3 evidence items (file + explanation) go to admin vetting.
//
// ⚠ EVIDENCE STORAGE IS STUBBED (PRD 7.20 security note): evidence files are
// payslips/employment letters — the most sensitive data in the app. The file
// input here reads a filename only; NOTHING is uploaded or persisted beyond a
// placeholder path + the text explanation. The developer's security pass
// designs real storage (private bucket, retention, access control).

interface EvidenceDraft {
  filename: string | null
  explanation: string
}

export function TierSection({
  profile,
  onApplied,
}: {
  profile: Profile
  onApplied: () => void
}) {
  const [evidence, setEvidence] = useState<EvidenceDraft[]>([{ filename: null, explanation: '' }])
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  if (profile.is_premium)
    return (
      <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-4">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand-600" />
        <p className="text-sm text-ink-soft">
          This profile is a <strong>Featured Member</strong>
          {profile.verification_status === 'verified' && ' and Verified'} — shown first while
          browsing, gold card, the 5 Video Q&As, up to 10 portfolio items, 5 social links and a
          custom domain.
        </p>
      </div>
    )

  if (profile.verification_status === 'pending' || state === 'done')
    return (
      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        Featured Member application submitted — an admin reviews your evidence and, if it passes
        vetting, grants Featured Member features and the Verified badge. Check back after review
        (or use the admin panel in this demo build).
      </div>
    )

  const submit = async () => {
    const complete = evidence.filter((e) => e.explanation.trim())
    if (complete.length === 0) {
      setMessage('Add at least one evidence item with an explanation.')
      setState('error')
      return
    }
    setState('submitting')
    // STUB: placeholder path only — no real file persisted (see header note).
    const rows = complete.map((e, i) => ({
      profile_id: profile.id,
      file_path: `STUB/not-persisted/${e.filename ?? `evidence-${i + 1}`}`,
      explanation: e.explanation.trim(),
    }))
    const { error: evErr } = await supabase.from('verification_evidence').insert(rows)
    if (evErr) {
      setMessage(evErr.message)
      setState('error')
      return
    }
    const { error: pErr } = await supabase
      .from('profiles')
      .update({ verification_status: 'pending' })
      .eq('id', profile.id)
    if (pErr) {
      setMessage(pErr.message)
      setState('error')
      return
    }
    setState('done')
    onApplied()
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line p-4">
          <p className="font-display font-semibold">Member</p>
          <p className="mt-1 text-xs text-ink-faint">Current tier</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            <li>1 audio testimonial</li>
            <li>3 portfolio items · 2 social links</li>
          </ul>
        </div>
        <div className="rounded-xl border-2 border-gold-500 p-4">
          <p className="flex items-center gap-1.5 font-display font-semibold">
            <Sparkles size={15} className="text-gold-500" /> Featured Member — apply with evidence
          </p>
          <p className="mt-1 text-xs text-ink-faint">Vetted, not just paid</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            <li>Shown first while browsing · gold card</li>
            <li>The 5 Video Q&As · more testimonials</li>
            <li>Up to 10 portfolio items · 5 links · custom domain</li>
          </ul>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium">Evidence of prominent industry experience (1–3 items)</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          An employment letter, payslip, email screenshot — anything demonstrating your track
          record. An admin makes a judgment call. <strong>Demo build: files are NOT uploaded or
          stored</strong> — only the filename and your explanation are recorded; real secure
          storage is a developer hardening-pass item.
        </p>
        <div className="mt-3 space-y-3">
          {evidence.map((ev, i) => (
            <div key={i} className="rounded-xl border border-line bg-paper/60 p-3.5">
              <input
                type="file"
                onChange={(e) =>
                  setEvidence(
                    evidence.map((x, j) =>
                      j === i ? { ...x, filename: e.target.files?.[0]?.name ?? null } : x,
                    ),
                  )
                }
                className="block w-full text-xs text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand-700"
              />
              {ev.filename && (
                <p className="mt-1 text-xs text-ink-faint">
                  {ev.filename} — <em>not persisted (stub)</em>
                </p>
              )}
              <div className="mt-2">
                <TextArea
                  label="What does this show?"
                  rows={2}
                  value={ev.explanation}
                  onChange={(v) =>
                    setEvidence(evidence.map((x, j) => (j === i ? { ...x, explanation: v } : x)))
                  }
                />
              </div>
            </div>
          ))}
        </div>
        {evidence.length < 3 && (
          <button
            onClick={() => setEvidence([...evidence, { filename: null, explanation: '' }])}
            className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            + Add evidence item ({evidence.length}/3)
          </button>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={submit}
            disabled={state === 'submitting'}
            className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-ink/85 disabled:opacity-50"
          >
            {state === 'submitting' ? 'Submitting…' : 'Apply as a Featured Member'}
          </button>
          {state === 'error' && <span className="text-sm text-red-600">{message}</span>}
        </div>
      </div>
    </div>
  )
}
