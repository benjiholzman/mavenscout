import { Check, ChevronDown, Inbox, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fmtDate } from '../../lib/dates'
import { audioPublicUrl } from '../../lib/media'
import { supabase } from '../../lib/supabase'
import { holdsLink } from '../../lib/testimonials/integrity'
import { clearHeldRequest, rejectHeldRequest } from '../../lib/testimonials/requests'
import { isActive, periodLabel, STAGE_LABELS, testimonialStage } from '../../lib/testimonials/rules'
import type { AudioTestimonial, Profile, TestimonialEvent } from '../../types/db'

// Testimonials (docs/MavenScout-profiles-membership.md §4.2, §4.6; PRD 7.10):
// - Held for review: requests with a pre-check or integrity flag wait here
//   before their link exists. Clear creates the link; Reject ends the request.
// - Flagged: active testimonials with a non-blocking flag (referee volume).
// - All: every testimonial with its audit trail, and takedown.

type Row = AudioTestimonial & { profile: Pick<Profile, 'id' | 'name' | 'handle' | 'work_history'> | null }

function targetLabel(t: Row): string {
  const entry = t.profile?.work_history.find((w) => w.id === t.work_history_entry_id)
  if (entry) return `${entry.role ? `${entry.role}, ` : ''}${entry.organization} (employer)`
  if (t.portfolio_item_id) return 'Portfolio project'
  return 'General (legacy)'
}

export function Moderation() {
  const [rows, setRows] = useState<Row[] | null>(null)

  const load = async () => {
    const [t, p] = await Promise.all([
      supabase.from('audio_testimonials').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,name,handle,work_history'),
    ])
    const profiles = new Map(((p.data as Row['profile'][]) ?? []).map((x) => [x!.id, x]))
    setRows(((t.data as AudioTestimonial[]) ?? []).map((x) => ({ ...x, profile: profiles.get(x.profile_id) ?? null })))
  }
  useEffect(() => {
    load()
  }, [])

  if (!rows) return <p className="text-sm text-ink-faint">Loading…</p>

  const held = rows.filter((t) => testimonialStage(t) === 'held')
  const flagged = rows.filter((t) => isActive(t) && testimonialStage(t) !== 'held' && t.review_flags.length > 0)
  const all = rows.filter((t) => testimonialStage(t) !== 'held')

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold">Held for review ({held.length})</h2>
        <p className="mt-0.5 text-sm text-ink-faint">
          No link exists until you clear the request. The consultant sees "Held for a quick review, usually
          within a day". The pre-check is a placeholder in this build.
        </p>
        {held.length === 0 ? (
          <Empty text="Nothing waiting." />
        ) : (
          <div className="mt-4 space-y-3">
            {held.map((t) => (
              <HeldCard key={t.id} t={t} onDone={load} />
            ))}
          </div>
        )}
      </section>

      {flagged.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Flagged ({flagged.length})</h2>
          <p className="mt-0.5 text-sm text-ink-faint">Active testimonials with a flag that doesn't hold the link.</p>
          <div className="mt-4 space-y-3">
            {flagged.map((t) => (
              <TestimonialCardAdmin key={t.id} t={t} onChanged={load} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold">All testimonials ({all.length})</h2>
        {all.length === 0 ? (
          <Empty text="No audio testimonials in the system yet." />
        ) : (
          <div className="mt-4 space-y-3">
            {all.map((t) => (
              <TestimonialCardAdmin key={t.id} t={t} onChanged={load} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-card border border-dashed border-line py-10 text-center">
      <Inbox size={22} className="text-ink-faint/60" />
      <p className="mt-2 text-sm text-ink-faint">{text}</p>
    </div>
  )
}

function RefereeLines({ t }: { t: Row }) {
  return (
    <>
      <p className="text-sm font-medium">
        {t.reference_name ?? 'Reference'}{' '}
        <span className="text-xs font-normal text-ink-faint">
          for {t.profile?.name ?? '?'} · {targetLabel(t)}
        </span>
      </p>
      <p className="text-xs text-ink-soft">
        {[t.reference_title, t.reference_org, t.referee_email].filter(Boolean).join(' · ')}
      </p>
      {t.referee_email && (
        <p className="text-xs text-ink-faint">
          {t.relationship === 'client' ? 'Client' : 'Supervisor'}
          {periodLabel(t.period_start, t.period_end) && `, ${periodLabel(t.period_start, t.period_end)}`}
          {t.context && ` · ${t.context}`}
        </p>
      )}
    </>
  )
}

function Flags({ t, only }: { t: Row; only?: 'holding' }) {
  const flags = only ? t.review_flags.filter(holdsLink) : t.review_flags
  if (!flags.length) return null
  return (
    <ul className="mt-2 space-y-0.5 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-950">
      {flags.map((f) => (
        <li key={f.code}>⚑ {f.message}</li>
      ))}
    </ul>
  )
}

function HeldCard({ t, onDone }: { t: Row; onDone: () => void }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const act = async (fn: typeof clearHeldRequest) => {
    setBusy(true)
    const err = await fn(t, note.trim())
    setBusy(false)
    if (err) window.alert(err)
    else onDone()
  }
  return (
    <div className="rounded-card border border-amber-200 bg-white p-4">
      <RefereeLines t={t} />
      <p className="mt-0.5 text-xs text-ink-faint">Requested {fmtDate(t.created_at.slice(0, 10))}</p>
      <Flags t={t} />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note for the audit trail (optional)"
          className="min-w-0 flex-1 rounded-lg border border-line px-3 py-1.5 text-sm"
        />
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => act(rejectHeldRequest)}
            className="flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <X size={13} /> Reject
          </button>
          <button
            disabled={busy}
            onClick={() => act(clearHeldRequest)}
            className="flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/85 disabled:opacity-50"
          >
            <Check size={13} /> Clear and create link
          </button>
        </div>
      </div>
      <AuditTrail id={t.id} />
    </div>
  )
}

function TestimonialCardAdmin({ t, onChanged }: { t: Row; onChanged: () => void }) {
  const stage = testimonialStage(t)
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <RefereeLines t={t} />
          <p className="mt-0.5 text-xs text-ink-faint">
            {STAGE_LABELS[stage]}
            {t.source === 'candidate_upload' && ' · candidate upload (legacy)'}
          </p>
        </div>
        {t.status !== 'removed' && (
          <button
            onClick={async () => {
              await supabase.from('audio_testimonials').update({ status: 'removed' }).eq('id', t.id)
              onChanged()
            }}
            className="flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 size={13} /> Remove
          </button>
        )}
      </div>
      <Flags t={t} />
      {t.audio_path && (
        <audio controls controlsList="nodownload" preload="metadata" src={audioPublicUrl(t.audio_path)} className="mt-2 w-full" />
      )}
      <AuditTrail id={t.id} />
    </div>
  )
}

/** The testimonial's events, loaded on demand (§4.6 rule 7). */
function AuditTrail({ id }: { id: string }) {
  const [events, setEvents] = useState<TestimonialEvent[] | null>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open || events) return
    supabase
      .from('testimonial_events')
      .select('*')
      .eq('testimonial_id', id)
      .order('created_at')
      .then(({ data }) => setEvents((data as TestimonialEvent[]) ?? []))
  }, [open, events, id])
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs font-medium text-ink-faint hover:text-ink">
        <ChevronDown size={13} className={open ? 'rotate-180' : ''} /> Audit trail
      </button>
      {open && (
        <ol className="mt-1.5 space-y-1 border-l border-line pl-3 text-xs">
          {!events ? (
            <li className="text-ink-faint">Loading…</li>
          ) : events.length === 0 ? (
            <li className="text-ink-faint">No events recorded (made before the audit trail existed).</li>
          ) : (
            events.map((e) => (
              <li key={e.id}>
                <span className="font-medium">{e.event.replace(/_/g, ' ')}</span>{' '}
                <span className="text-ink-faint">
                  · {e.actor} · {new Date(e.created_at).toLocaleString()}
                </span>
                {Object.keys(e.detail).length > 0 && (
                  <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap break-all rounded bg-paper p-1.5 text-[11px] text-ink-soft">
                    {JSON.stringify(e.detail, null, 1)}
                  </pre>
                )}
                {e.fingerprint && (
                  <p className="text-[11px] text-ink-faint">
                    {String(e.fingerprint.platform ?? '')} · {String(e.fingerprint.timezone ?? '')} · {String(e.fingerprint.screen ?? '')}
                  </p>
                )}
              </li>
            ))
          )}
        </ol>
      )}
    </div>
  )
}
