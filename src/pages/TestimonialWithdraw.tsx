import { CheckCircle2, Flag, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import lockup from '../assets/mavenscout-lockup-horizontal.svg'
import { fmtDate } from '../lib/dates'
import { loadByWithdrawToken, withdrawTestimonial } from '../lib/testimonials/lifecycle'
import type { AudioTestimonial } from '../types/db'

// /testimonial/withdraw/:token — the referee's own link, from the notice sent
// when their testimonial is published (docs/MavenScout-profiles-membership.md
// §4.4–4.5): withdraw it at any time, or report that it wasn't them. Phone-
// first and unauthenticated like the recording page; the token is only ever
// sent to the referee's confirmed email (mocked in this build).

export default function TestimonialWithdraw() {
  const { token } = useParams()
  const [data, setData] = useState<{ t: AudioTestimonial; consultantName: string } | null>(null)
  const [state, setState] = useState<'loading' | 'invalid' | 'ready' | 'done'>('loading')
  const [reported, setReported] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    loadByWithdrawToken(token).then((d) => {
      setData(d)
      setState(!d ? 'invalid' : d.t.withdrawn_at || d.t.status === 'removed' ? 'done' : 'ready')
    })
  }, [token])

  const act = async (reportNotMe: boolean) => {
    if (!data) return
    const ask = reportNotMe
      ? 'Report that you didn\'t record this? It is taken down straight away and our team investigates.'
      : `Withdraw your testimonial for ${data.consultantName}? The recording is deleted.`
    if (!window.confirm(ask)) return
    setBusy(true)
    try {
      await withdrawTestimonial(data.t, reportNotMe)
      setReported(reportNotMe)
      setState('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const btn = 'flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-base font-medium disabled:opacity-50'
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto max-w-lg px-4 py-3">
          <img src={lockup} alt="MavenScout" className="h-6" />
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 pb-16 pt-6">
        {state === 'loading' && <p className="text-ink-faint">Loading…</p>}
        {state === 'invalid' && (
          <p className="text-ink-soft">This link isn't valid. If you need help, reply to the email it came in.</p>
        )}
        {state === 'done' && (
          <div className="pt-6 text-center">
            <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
            <h1 className="mt-3 text-xl font-semibold">{reported ? 'Thank you for telling us' : 'Your testimonial is withdrawn'}</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
              {reported
                ? "It's been taken down and the recording deleted. Our team will look into how it was made."
                : "It's no longer on MavenScout and the recording is deleted. Nothing else is needed from you."}
            </p>
          </div>
        )}
        {state === 'ready' && data && (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold">Your testimonial for {data.consultantName}</h1>
            <div className="rounded-2xl border border-line bg-white p-4 text-sm text-ink-soft">
              <p className="font-medium text-ink">{data.t.reference_name}</p>
              <p>{[data.t.reference_title, data.t.reference_org].filter(Boolean).join(', ')}</p>
              {data.t.submitted_at && <p className="mt-1 text-xs text-ink-faint">Recorded {fmtDate(data.t.submitted_at)}</p>}
              <p className="mt-2 text-xs text-ink-faint">
                {data.t.status === 'published' ? 'Live on MavenScout. Only verified hiring managers can listen.' : 'Not published yet.'}
              </p>
            </div>
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            <button disabled={busy} onClick={() => act(false)} className={`${btn} border border-line bg-white text-ink hover:border-brand-400`}>
              <Undo2 size={18} /> Withdraw my testimonial
            </button>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-900">Didn't record this?</p>
              <p className="mt-1 text-sm text-red-900/80">
                If someone used your name, tell us. We take it down straight away and investigate.
              </p>
              <button disabled={busy} onClick={() => act(true)} className={`${btn} mt-3 bg-red-600 text-white hover:bg-red-700`}>
                <Flag size={17} /> This wasn't me
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
