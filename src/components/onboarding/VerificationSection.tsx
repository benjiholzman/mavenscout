import { AlertTriangle, BadgeCheck, Clock, FileText, Link2, Paperclip, ScanFace, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { fmtDate } from '../../lib/dates'
import {
  addEvidenceFile,
  addEvidenceLink,
  evidenceFileProblem,
  removeEvidence,
  runPlaceholderIdCheck,
} from '../../lib/verification/store'
import { LABEL_TEXT, type ItemState, type VerificationState } from '../../lib/verification/state'
import type { Profile, VerificationEvidence } from '../../types/db'
import { Modal } from '../ui/Modal'

// The consultant's side of verification (docs/MavenScout-profiles-membership.md
// §3, §10): the required items and where each stands, the placeholder ID +
// selfie check, and evidence for MavenScout to review. Storage is stubbed:
// documents are described, never stored, in this build.

const chip = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold'

function StatusChip({ item }: { item: ItemState }) {
  if (item.status === 'labelled')
    return (
      <span className={`${chip} bg-emerald-50 text-emerald-800`}>
        <BadgeCheck size={12} /> {LABEL_TEXT[item.mark!.label]}
      </span>
    )
  if (item.status === 'waiting')
    return (
      <span className={`${chip} bg-brand-50 text-brand-700`}>
        <Clock size={12} /> {item.kind === 'certification' ? 'Pending check' : 'Being checked'}
      </span>
    )
  return (
    <span className={`${chip} bg-amber-50 text-amber-900`}>
      <AlertTriangle size={12} /> Your turn
    </span>
  )
}

export function VerificationSection({
  profile,
  state,
  reload,
}: {
  profile: Profile
  state: VerificationState | null
  reload: () => Promise<void>
}) {
  if (!state) return <p className="text-sm text-ink-faint">Loading…</p>
  const others = state.items.filter((i) => !i.required && i.status === 'labelled')
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-soft">
        Everyone listed on MavenScout is verified: your identity, most recent employer, most recent degree and every
        certification. Hiring managers see a label on each: <strong className="text-ink">Confirmed</strong> when we
        checked it with an independent source, <strong className="text-ink">Document reviewed</strong> when we
        examined your evidence. Editing a checked item removes its label until it’s checked again.
      </p>

      {profile.verification_recheck_until && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950" role="status">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Something we’d checked changed. Your profile stays listed while we check it again, until{' '}
            <strong>{fmtDate(profile.verification_recheck_until.slice(0, 10))}</strong>. After that it’s unlisted until
            the check is done.
          </span>
        </p>
      )}

      {state.bioEditRequest && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950" role="status">
          <p className="font-semibold">Please edit your professional summary</p>
          {typeof state.bioEditRequest.detail.note === 'string' && <p className="mt-1">{state.bioEditRequest.detail.note}</p>}
          <p className="mt-1 text-xs text-amber-900/80">
            Requested {fmtDate(state.bioEditRequest.created_at.slice(0, 10))}. This goes away once you save a new
            version.
          </p>
        </div>
      )}

      {state.missing.map((m) => (
        <p key={m} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {m}
        </p>
      ))}

      <ul className="space-y-3">
        {state.required.map((item) => (
          <li key={`${item.kind}:${item.id}`} className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{item.title}</p>
                <p className="mt-0.5 break-words text-sm font-medium">{item.summary || <em className="text-ink-faint">Untitled</em>}</p>
              </div>
              <StatusChip item={item} />
            </div>
            <p className="mt-1.5 text-sm text-ink-soft">{item.note}</p>
            {item.kind === 'employer' && item.status === 'action' && (
              <p className="mt-1 text-xs text-ink-faint">Self-employed? List your most recent client or contracting organization as your latest role.</p>
            )}
            {item.kind === 'identity' ? (
              item.status === 'action' && <IdentityCheck profile={profile} onDone={reload} />
            ) : (
              item.status !== 'labelled' && (
                <>
                  <EvidenceList rows={item.evidence} onChange={reload} />
                  <AddEvidence profileId={profile.id} item={item} onAdded={reload} />
                </>
              )
            )}
          </li>
        ))}
      </ul>

      {others.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Also checked</p>
          <ul className="mt-1.5 space-y-1 text-sm text-ink-soft">
            {others.map((i) => (
              <li key={`${i.kind}:${i.id}`} className="flex flex-wrap items-center gap-2">
                {i.summary} <StatusChip item={i} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function IdentityCheck({ profile, onDone }: { profile: Profile; onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (passed: boolean) => {
    setBusy(true)
    setError(null)
    try {
      await runPlaceholderIdCheck(profile, passed)
      await onDone()
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }
  if (!profile.photo_url)
    return <p className="mt-2 text-xs text-ink-faint">Add a profile photo under Basics first: the check matches it to your ID.</p>
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
      >
        <ScanFace size={15} /> Verify your identity
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Verify your identity">
        <p className="text-sm leading-relaxed text-ink-soft">
          You’ll photograph your passport or national ID, then take a selfie. Our ID partner checks that the ID is
          genuine, that it’s you, and that the name matches <strong className="text-ink">{profile.name}</strong>. We
          keep only the result, never your ID.
        </p>
        <div className="mt-4 rounded-xl border border-dashed border-amber-400 bg-amber-50 p-3 text-sm text-amber-950" role="note">
          <p className="text-xs font-semibold uppercase tracking-wide">Placeholder: no ID provider in this build</p>
          <p className="mt-1">Pick the result the provider would return.</p>
        </div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => run(true)}
            disabled={busy}
            className="flex-1 rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            Simulate a passed check
          </button>
          <button
            onClick={() => run(false)}
            disabled={busy}
            className="flex-1 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-ink-faint disabled:opacity-50"
          >
            Simulate a failed check
          </button>
        </div>
      </Modal>
    </>
  )
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return ''
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function EvidenceList({ rows, onChange }: { rows: VerificationEvidence[]; onChange: () => Promise<void> }) {
  if (rows.length === 0) return null
  return (
    <ul className="mt-3 space-y-1.5">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm">
          {r.link_url ? <Link2 size={14} className="shrink-0 text-ink-faint" /> : <FileText size={14} className="shrink-0 text-ink-faint" />}
          <span className="min-w-0 flex-1 truncate">
            {r.link_url ?? r.file_name}
            {r.file_size ? <span className="text-ink-faint"> · {fmtSize(r.file_size)}</span> : null}
            <span className="block text-xs text-ink-faint">Sent {fmtDate(r.created_at.slice(0, 10))} · deleted after review</span>
          </span>
          <button
            onClick={async () => {
              await removeEvidence(r)
              await onChange()
            }}
            aria-label="Remove this evidence"
            className="rounded-full p-1.5 text-ink-faint hover:bg-white hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </li>
      ))}
    </ul>
  )
}

const WHAT: Record<string, string> = {
  employer: 'An employment letter or contract, or a link to a public document naming you (e.g. a staff page or report).',
  degree: 'Your degree certificate or transcript.',
  certification: 'Your certificate.',
}

function AddEvidence({ profileId, item, onAdded }: { profileId: string; item: ItemState; onAdded: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'file' | 'link'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [link, setLink] = useState('')
  const [explanation, setExplanation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (item.kind === 'identity') return null
  const kind = item.kind

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink-faint/50 px-3.5 py-1.5 text-sm font-medium text-ink-soft hover:border-brand-400 hover:text-brand-600"
      >
        <Paperclip size={14} /> {item.evidence.length ? 'Add more evidence' : 'Add evidence'}
      </button>
    )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'link') await addEvidenceLink(profileId, { kind, id: item.id }, link, explanation)
      else if (file) await addEvidenceFile(profileId, { kind, id: item.id }, file, explanation)
      else throw new Error('Choose a file.')
      setOpen(false)
      setFile(null)
      setLink('')
      setExplanation('')
      await onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2.5 rounded-xl bg-paper p-3">
      <p className="text-xs text-ink-soft">{WHAT[kind]}</p>
      {kind === 'employer' && (
        <div className="flex gap-1 text-xs font-medium" role="radiogroup" aria-label="Evidence type">
          {(['file', 'link'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 ${mode === m ? 'bg-brand-500 text-white' : 'border border-line bg-white text-ink-soft'}`}
            >
              {m === 'file' ? 'Upload a document' : 'Link to a public document'}
            </button>
          ))}
        </div>
      )}
      {mode === 'file' || kind !== 'employer' ? (
        <label className="block text-sm">
          <span className="font-medium">Document (PDF, JPG or PNG, up to 10 MB)</span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null
              setFile(f)
              setError(f ? evidenceFileProblem(f) : null)
            }}
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
        </label>
      ) : (
        <label className="block text-sm">
          <span className="font-medium">Link</span>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
      )}
      <label className="block text-sm">
        <span className="font-medium">Anything we should know? (optional)</span>
        <input
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="e.g. The contract is under my maiden name"
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>
      <p className="text-xs text-amber-800">
        Demo build: documents aren’t stored. Only the file’s name, type and size are recorded. In the live service they’re
        kept privately for review, then deleted.
      </p>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded-full bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
          {busy ? 'Sending…' : 'Send for review'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-1.5 text-sm text-ink-soft hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  )
}
