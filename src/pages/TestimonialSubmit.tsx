import { CheckCircle2, Lock, Mail, Mic, ShieldCheck, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import lockup from '../assets/mavenscout-lockup-horizontal.svg'
import { RecorderControl } from '../components/media/Recorder'
import { Segmented } from '../components/ui/Segmented'
import { TESTIMONIAL_RULES } from '../lib/config'
import { firstName } from '../lib/names'
import { normalizeCodeInput } from '../lib/testimonials/code'
import {
  acceptDetails,
  createManagerAccount,
  detailsOf,
  isConfirmedHere,
  loadRequest,
  markOpened,
  saveTranscript,
  sendCode,
  setOptIn,
  submitRecording,
  verifyCode,
  type RefereeDetails,
  type RefereeRequest,
} from '../lib/testimonials/referee'
import { periodLabel, relationshipVerb, testimonialStage } from '../lib/testimonials/rules'
import { TRANSCRIBE_IS_PLACEHOLDER, transcribeAudio } from '../lib/testimonials/transcribe'
import type { AudioTestimonial } from '../types/db'

// /testimonial/:token — the referee's page (docs/MavenScout-profiles-membership.md
// §4.3, §4.7). Phone-first: one column, large targets, 16px inputs (no iOS
// zoom). No account needed. Steps: intro + privacy promises → confirm it's
// me (code to the institutional email) → review the details → record →
// submit with consent → transcript → thank you. Locks after submission.
//
// ⚠ SECURITY (flagged, not hardened — see lib/testimonials/referee.ts): an
// unauthenticated upload endpoint. The code check runs in the browser and the
// email is MOCKED: the code is shown on screen in development.

type Step = 'intro' | 'code' | 'details' | 'record' | 'transcript' | 'thanks'
type Ended = 'invalid' | 'locked' | 'withdrawn' | 'closed'

const STEP_ORDER: Step[] = ['intro', 'code', 'details', 'record', 'transcript', 'thanks']
const STEP_NAMES: Partial<Record<Step, string>> = { code: 'Confirm', details: 'Details', record: 'Record', transcript: 'Transcript' }

const input =
  'mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-3 text-base outline-none focus:border-brand-400'
const primary =
  'flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3.5 text-base font-medium text-white hover:bg-brand-600 disabled:opacity-50'
const secondary =
  'flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-base font-medium text-ink-soft hover:border-brand-400 disabled:opacity-50'

export default function TestimonialSubmit() {
  const { token } = useParams()
  const [req, setReq] = useState<RefereeRequest | null>(null)
  const [ended, setEnded] = useState<Ended | null>(null)
  const [step, setStep] = useState<Step>('intro')
  const [loading, setLoading] = useState(true)
  /** The submitted audio, for the transcript step. */
  const [submitted, setSubmitted] = useState<{ file: File; duration: number } | null>(null)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const loaded = await loadRequest(token)
      const stage = loaded ? testimonialStage(loaded.t) : null
      if (!loaded) setEnded('invalid')
      else if (stage === 'withdrawn') setEnded('withdrawn')
      else if (stage === 'cancelled' || stage === 'rejected' || stage === 'removed') setEnded('closed')
      else if (loaded.t.submitted_at) setEnded('locked') // §4.3 step 8
      else {
        const t = await markOpened(loaded.t)
        // A reload in the same tab resumes after the code check.
        if (await isConfirmedHere(t)) setStep(t.details_accepted_at ? 'record' : 'details')
        setReq({ ...loaded, t })
      }
      setLoading(false)
    })()
  }, [token])

  const setT = (t: AudioTestimonial) => setReq((r) => (r ? { ...r, t } : r))

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <img src={lockup} alt="MavenScout" className="h-6" />
          <Link to="/testimonial-info" className="py-2 text-sm font-medium text-brand-600">
            What is this?
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-16 pt-5">
        {loading && <p className="text-ink-faint">Loading…</p>}
        {ended && <EndedState ended={ended} />}
        {req && !ended && (
          <>
            {step !== 'intro' && step !== 'thanks' && <Stepper step={step} />}
            {step === 'intro' && <Intro req={req} onNext={() => setStep('code')} />}
            {step === 'code' && <CodeStep req={req} setT={setT} onConfirmed={() => setStep('details')} />}
            {step === 'details' && <DetailsStep req={req} setT={setT} onAccepted={() => setStep('record')} />}
            {step === 'record' && (
              <RecordStep
                req={req}
                setT={setT}
                onSubmitted={(file, duration) => {
                  setSubmitted({ file, duration })
                  setStep('transcript')
                }}
                onLostConfirmation={() => setStep('code')}
              />
            )}
            {step === 'transcript' && <TranscriptStep req={req} audio={submitted} setT={setT} onDone={() => setStep('thanks')} />}
            {step === 'thanks' && <ThanksStep req={req} setT={setT} />}
          </>
        )}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Stepper({ step }: { step: Step }) {
  const steps = (['code', 'details', 'record', 'transcript'] as Step[])
  const at = STEP_ORDER.indexOf(step)
  return (
    <ol className="mb-5 grid grid-cols-4 gap-1.5" aria-label="Steps">
      {steps.map((s, i) => {
        const done = STEP_ORDER.indexOf(s) < at
        const current = s === step
        return (
          <li key={s} aria-current={current ? 'step' : undefined}>
            <span className={`block h-1.5 rounded-full ${done || current ? 'bg-brand-500' : 'bg-line'}`} />
            <span className={`mt-1 block text-xs ${current ? 'font-semibold text-ink' : 'text-ink-faint'}`}>
              {i + 1}. {STEP_NAMES[s]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">{children}</div>
}

function EndedState({ ended }: { ended: Ended }) {
  const content = {
    invalid: { title: "This link isn't valid", text: "It may have been mistyped or replaced. Ask the person who sent it for a fresh one." },
    locked: {
      title: 'Your testimonial has been submitted',
      text: 'Thank you. This page is now locked. When it is published we email you a link to withdraw it at any time.',
    },
    withdrawn: { title: 'This testimonial was withdrawn', text: 'It is no longer on MavenScout. Nothing else is needed from you.' },
    closed: { title: 'This request is closed', text: 'The person who asked no longer needs it. Nothing else is needed from you.' },
  }[ended]
  return (
    <div className="pt-8 text-center">
      {ended === 'locked' ? <Lock size={26} className="mx-auto text-brand-500" /> : <CheckCircle2 size={26} className="mx-auto text-ink-faint" />}
      <h1 className="mt-3 text-xl font-semibold">{content.title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">{content.text}</p>
    </div>
  )
}

/** How the page addresses the consultant: "Priya", never "Dr.". */
function consultantFirst(req: RefereeRequest): string {
  return firstName(req.consultant.name) ?? req.consultant.name
}

/** "You supervised Amara at the World Bank, 2014–2016." */
function relationshipLine(req: RefereeRequest, d: Pick<RefereeDetails, 'relationship' | 'period_start' | 'period_end'>) {
  const first = consultantFirst(req)
  const period = periodLabel(d.period_start, d.period_end)
  const verb = relationshipVerb(d.relationship).toLowerCase()
  const where = req.about.kind === 'employer' ? ` at ${req.about.label}` : ` on ${req.about.label}`
  return `You ${verb} ${first}${req.about.label ? where : ''}${period ? `, ${period}` : ''}.`
}

// ---- 1. Intro ---------------------------------------------------------------------

function Intro({ req, onNext }: { req: RefereeRequest; onNext: () => void }) {
  const { t, consultant } = req
  const first = consultantFirst(req)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3.5">
        {consultant.photo_url ? (
          <img src={consultant.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">
            {consultant.name[0]}
          </span>
        )}
        <div>
          <h1 className="text-xl font-semibold leading-tight">{consultant.name} asked you for a short audio testimonial</h1>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-ink-soft">
        MavenScout is where international development organizations find consultants. Every expert listed is
        vouched for on record by someone they worked with. It takes about 5 minutes: up to 2 minutes of recording.
      </p>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">What {first} told us</p>
        <p className="mt-2 text-base font-medium">{t.reference_name}</p>
        <p className="text-sm text-ink-soft">{[t.reference_title, t.reference_org].filter(Boolean).join(', ')}</p>
        <p className="mt-2 text-sm text-ink-soft">{relationshipLine(req, detailsOf(t))}</p>
        {t.context && <p className="mt-1 text-sm text-ink-soft">On: {t.context}</p>}
        <p className="mt-2 text-xs text-ink-faint">You can correct anything after confirming it's you.</p>
      </Card>

      <PrivacyPromises first={first} />

      <button onClick={onNext} className={primary}>
        <ShieldCheck size={18} /> Confirm it's me
      </button>
      <p className="text-center text-xs text-ink-faint">We'll send a 6-digit code to {t.referee_email}.</p>
    </div>
  )
}

function PrivacyPromises({ first }: { first: string }) {
  const promises = [
    'Only verified hiring managers at recognised organizations can listen. Never public, never sold, never used to train AI.',
    'Streaming only, no downloads. Every listen is logged.',
    'Delete or withdraw it at any time with one click.',
    `Your recording is deleted if ${first} leaves MavenScout.`,
  ]
  return (
    <Card>
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Lock size={15} className="text-brand-500" /> Your recording, your control
      </p>
      <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
        {promises.map((p) => (
          <li key={p} className="flex gap-2">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ---- 2. Confirm it's me ---------------------------------------------------------

function CodeStep({
  req,
  setT,
  onConfirmed,
}: {
  req: RefereeRequest
  setT: (t: AudioTestimonial) => void
  onConfirmed: () => void
}) {
  const { t } = req
  const [devCode, setDevCode] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [needNew, setNeedNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const sentOnce = useRef(false)

  const send = async () => {
    setBusy(true)
    setMessage(null)
    const r = await sendCode(req.t, consultantFirst(req))
    setBusy(false)
    if (!r.ok) return setMessage(r.message)
    setT(r.t)
    setDevCode(r.devCode)
    setCode('')
    setNeedNew(false)
  }
  useEffect(() => {
    // Send the first code on arrival (React strict mode runs effects twice).
    if (sentOnce.current) return
    sentOnce.current = true
    send()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const verify = async () => {
    setBusy(true)
    const r = await verifyCode(req.t, code)
    setBusy(false)
    setT(r.t)
    if (r.ok) return onConfirmed()
    setMessage(r.message)
    setNeedNew(r.needNewCode)
  }

  const sendsLeft = TESTIMONIAL_RULES.codeMaxSends - t.code_sends
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Confirm it's you</h1>
      <p className="flex items-start gap-2 text-sm text-ink-soft">
        <Mail size={16} className="mt-0.5 shrink-0 text-brand-500" />
        <span>
          We sent a 6-digit code to <strong className="break-all">{t.referee_email}</strong>. It works once, for{' '}
          {TESTIMONIAL_RULES.codeTtlMinutes} minutes.
        </span>
      </p>

      {devCode && (
        <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 p-3 text-sm text-amber-950" role="note">
          <p className="text-xs font-semibold uppercase tracking-wide">Demo build: email isn't sent</p>
          <p className="mt-1">
            Your code is <span className="font-mono text-lg font-semibold tracking-widest">{devCode}</span>
          </p>
        </div>
      )}

      <label className="block text-sm font-medium">
        Code
        <input
          value={code}
          onChange={(e) => setCode(normalizeCodeInput(e.target.value))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="123456"
          className={`${input} text-center font-mono text-2xl tracking-[0.4em]`}
          aria-describedby="code-message"
        />
      </label>
      {message && (
        <p id="code-message" className="text-sm text-red-700" role="alert">
          {message}
        </p>
      )}
      <button onClick={verify} disabled={busy || code.length !== 6 || needNew} className={primary}>
        {busy ? 'Checking…' : 'Confirm'}
      </button>
      {sendsLeft > 0 ? (
        <button onClick={send} disabled={busy} className={secondary}>
          Send a new code ({sendsLeft} left)
        </button>
      ) : (
        <p className="text-center text-xs text-ink-faint">No new codes left for this link.</p>
      )}
    </div>
  )
}

// ---- 3. Review the details --------------------------------------------------------

function DetailsStep({
  req,
  setT,
  onAccepted,
}: {
  req: RefereeRequest
  setT: (t: AudioTestimonial) => void
  onAccepted: () => void
}) {
  const [d, setD] = useState<RefereeDetails>(detailsOf(req.t))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const first = consultantFirst(req)

  const accept = async () => {
    if (!d.reference_name.trim() || !d.reference_title.trim() || !d.reference_org.trim())
      return setError('Please fill in your name, current title and organization.')
    setBusy(true)
    try {
      setT(await acceptDetails(req.t, d))
      onAccepted()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Check the details</h1>
      <p className="text-sm text-ink-soft">
        These appear with your testimonial. Correct anything that isn't right.
        <span className="mt-1 block text-xs text-ink-faint">
          Confirmed email: <span className="break-all">{req.t.referee_email}</span>
        </span>
      </p>
      <label className="block text-sm font-medium">
        Your name
        <input className={input} value={d.reference_name} onChange={(e) => setD({ ...d, reference_name: e.target.value })} autoComplete="name" />
      </label>
      <label className="block text-sm font-medium">
        Your current job title
        <input className={input} value={d.reference_title} onChange={(e) => setD({ ...d, reference_title: e.target.value })} autoComplete="organization-title" />
      </label>
      <label className="block text-sm font-medium">
        Your current organization
        <input className={input} value={d.reference_org} onChange={(e) => setD({ ...d, reference_org: e.target.value })} autoComplete="organization" />
      </label>
      <div>
        <p className="mb-1.5 text-sm font-medium">How did you work with {first}?</p>
        <Segmented
          label="Relationship"
          value={d.relationship}
          onChange={(relationship) => setD({ ...d, relationship })}
          className="w-full [&_button]:py-2.5 [&_button]:text-sm"
          options={[
            { value: 'supervisor', label: `I supervised ${first}` },
            { value: 'client', label: `I was ${first}'s client` },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          From
          <input type="number" inputMode="numeric" className={input} value={d.period_start ?? ''} onChange={(e) => setD({ ...d, period_start: e.target.value ? +e.target.value : null })} />
        </label>
        <label className="block text-sm font-medium">
          To
          <input type="number" inputMode="numeric" placeholder="Present" className={input} value={d.period_end ?? ''} onChange={(e) => setD({ ...d, period_end: e.target.value ? +e.target.value : null })} />
        </label>
      </div>
      <label className="block text-sm font-medium">
        What you worked on <span className="font-normal text-ink-faint">(optional)</span>
        <textarea rows={2} className={input} value={d.context} onChange={(e) => setD({ ...d, context: e.target.value })} />
      </label>
      <p className="text-sm text-ink-soft">{relationshipLine(req, d)}</p>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <button onClick={accept} disabled={busy} className={primary}>
        {busy ? 'Saving…' : 'These details are accurate'}
      </button>
      <p className="text-center text-xs text-ink-faint">Accepting confirms these details are true to the best of your knowledge.</p>
    </div>
  )
}

// ---- 4–5. Record and submit ---------------------------------------------------------

function RecordStep({
  req,
  setT,
  onSubmitted,
  onLostConfirmation,
}: {
  req: RefereeRequest
  setT: (t: AudioTestimonial) => void
  onSubmitted: (audio: File, duration: number) => void
  onLostConfirmation: () => void
}) {
  const first = consultantFirst(req)
  const fileRef = useRef<HTMLInputElement>(null)
  const [recording, setRecording] = useState(false)
  const [audio, setAudio] = useState<{ file: File; seconds: number | null; url: string } | null>(null)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => {
    if (audio) URL.revokeObjectURL(audio.url)
  }, [audio])

  const choose = (file: File, seconds: number | null) => {
    setError(null)
    setAudio({ file, seconds, url: URL.createObjectURL(file) })
  }

  const submit = async () => {
    if (!audio) return
    setBusy(true)
    setError(null)
    try {
      if (!(await isConfirmedHere(req.t))) return onLostConfirmation()
      const r = await submitRecording(req.t, audio.file, audio.seconds)
      setT(r.t)
      onSubmitted(r.audio, r.duration)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Record your testimonial</h1>
      <Card>
        <p className="text-sm font-semibold">Up to 2 minutes, covering:</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>How did you work with {first}, and in what role?</li>
          <li>What did they deliver, and what difference did it make?</li>
          <li>Would you work with them again, and on what kind of assignment?</li>
        </ol>
        <p className="mt-3 text-xs text-ink-faint">
          Notes are fine. Speak in your own words. Please don't share confidential information.
        </p>
      </Card>

      {recording ? (
        <RecorderControl
          kind="audio"
          large
          maxSeconds={TESTIMONIAL_RULES.maxSeconds}
          onRecorded={(file, seconds) => {
            setRecording(false)
            choose(file, seconds)
          }}
          onCancel={() => setRecording(false)}
        />
      ) : audio ? (
        <Card>
          <p className="text-sm font-medium">Listen back</p>
          {/* Local preview of the referee's own recording, before upload. */}
          <audio src={audio.url} controls className="mt-2 w-full" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => { setAudio(null); setRecording(true) }} className={secondary}>
              <Mic size={16} /> Record again
            </button>
            <button onClick={() => fileRef.current?.click()} className={secondary}>
              <Upload size={16} /> Other file
            </button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2.5">
          <button onClick={() => setRecording(true)} className={primary}>
            <Mic size={18} /> Record here
          </button>
          <button onClick={() => fileRef.current?.click()} className={secondary}>
            <Upload size={17} /> Upload a voice memo
          </button>
          <p className="text-center text-xs text-ink-faint">Recording stops automatically at 2 minutes. Retake as often as you like.</p>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="audio/*,.m4a,.mp3,.wav,.aac"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) choose(f, null)
          e.target.value = ''
        }}
      />

      {audio && !recording && (
        <>
          <label className="flex items-start gap-3 rounded-xl border border-line bg-white p-3.5 text-sm text-ink-soft">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500" />
            <span>
              I agree that MavenScout may share this recording and its transcript with verified hiring managers, as
              described above, and that I can withdraw it at any time.
            </span>
          </label>
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          <button onClick={submit} disabled={!consent || busy} className={primary}>
            {busy ? 'Saving your recording…' : 'Submit testimonial'}
          </button>
        </>
      )}
    </div>
  )
}

// ---- 6. Transcript ------------------------------------------------------------------

function TranscriptStep({
  req,
  audio,
  setT,
  onDone,
}: {
  req: RefereeRequest
  audio: { file: File; duration: number } | null
  setT: (t: AudioTestimonial) => void
  onDone: () => void
}) {
  const [text, setText] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // Runs after submission; the testimonial is already saved.
    ;(async () => {
      const auto = await transcribeAudio({
        audio: audio?.file ?? new Blob(),
        durationSeconds: audio?.duration ?? req.t.duration_seconds,
        refereeName: req.t.reference_name ?? 'The referee',
        consultantName: req.consultant.name,
      })
      setT(await saveTranscript(req.t, auto, 'auto', false))
      setText(auto)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = async (source: 'auto' | 'edited') => {
    if (text === null) return onDone()
    setBusy(true)
    setT(await saveTranscript(req.t, text, source, true))
    setBusy(false)
    onDone()
  }

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm font-medium text-emerald-900" role="status">
        <CheckCircle2 size={18} /> Your recording is saved.
      </p>
      <h1 className="text-xl font-semibold">Check the transcript</h1>
      <p className="text-sm text-ink-soft">
        Optional. Fix names or acronyms if you like. If you leave now, it's published as auto-generated.
      </p>
      {TRANSCRIBE_IS_PLACEHOLDER && (
        <p className="text-xs text-amber-800">Demo build: speech-to-text is a placeholder, so the text below isn't your words.</p>
      )}
      {text === null ? (
        <p className="text-sm text-ink-faint">Transcribing…</p>
      ) : editing ? (
        <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} className={input} aria-label="Transcript" />
      ) : (
        <Card>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{text}</p>
        </Card>
      )}
      {editing ? (
        <button onClick={() => finish('edited')} disabled={busy} className={primary}>
          {busy ? 'Saving…' : 'Save transcript'}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setEditing(true)} disabled={text === null} className={secondary}>
            Edit
          </button>
          <button onClick={() => finish('auto')} disabled={busy || text === null} className={primary}>
            Looks good
          </button>
        </div>
      )}
    </div>
  )
}

// ---- 7. Thank you ---------------------------------------------------------------------

function ThanksStep({ req, setT }: { req: RefereeRequest; setT: (t: AudioTestimonial) => void }) {
  const { t } = req
  const first = consultantFirst(req)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-4 pt-2">
      <div className="text-center">
        <CheckCircle2 size={30} className="mx-auto text-emerald-600" />
        <h1 className="mt-2 text-2xl font-semibold">Thank you, {firstName(t.reference_name) ?? 'and done'}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
          {first} will listen and publish it. We'll email you when it's live, with a link to withdraw it at any time.
          This page is now locked.
        </p>
      </div>

      <Card>
        <p className="text-base font-semibold">Hiring consultants yourself?</p>
        <p className="mt-1 text-sm text-ink-soft">
          Get a free hiring-manager account: browse vetted experts, listen to testimonials, rank against your terms
          of reference. Your email is already confirmed.
        </p>
        <dl className="mt-3 space-y-0.5 rounded-xl bg-paper p-3 text-sm">
          <div><dt className="sr-only">Name</dt><dd className="font-medium">{t.reference_name}</dd></div>
          <div><dt className="sr-only">Organization</dt><dd className="text-ink-soft">{[t.reference_title, t.reference_org].filter(Boolean).join(', ')}</dd></div>
          <div><dt className="sr-only">Email</dt><dd className="break-all text-ink-soft">{t.referee_email}</dd></div>
        </dl>
        {t.referee_manager_id ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-emerald-900">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
            <span>
              Account created. <span className="text-ink-faint">Demo build: sign-in is mocked, so use the role switcher to browse as a hiring manager.</span>
            </span>
          </p>
        ) : (
          <button
            className={`${primary} mt-3`}
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                setT(await createManagerAccount(t))
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Creating…' : 'Create my free account'}
          </button>
        )}
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </Card>

      <label className="flex items-start gap-3 rounded-xl border border-line bg-white p-3.5 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={t.referee_opt_in}
          onChange={async (e) => setT(await setOptIn(t, e.target.checked))}
          className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500"
        />
        <span>Send me occasional updates about MavenScout. Without this, your email is used only for this testimonial.</span>
      </label>
    </div>
  )
}
