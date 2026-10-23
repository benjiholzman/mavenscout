import { Copy, Link2, Mail, Mic, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { audioPublicUrl, AUDIO_MAX_SECONDS, uploadAudioFile } from '../../lib/media'
import { RecorderControl } from '../media/Recorder'
import { supabase } from '../../lib/supabase'
import { audioTestimonialCap } from '../../lib/validation'
import type { AudioTestimonial, PortfolioItem, Profile } from '../../types/db'
import { FieldRow, TextArea, TextField } from './fields'

// Audio testimonials editor (PRD 7.6) — both paths in one place:
//   Path 1 (reference-direct): generate a tokenised request link + email
//     template; the reference submits on /testimonial/:token with the
//     candidate (and optional portfolio item) pre-loaded from the token.
//   Path 2 (candidate-upload): upload an audio file you already have and
//     attach it to yourself or a portfolio item. Fully self-managed —
//     verification is effectively none (a conscious product choice).
// Submitted testimonials land as pending; the candidate publishes; admin
// retains takedown power. Cap: 1 Member / 10 Featured Member (the per-entry rule comes with the
// testimonial flow, spec §4).

export function TestimonialsSection({
  profile,
  portfolio,
}: {
  profile: Profile
  portfolio: PortfolioItem[]
}) {
  const [rows, setRows] = useState<AudioTestimonial[] | null>(null)
  const cap = audioTestimonialCap(profile)

  const load = () =>
    supabase
      .from('audio_testimonials')
      .select('*')
      .eq('profile_id', profile.id)
      .neq('status', 'removed')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows((data as AudioTestimonial[]) ?? []))
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id])

  if (!rows) return <p className="text-sm text-ink-faint">Loading…</p>

  // Pending request placeholders (no audio yet) don't count against the cap.
  const substantive = rows.filter((r) => r.audio_path)
  const capReached = substantive.length >= cap

  return (
    <div className="space-y-7">
      {/* Existing testimonials + publish control */}
      <div>
        <h3 className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-ink-faint">
          Your testimonials ({substantive.length}/{cap})
        </h3>
        {rows.length === 0 && <p className="text-sm text-ink-faint">None yet — use either path below.</p>}
        <div className="space-y-2.5">
          {rows.map((t) => (
            <TestimonialRow key={t.id} t={t} portfolio={portfolio} onChanged={load} />
          ))}
        </div>
      </div>

      {capReached ? (
        <p className="rounded-lg bg-paper px-3.5 py-3 text-sm text-ink-faint">
          Testimonial limit reached ({cap}).{cap === 1 && ' Add more testimonials as a Featured Member.'}
        </p>
      ) : (
        <>
          <RequestGenerator profile={profile} portfolio={portfolio} onCreated={load} />
          <DirectUpload profile={profile} portfolio={portfolio} onCreated={load} />
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function TestimonialRow({
  t,
  portfolio,
  onChanged,
}: {
  t: AudioTestimonial
  portfolio: PortfolioItem[]
  onChanged: () => void
}) {
  const item = portfolio.find((p) => p.id === t.portfolio_item_id)
  const awaiting = t.source === 'reference_direct' && !t.audio_path
  const requestUrl = t.submission_token
    ? `${window.location.origin}/testimonial/${t.submission_token}`
    : null

  return (
    <div className="rounded-xl border border-line bg-white p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {awaiting ? 'Awaiting reference submission' : (t.reference_name ?? 'Reference')}
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                t.status === 'published'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {awaiting ? 'link sent' : t.status}
            </span>
          </p>
          <p className="text-xs text-ink-faint">
            {[t.reference_title, t.reference_org].filter(Boolean).join(', ')}
            {item && ` · attached to "${item.project_name}"`}
            {!item && !awaiting && ' · general'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {!awaiting && (
            <button
              onClick={async () => {
                await supabase
                  .from('audio_testimonials')
                  .update({ status: t.status === 'published' ? 'pending' : 'published' })
                  .eq('id', t.id)
                onChanged()
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${
                t.status === 'published'
                  ? 'border border-line text-ink-soft hover:border-ink-faint'
                  : 'bg-brand-500 text-white hover:bg-brand-600'
              }`}
            >
              {t.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
          )}
          <button
            onClick={async () => {
              if (t.audio_path)
                await supabase.storage.from('audio-testimonials').remove([t.audio_path])
              await supabase.from('audio_testimonials').delete().eq('id', t.id)
              onChanged()
            }}
            aria-label="Delete testimonial"
            className="rounded-full p-1.5 text-ink-faint hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {t.audio_path && (
        <audio controls preload="metadata" src={audioPublicUrl(t.audio_path)} className="mt-2 w-full" />
      )}
      {awaiting && requestUrl && (
        <div className="mt-2 flex items-center gap-1.5">
          <input readOnly value={requestUrl} className="w-full truncate rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs" />
          <button
            onClick={() => navigator.clipboard.writeText(requestUrl)}
            title="Copy link"
            className="shrink-0 rounded-full border border-line p-2 text-ink-soft hover:border-brand-400"
          >
            <Copy size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function RequestGenerator({
  profile,
  portfolio,
  onCreated,
}: {
  profile: Profile
  portfolio: PortfolioItem[]
  onCreated: () => void
}) {
  const [portfolioItemId, setPortfolioItemId] = useState('')
  const [created, setCreated] = useState<{ url: string; template: string } | null>(null)

  const generate = async () => {
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
    const { error } = await supabase.from('audio_testimonials').insert({
      profile_id: profile.id,
      portfolio_item_id: portfolioItemId || null,
      source: 'reference_direct',
      submission_token: token,
      status: 'pending',
    })
    if (error) return
    const url = `${window.location.origin}/testimonial/${token}`
    const itemName = portfolio.find((p) => p.id === portfolioItemId)?.project_name
    const template = `Subject: Would you record a 2-minute audio reference for me?

Hi [name],

I keep a profile on MavenScout, a curated marketplace where international development organizations find consultants${itemName ? ` — and I'd love a short spoken reference about our work together on "${itemName}"` : ", and I'd love a short spoken reference from you"}.

It takes about two minutes: open the link below, record or upload a short audio note (please introduce yourself — name, organization, and how we worked together), and submit. No account needed.

${url}

What this is and why I'm asking: ${window.location.origin}/testimonial-info

Thank you!
${profile.name}`
    setCreated({ url, template })
    onCreated()
  }

  return (
    <div className="rounded-xl border border-line bg-paper/60 p-4">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold">
        <Link2 size={14} className="text-brand-500" /> Ask a reference directly
      </h4>
      <p className="mt-1 text-xs text-ink-faint">
        Generates a unique link where your reference records/uploads their testimonial — you're
        pre-loaded from the link, so nothing can be misattributed.
      </p>
      {created ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <input readOnly value={created.url} className="w-full truncate rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs" />
            <button
              onClick={() => navigator.clipboard.writeText(created.url)}
              title="Copy link"
              className="shrink-0 rounded-full border border-line bg-white p-2 text-ink-soft hover:border-brand-400"
            >
              <Copy size={13} />
            </button>
          </div>
          <textarea readOnly rows={8} value={created.template} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink-soft" />
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(created.template)}
              className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:border-brand-400"
            >
              <Copy size={12} /> Copy email template
            </button>
            <a
              href={`mailto:?subject=${encodeURIComponent('Would you record a 2-minute audio reference for me?')}&body=${encodeURIComponent(created.template.split('\n').slice(2).join('\n'))}`}
              className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:border-brand-400"
            >
              <Mail size={12} /> Open in email
            </a>
            <button onClick={() => setCreated(null)} className="text-xs font-medium text-ink-faint hover:text-ink">
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select
            value={portfolioItemId}
            onChange={(e) => setPortfolioItemId(e.target.value)}
            className="rounded-lg border border-line bg-white px-2.5 py-2 text-xs font-medium text-ink-soft"
          >
            <option value="">About me in general</option>
            {portfolio.map((p) => (
              <option key={p.id} value={p.id}>
                About: {p.project_name}
              </option>
            ))}
          </select>
          <button
            onClick={generate}
            className="rounded-full bg-brand-500 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600"
          >
            Generate request link + email template
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function DirectUpload({
  profile,
  portfolio,
  onCreated,
}: {
  profile: Profile
  portfolio: PortfolioItem[]
  onCreated: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    reference_name: '',
    reference_org: '',
    reference_title: '',
    relationship: '',
    reference_month: '',
    verification_url: '',
    transcript: '',
    portfolio_item_id: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [recordedDuration, setRecordedDuration] = useState<number | null>(null)
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!file) return setError('Record or choose an audio file first.')
    if (!form.reference_name.trim()) return setError("Enter the reference's name.")
    setBusy(true)
    setError(null)
    try {
      const up = await uploadAudioFile(profile.id, file, recordedDuration ?? undefined)
      const { error: err } = await supabase.from('audio_testimonials').insert({
        profile_id: profile.id,
        portfolio_item_id: form.portfolio_item_id || null,
        reference_name: form.reference_name.trim(),
        reference_org: form.reference_org.trim() || null,
        reference_title: form.reference_title.trim() || null,
        relationship: form.relationship.trim() || null,
        reference_date: form.reference_month ? `${form.reference_month}-01` : null,
        verification_url: form.verification_url.trim() || null,
        transcript: form.transcript.trim() || null,
        audio_path: up.path,
        duration_seconds: up.duration,
        source: 'candidate_upload',
        status: 'pending',
      })
      if (err) throw new Error(err.message)
      setDone(true)
      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (done)
    return (
      <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
        Testimonial uploaded — it's pending until you publish it above.{' '}
        <button className="font-medium underline" onClick={() => setDone(false)}>
          Add another
        </button>
      </div>
    )

  return (
    <div className="rounded-xl border border-line bg-paper/60 p-4">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold">
        <Mic size={14} className="text-brand-500" /> Upload one you already have
      </h4>
      <p className="mt-1 text-xs text-ink-faint">
        A reference emailed you a recording? Upload it here with their details. The verification
        link (their bio on an institutional site, LinkedIn…) is what lets hiring managers
        sanity-check who's vouching — include it if you can.
      </p>
      <div className="mt-3 space-y-2.5">
        <FieldRow>
          <TextField label="Reference name" value={form.reference_name} onChange={(v) => setForm({ ...form, reference_name: v })} required />
          <TextField label="Organization" value={form.reference_org} onChange={(v) => setForm({ ...form, reference_org: v })} />
        </FieldRow>
        <FieldRow>
          <TextField label="Job title" value={form.reference_title} onChange={(v) => setForm({ ...form, reference_title: v })} />
          <TextField label="Relationship to you" value={form.relationship} onChange={(v) => setForm({ ...form, relationship: v })} placeholder="Direct manager, client…" />
        </FieldRow>
        <FieldRow>
          <label className="block text-sm">
            <span className="font-medium">When given</span>
            <input
              type="month"
              value={form.reference_month}
              onChange={(e) => setForm({ ...form, reference_month: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <TextField label="Verification link (optional)" value={form.verification_url} onChange={(v) => setForm({ ...form, verification_url: v })} placeholder="https://…" />
        </FieldRow>
        <label className="block text-sm">
          <span className="font-medium">Attach to</span>
          <select
            value={form.portfolio_item_id}
            onChange={(e) => setForm({ ...form, portfolio_item_id: e.target.value })}
            className="mt-1 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-sm"
          >
            <option value="">Me in general</option>
            {portfolio.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name}
              </option>
            ))}
          </select>
        </label>
        <TextArea label="Transcript (optional)" rows={2} value={form.transcript} onChange={(v) => setForm({ ...form, transcript: v })} />
        {recording ? (
          <RecorderControl
            kind="audio"
            maxSeconds={AUDIO_MAX_SECONDS}
            onRecorded={(f, duration) => {
              setFile(f)
              setRecordedDuration(duration)
              setRecording(false)
            }}
            onCancel={() => setRecording(false)}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setRecordedDuration(null)
              }}
            />
            <button
              onClick={() => setRecording(true)}
              className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-medium text-ink-soft hover:border-brand-400"
            >
              <Mic size={13} /> Record now (≤2 min)
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-medium text-ink-soft hover:border-brand-400"
            >
              <Upload size={13} /> {file ? file.name : 'Choose audio file'}
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-full bg-brand-500 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {busy ? 'Uploading…' : 'Upload testimonial'}
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}
