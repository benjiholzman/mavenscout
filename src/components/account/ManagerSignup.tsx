import { Building2, CheckCircle2, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrganizations } from '../../hooks/useOrganizations'
import { MANAGER_SIGNUP_RULES } from '../../lib/config'
import {
  checkInstitutionalEmail,
  confirmSignupCode,
  requestException,
  sendSignupCode,
  startSignup,
  type ExceptionInput,
} from '../../lib/managers'
import { ORG_TYPE_LABELS } from '../../lib/organizations'
import { useSession } from '../../lib/session'
import { normalizeCodeInput } from '../../lib/testimonials/code'
import { emailDomain } from '../../lib/testimonials/integrity'
import type { HiringManager } from '../../types/db'
import { ManagerStatusNotice } from './ManagerStatusNotice'

// Hiring-manager sign-up (docs/MavenScout-profiles-membership.md §9):
// institutional email → 6-digit code (mocked: shown on screen) → active.
// No institutional email → exception request, approved by an admin.
// The session is pinned to the new row from the first step, so a reload (or
// coming back later) resumes where the sign-up stands.

type Step = 'form' | 'code' | 'exception' | 'status'

const input =
  'mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400'
const primary =
  'w-full rounded-full bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50'
const linkButton = 'font-medium text-brand-600 hover:text-brand-700'

function initialStep(hm: HiringManager | null): Step {
  if (hm?.account_status === 'awaiting_code') return 'code'
  if (hm?.account_status === 'exception_pending') return 'status'
  return 'form'
}

export function ManagerSignup() {
  const { manager, signInAsManager } = useSession()
  const orgs = useOrganizations()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(() => initialStep(manager))
  const [name, setName] = useState(manager?.name ?? '')
  const [email, setEmail] = useState(manager?.email ?? '')
  const [touched, setTouched] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A pinned sign-up that loads after the page opens resumes where it stands.
  useEffect(() => {
    if (!manager) return
    setStep((s) => (s === 'form' ? initialStep(manager) : s))
    setName((n) => n || manager.name)
    setEmail((v) => v || (manager.email ?? ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager?.id])

  const check = email.includes('@') && emailDomain(email) ? checkInstitutionalEmail(email, orgs) : null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!check?.ok) return
    setBusy(true)
    setError(null)
    const r = await startSignup(name, check)
    setBusy(false)
    if (!r.ok) return setError(r.message)
    signInAsManager(r.hm)
    setDevCode(r.devCode)
    setStep('code')
  }

  const declined = manager?.account_status === 'exception_declined'

  if (step === 'code' && manager)
    return (
      <CodeStep
        hm={manager}
        devCode={devCode}
        onCode={setDevCode}
        onUpdate={signInAsManager}
        onDone={() => navigate('/')}
        onStartOver={() => setStep('form')}
      />
    )
  if (step === 'status') return <ManagerStatusNotice manager={manager} compact />
  if (step === 'exception')
    return (
      <ExceptionForm
        defaults={{ name, email }}
        onBack={() => setStep('form')}
        onSubmitted={(hm) => {
          signInAsManager(hm)
          setStep('status')
        }}
      />
    )

  return (
    <form onSubmit={submit} className="space-y-3">
      {declined && (
        <div className="rounded-lg bg-paper p-3">
          <ManagerStatusNotice manager={manager} compact showCta={false} />
        </div>
      )}
      <label className="block text-sm">
        <span className="font-medium">Your name</span>
        <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className={input} autoComplete="name" />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Work email</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="you@organization.org"
          className={input}
          autoComplete="email"
          aria-describedby="signup-email-check"
        />
      </label>
      <div id="signup-email-check" aria-live="polite" className="min-h-[1.25rem] text-xs">
        {check?.ok ? (
          <p className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 size={14} className="shrink-0" />
            {check.org.name} · {ORG_TYPE_LABELS[check.org.type]}
          </p>
        ) : check && touched ? (
          <p className="text-red-700">{check.message}</p>
        ) : (
          <p className="text-ink-faint">Use your email at a recognised organization: donors, UN agencies, NGOs, governments, firms, universities.</p>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || (touched && !check?.ok)} className={primary}>
        {busy ? 'Creating your account…' : 'Create free account'}
      </button>
      <p className="text-xs leading-relaxed text-ink-soft">
        No work email at a recognised organization, such as a small NGO or ministry using Gmail?{' '}
        <button type="button" onClick={() => setStep('exception')} className={linkButton}>
          Request an account
        </button>
        . We review requests by hand, {MANAGER_SIGNUP_RULES.exceptionTurnaround}.
      </p>
    </form>
  )
}

function CodeStep({
  hm,
  devCode,
  onCode,
  onUpdate,
  onDone,
  onStartOver,
}: {
  hm: HiringManager
  devCode: string | null
  onCode: (code: string) => void
  onUpdate: (hm: HiringManager) => void
  onDone: () => void
  onStartOver: () => void
}) {
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  // Resumed after a reload: the code already sent still works (it's in their
  // inbox); only a sign-up with none sent needs one first.
  const sent = !!devCode || !!hm.code_hash
  const [needNew, setNeedNew] = useState(!sent)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const resend = async () => {
    setBusy(true)
    setMessage(null)
    const r = await sendSignupCode(hm)
    setBusy(false)
    if (!r.ok) return setMessage(r.message)
    onUpdate(r.hm)
    onCode(r.devCode)
    setCode('')
    setNeedNew(false)
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const r = await confirmSignupCode(hm, code)
    setBusy(false)
    onUpdate(r.hm)
    if (r.ok) return setDone(true)
    setMessage(r.message)
    setNeedNew(r.needNewCode)
  }

  if (done)
    return (
      <div className="space-y-3" role="status">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 size={18} className="text-emerald-600" /> You’re in
        </p>
        <p className="text-sm text-ink-soft">
          Save candidates into openings, listen to audio testimonials, watch Video Q&As and rank experts against your
          terms of reference.
        </p>
        <p className="text-xs text-ink-faint">
          Demo build: sign-in is mocked, so your openings are the demo hiring manager’s.
        </p>
        <button onClick={onDone} className={primary}>
          Browse experts
        </button>
      </div>
    )

  const sendsLeft = MANAGER_SIGNUP_RULES.codeMaxSends - hm.code_sends
  return (
    <form onSubmit={verify} className="space-y-3">
      <p className="flex items-start gap-2 text-sm text-ink-soft">
        <Mail size={16} className="mt-0.5 shrink-0 text-brand-500" />
        <span>
          {sent ? 'We sent' : 'We’ll send'} a 6-digit code to <strong className="break-all text-ink">{hm.email}</strong>. It
          works once, for {MANAGER_SIGNUP_RULES.codeTtlMinutes} minutes.
        </span>
      </p>
      {hm.organization && (
        <p className="flex items-center gap-2 text-xs text-ink-faint">
          <Building2 size={13} /> {hm.organization}
        </p>
      )}
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
          aria-describedby="signup-code-message"
        />
      </label>
      {message && (
        <p id="signup-code-message" className="text-sm text-red-700" role="alert">
          {message}
        </p>
      )}
      <button type="submit" disabled={busy || code.length !== 6 || needNew} className={primary}>
        {busy ? 'Checking…' : 'Confirm'}
      </button>
      <p className="flex flex-wrap justify-between gap-2 text-xs text-ink-soft">
        {sendsLeft > 0 ? (
          <button type="button" onClick={resend} disabled={busy} className={linkButton}>
            {sent ? 'Send a new code' : 'Send the code'}
          </button>
        ) : (
          <span>No more codes for this address right now.</span>
        )}
        <button type="button" onClick={onStartOver} className={linkButton}>
          Use a different email
        </button>
      </p>
    </form>
  )
}

function ExceptionForm({
  defaults,
  onBack,
  onSubmitted,
}: {
  defaults: { name: string; email: string }
  onBack: () => void
  onSubmitted: (hm: HiringManager) => void
}) {
  const [form, setForm] = useState<ExceptionInput>({ ...defaults, organization: '', website: '', reason: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (patch: Partial<ExceptionInput>) => setForm({ ...form, ...patch })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const r = await requestException(form)
    setBusy(false)
    if (!r.ok) return setError(r.message)
    onSubmitted(r.hm)
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-ink-soft">
        Tell us who you hire for. Someone at MavenScout checks each request by hand,{' '}
        {MANAGER_SIGNUP_RULES.exceptionTurnaround}.
      </p>
      <label className="block text-sm">
        <span className="font-medium">Your name</span>
        <input required minLength={2} value={form.name} onChange={(e) => set({ name: e.target.value })} className={input} />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Email</span>
        <input required type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} className={input} />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Organization</span>
        <input required minLength={2} value={form.organization} onChange={(e) => set({ organization: e.target.value })} className={input} />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Organization website (optional)</span>
        <input value={form.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://…" className={input} />
      </label>
      <label className="block text-sm">
        <span className="font-medium">What do you hire consultants for?</span>
        <textarea
          required
          minLength={20}
          rows={3}
          value={form.reason}
          onChange={(e) => set({ reason: e.target.value })}
          placeholder="e.g. We're a community health NGO in Malawi and commission two or three evaluations a year."
          className={input}
        />
      </label>
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={primary}>
        {busy ? 'Sending…' : 'Request an account'}
      </button>
      <button type="button" onClick={onBack} className={`text-xs ${linkButton}`}>
        Back to sign-up with a work email
      </button>
    </form>
  )
}
