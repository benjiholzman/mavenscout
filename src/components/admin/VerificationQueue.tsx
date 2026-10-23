import { AlertTriangle, BadgeCheck, Bot, ChevronDown, Clock, FileText, Inbox, Link2, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fmtDate } from '../../lib/dates'
import { MEMBERSHIP_LABELS } from '../../lib/membership'
import { loadOrgIndex, type OrgIndex } from '../../lib/organizations'
import { DEMO_ADMIN_NAME } from '../../lib/session'
import { supabase } from '../../lib/supabase'
import { AI_REVIEW_IS_PLACEHOLDER, reviewProfile, type ReviewFinding } from '../../lib/verification/aiReview'
import { decideItem, METHOD_LABELS, METHODS, requestBioEdits, type Decision } from '../../lib/verification/decisions'
import {
  LABEL_TEXT,
  verificationState,
  type ItemState,
  type VerificationInput,
  type VerificationState,
} from '../../lib/verification/state'
import type { AudioTestimonial, Profile, VerificationCheck, VerificationEvidence, VerificationMethod } from '../../types/db'

// Admin verification queue (docs/MavenScout-profiles-membership.md §3.1):
// the placeholder AI first pass writes a short report, a human decides each
// item. Evidence is deleted after each decision; the audit record stays.
// Profiles are queued when something waits on MavenScout: an ID check to
// compare, evidence or a credential ID to check, a submitted profile, or a
// listed profile in its re-check window.

interface Row {
  input: VerificationInput
  state: VerificationState
}

function needsAdmin(r: Row): ItemState[] {
  return r.state.items.filter((i) => i.status === 'waiting' && i.waitingFor === 'admin')
}

export function VerificationQueue() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [pick, setPick] = useState('')

  const load = async () => {
    const [p, c, e, t, orgs] = await Promise.all([
      supabase.from('profiles').select('*').order('name'),
      supabase.from('verification_checks').select('*'),
      supabase.from('verification_evidence').select('*').order('created_at'),
      supabase.from('audio_testimonials').select('*'),
      loadOrgIndex(),
    ])
    const by = <T extends { profile_id: string }>(list: T[] | null) => {
      const m = new Map<string, T[]>()
      for (const x of list ?? []) m.set(x.profile_id, [...(m.get(x.profile_id) ?? []), x])
      return m
    }
    const checks = by(c.data as VerificationCheck[])
    const evidence = by(e.data as VerificationEvidence[])
    const testimonials = by(t.data as AudioTestimonial[])
    setRows(
      ((p.data as Profile[]) ?? []).map((profile) => {
        const input: VerificationInput = {
          profile,
          checks: checks.get(profile.id) ?? [],
          evidence: evidence.get(profile.id) ?? [],
          testimonials: testimonials.get(profile.id) ?? [],
          orgs: orgs as OrgIndex,
        }
        return { input, state: verificationState(input) }
      }),
    )
  }
  useEffect(() => {
    load()
  }, [])

  const { queue, others } = useMemo(() => {
    const all = rows ?? []
    const inQueue = (r: Row) =>
      needsAdmin(r).length > 0 ||
      !!r.input.profile.verification_recheck_until ||
      (r.input.profile.approval_status === 'pending' && !!r.input.profile.submitted_at && !r.state.passed)
    const key = (r: Row) =>
      r.input.profile.verification_recheck_until ??
      // oldest waiting evidence, then submission
      [...r.input.evidence.map((e) => e.created_at), r.input.profile.submitted_at ?? '9999'].sort()[0]
    return {
      queue: all.filter(inQueue).sort((a, b) => key(a).localeCompare(key(b))),
      others: all.filter((r) => !inQueue(r)),
    }
  }, [rows])

  if (!rows) return <p className="text-sm text-ink-faint">Loading…</p>
  const picked = others.find((r) => r.input.profile.id === pick)

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        Identity, most recent employer, most recent degree and every certification. The AI report is a first pass; you
        decide. Evidence is deleted as soon as you decide; the audit record keeps what was checked, how, by whom and when.
      </p>
      {queue.length === 0 ? (
        <div className="flex flex-col items-center rounded-card border border-dashed border-line py-12 text-center">
          <Inbox size={24} className="text-ink-faint/60" />
          <p className="mt-3 text-sm font-medium text-ink-soft">Nothing waiting</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((r) => (
            <ProfileCard
              key={r.input.profile.id}
              row={r}
              open={openId === r.input.profile.id}
              onToggle={() => setOpenId(openId === r.input.profile.id ? null : r.input.profile.id)}
              onChanged={load}
            />
          ))}
        </div>
      )}

      <div className="rounded-card border border-line bg-white p-4">
        <label className="block text-sm">
          <span className="font-medium">Open another profile</span>
          <span className="mt-0.5 block text-xs text-ink-faint">
            Profiles with nothing waiting, including the demo profiles seeded before verification.
          </span>
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="">Choose a profile…</option>
            {others.map((r) => (
              <option key={r.input.profile.id} value={r.input.profile.id}>
                {r.input.profile.name || r.input.profile.handle}
              </option>
            ))}
          </select>
        </label>
        {picked && (
          <div className="mt-3">
            <ProfileCard row={picked} open onToggle={() => setPick('')} onChanged={load} />
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileCard({ row, open, onToggle, onChanged }: { row: Row; open: boolean; onToggle: () => void; onChanged: () => Promise<void> }) {
  const { profile } = row.input
  const { state } = row
  const waiting = needsAdmin(row).length
  const listed = profile.approval_status === 'approved'
  const report = useMemo(() => (open ? reviewProfile(row.input, state) : null), [open, row, state])
  return (
    <div className="rounded-card border border-line bg-white">
      <button onClick={onToggle} className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left" aria-expanded={open}>
        <div className="min-w-0">
          <p className="font-semibold">
            {profile.name || <em className="text-ink-faint">Unnamed draft</em>}{' '}
            <span className="text-xs font-normal text-ink-faint">
              {MEMBERSHIP_LABELS[profile.is_premium ? 'featured' : 'member']} ·{' '}
              {listed ? 'listed' : profile.submitted_at ? 'submitted for review' : 'draft'}
              {profile.is_demo ? ' · demo' : ''}
            </span>
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs">
            {waiting > 0 && <span className="text-brand-700">{waiting} waiting on you</span>}
            {state.passed ? (
              <span className="text-emerald-700">Verification complete</span>
            ) : (
              <span className="text-ink-faint">{state.required.filter((i) => i.status === 'labelled').length}/{state.required.length} checked</span>
            )}
            {profile.verification_recheck_until && (
              <span className="text-amber-800">Re-check by {fmtDate(profile.verification_recheck_until.slice(0, 10))}</span>
            )}
          </p>
        </div>
        <ChevronDown size={18} className={`shrink-0 text-ink-faint transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && report && (
        <div className="space-y-4 border-t border-line p-4">
          <Link to={`/profile/${profile.handle}`} className="text-xs font-medium text-brand-600">
            Open profile
          </Link>
          <AiReport summary={report.summary} findings={report.findings.filter((f) => f.about === 'profile')} />
          {state.missing.map((m) => (
            <p key={m} className="text-sm text-amber-900">{m}</p>
          ))}
          <ul className="space-y-3">
            {state.items
              .filter((i) => i.required || i.status === 'labelled')
              .map((item) => (
                <ItemDecision
                  key={`${item.kind}:${item.id}`}
                  profile={profile}
                  item={item}
                  identityResult={item.kind === 'identity' ? state.identityResult : null}
                  findings={report.findings.filter((f) => f.about === `${item.kind}:${item.id}`)}
                  onDecided={onChanged}
                />
              ))}
          </ul>
          <BioReview profile={profile} state={state} findings={report.findings.filter((f) => f.about === 'bio')} onDone={onChanged} />
        </div>
      )}
    </div>
  )
}

function AiReport({ summary, findings }: { summary: string; findings: ReviewFinding[] }) {
  return (
    <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/60 p-3 text-sm">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-900">
        <Bot size={14} /> AI review{AI_REVIEW_IS_PLACEHOLDER ? ' · placeholder, rule-based, reads no documents' : ''}
      </p>
      <p className="mt-1 text-violet-950">{summary}</p>
      <Findings findings={findings} />
    </div>
  )
}

function Findings({ findings }: { findings: ReviewFinding[] }) {
  if (findings.length === 0) return null
  return (
    <ul className="mt-1.5 space-y-1">
      {findings.map((f, i) => (
        <li key={i} className={`flex items-start gap-1.5 text-xs ${f.level === 'flag' ? 'text-amber-900' : 'text-violet-950/80'}`}>
          {f.level === 'flag' ? <AlertTriangle size={12} className="mt-0.5 shrink-0" /> : <Bot size={12} className="mt-0.5 shrink-0" />}
          {f.text}
        </li>
      ))}
    </ul>
  )
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return ''
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function ItemDecision({
  profile,
  item,
  identityResult,
  findings,
  onDecided,
}: {
  profile: Profile
  item: ItemState
  identityResult: VerificationCheck | null
  findings: ReviewFinding[]
  onDecided: () => Promise<void>
}) {
  const methods = METHODS[item.kind]
  const [method, setMethod] = useState<VerificationMethod>(methods.confirmed[0])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const decide = async (outcome: Decision['outcome']) => {
    if (outcome === 'unverifiable' && item.kind === 'certification' && !confirm(`Remove “${item.summary}” from the profile? It can't be listed unchecked.`)) return
    setBusy(true)
    setError(null)
    try {
      await decideItem(profile, item, { outcome, method, note, adminName: DEMO_ADMIN_NAME })
      await onDecided()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <li className="rounded-xl border border-line p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{item.title}</p>
          <p className="mt-0.5 break-words text-sm font-medium">{item.summary}</p>
        </div>
        {item.mark ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            <BadgeCheck size={12} /> {LABEL_TEXT[item.mark.label]}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-xs font-semibold text-ink-soft">
            <Clock size={12} /> {item.status === 'action' ? 'Waiting on consultant' : item.waitingFor === 'referee' ? 'Waiting on referee' : 'Waiting on you'}
          </span>
        )}
      </div>

      {item.mark ? (
        <p className="mt-1 text-xs text-ink-faint">
          {item.mark.method ? METHOD_LABELS[item.mark.method] : ''}
          {item.mark.by ? ` · ${item.mark.by}` : ''} · {fmtDate(item.mark.at.slice(0, 10))}
          {item.mark.testimonial ? ` · ${item.mark.testimonial.reference_name}, ${item.mark.testimonial.referee_email}` : ''}
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-ink-soft">{item.note}</p>
          {identityResult && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-soft">
              <ShieldCheck size={13} className="text-ink-faint" />
              {identityResult.actor_name}: {identityResult.outcome === 'provider_passed' ? 'passed' : 'failed'},{' '}
              {fmtDate(identityResult.created_at.slice(0, 10))}
              {profile.photo_url && <img src={profile.photo_url} alt="Profile photo" className="ml-1 h-8 w-8 rounded-full object-cover" />}
            </p>
          )}
          {item.evidence.length > 0 && (
            <ul className="mt-2 space-y-1">
              {item.evidence.map((e) => (
                <li key={e.id} className="flex items-start gap-1.5 rounded-lg bg-paper px-2.5 py-1.5 text-xs">
                  {e.link_url ? <Link2 size={13} className="mt-0.5 shrink-0" /> : <FileText size={13} className="mt-0.5 shrink-0" />}
                  <span className="min-w-0">
                    {e.link_url ? (
                      <a href={e.link_url} target="_blank" rel="noreferrer noopener" className="break-all text-brand-600">
                        {e.link_url}
                      </a>
                    ) : (
                      <>
                        {e.file_name} · {e.mime_type} · {fmtSize(e.file_size)}{' '}
                        <span className="text-amber-800">(not stored in this build)</span>
                      </>
                    )}
                    {e.explanation && <span className="block text-ink-soft">“{e.explanation}”</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {findings.length > 0 && (
            <div className="mt-2 rounded-lg bg-violet-50/60 px-2.5 py-1.5">
              <Findings findings={findings} />
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="min-w-[10rem] flex-1 text-xs">
              <span className="font-medium">Note (optional; shown to the consultant if you can’t verify)</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-line pl-1">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as VerificationMethod)}
                aria-label="How it was confirmed"
                className="rounded-full bg-transparent px-2 py-1 text-xs"
              >
                {methods.confirmed.map((m) => (
                  <option key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
              <button
                onClick={() => decide('confirmed')}
                disabled={busy}
                className="rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/85 disabled:opacity-40"
              >
                Confirmed
              </button>
            </span>
            {methods.document_reviewed && (
              <button
                onClick={() => decide('document_reviewed')}
                disabled={busy || item.evidence.length === 0}
                title={item.evidence.length === 0 ? 'No document sent' : undefined}
                className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-ink-faint disabled:opacity-40"
              >
                Document reviewed
              </button>
            )}
            <button
              onClick={() => decide('unverifiable')}
              disabled={busy}
              className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
            >
              {item.kind === 'certification' ? 'Can’t verify: remove' : 'Can’t verify'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
        </>
      )}
    </li>
  )
}

function BioReview({ profile, state, findings, onDone }: { profile: Profile; state: VerificationState; findings: ReviewFinding[]; onDone: () => Promise<void> }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="rounded-xl border border-line p-3.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Professional summary</p>
      <p className="mt-0.5 text-xs text-ink-faint">Not verified as a whole; the AI flags claims that contradict checked items or look implausible.</p>
      {findings.length > 0 ? (
        <div className="mt-2 rounded-lg bg-violet-50/60 px-2.5 py-1.5">
          <Findings findings={findings} />
        </div>
      ) : (
        <p className="mt-2 text-xs text-ink-soft">No claims flagged.</p>
      )}
      {state.bioEditRequest ? (
        <p className="mt-2 text-xs text-amber-900">
          Edits requested {fmtDate(state.bioEditRequest.created_at.slice(0, 10))}; waiting for a new version.
        </p>
      ) : (
        <form
          className="mt-2 flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            await requestBioEdits(profile, note, DEMO_ADMIN_NAME)
            setNote('')
            setBusy(false)
            await onDone()
          }}
        >
          <label className="min-w-[10rem] flex-1 text-xs">
            <span className="font-medium">Ask for edits</span>
            <input
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What to change, e.g. the 25 years claim"
              className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <button disabled={busy} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:border-ink-faint disabled:opacity-40">
            Send request
          </button>
        </form>
      )}
    </div>
  )
}
