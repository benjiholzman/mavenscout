import { Check, Inbox, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fmtDate } from '../../lib/dates'
import { ACCOUNT_STATUS_LABELS, decideException } from '../../lib/managers'
import { DEMO_ADMIN_NAME } from '../../lib/session'
import { supabase } from '../../lib/supabase'
import type { HiringManager } from '../../types/db'

// Hiring-manager accounts (docs/MavenScout-profiles-membership.md §9):
// exception requests from hirers without an institutional email, approved or
// declined by hand (target: within a day), then every account and its state.

export function ManagersAdmin() {
  const [rows, setRows] = useState<HiringManager[] | null>(null)

  const load = async () => {
    const { data } = await supabase.from('hiring_managers').select('*').order('created_at', { ascending: false })
    setRows((data as HiringManager[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  if (!rows) return <p className="text-sm text-ink-faint">Loading…</p>
  const requests = rows
    .filter((r) => r.account_status === 'exception_pending')
    .sort((a, b) => (a.exception_requested_at ?? '').localeCompare(b.exception_requested_at ?? ''))

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-lg font-semibold">Account requests</h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          Hirers without a work email at a listed organization. They’re told to expect an answer within a day.
        </p>
        <div className="mt-4 space-y-4">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center rounded-card border border-dashed border-line py-10 text-center">
              <Inbox size={22} className="text-ink-faint/60" />
              <p className="mt-2 text-sm font-medium text-ink-soft">No requests waiting</p>
            </div>
          ) : (
            requests.map((r) => <RequestCard key={r.id} hm={r} onDecided={load} />)
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">All accounts ({rows.length})</h2>
        <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-white">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{r.name || <em className="text-ink-faint">No name</em>}</p>
                <p className="truncate text-xs text-ink-faint">
                  {[r.email, r.organization].filter(Boolean).join(' · ') || 'No email on file (seeded demo account)'}
                </p>
              </div>
              <div className="text-right text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    r.account_status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
                  }`}
                >
                  {ACCOUNT_STATUS_LABELS[r.account_status]}
                </span>
                <p className="mt-1 text-ink-faint">
                  {r.email_confirmed_at
                    ? `Email confirmed ${fmtDate(r.email_confirmed_at.slice(0, 10))}`
                    : r.exception_decided_at
                      ? `Request ${r.account_status === 'active' ? 'approved' : 'declined'} by ${r.exception_decided_by}`
                      : r.account_status === 'active'
                        ? 'Created before sign-up checks (016)'
                        : 'Email not confirmed'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function RequestCard({ hm, onDecided }: { hm: HiringManager; onDecided: () => void }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const decide = async (approve: boolean) => {
    setBusy(true)
    await decideException(hm, approve, note, DEMO_ADMIN_NAME)
    setBusy(false)
    onDecided()
  }
  return (
    <div className="rounded-card border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {hm.name} <span className="text-sm font-normal text-ink-soft">· {hm.organization}</span>
          </p>
          <p className="mt-0.5 break-all text-sm text-ink-soft">{hm.email}</p>
          {hm.exception_website && (
            <a
              href={/^https?:\/\//i.test(hm.exception_website) ? hm.exception_website : `https://${hm.exception_website}`}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-0.5 block break-all text-xs text-brand-600"
            >
              {hm.exception_website}
            </a>
          )}
          {hm.exception_requested_at && (
            <p className="mt-1 text-xs text-ink-faint">Requested {fmtDate(hm.exception_requested_at.slice(0, 10))}</p>
          )}
        </div>
      </div>
      {hm.exception_reason && <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-sm text-ink-soft">{hm.exception_reason}</p>}
      <label className="mt-3 block text-sm">
        <span className="font-medium">Note to the requester (optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Shown to them if you decline"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          onClick={() => decide(false)}
          disabled={busy}
          className="flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <X size={13} /> Decline
        </button>
        <button
          onClick={() => decide(true)}
          disabled={busy}
          className="flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/85 disabled:opacity-50"
        >
          <Check size={13} /> Approve
        </button>
      </div>
    </div>
  )
}
