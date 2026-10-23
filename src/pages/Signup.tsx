import { Briefcase, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setEditorProfileId, useSession } from '../lib/session'
import { supabase } from '../lib/supabase'
import { slugifyHandle } from '../lib/validation'
import { FIRMS_ENABLED } from '../lib/config'

// Styled signup backed by the MOCKED session (PRD 7.9). Two personas:
// hiring (free account) and consultant/firm (paid profile → onboarding).
// Consultant signup creates a real pending profile row so onboarding has a
// draft to edit — that part exercises the actual data path.
// Copy note (PRD 7.4): user-facing text avoids the stiff "hiring manager".

export default function Signup() {
  const { setRole } = useSession()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startConsultant(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    const base = slugifyHandle(name)
    const handle = `${base}-${Math.random().toString(36).slice(2, 6)}`
    const { data, error: err } = await supabase
      .from('profiles')
      .insert({
        consultant_type: 'Individual',
        handle,
        name: name.trim(),
        headline: '',
        approval_status: 'pending',
        subscription_status: 'none',
      })
      .select('id')
      .single()
    setCreating(false)
    if (err) return setError(err.message)
    setEditorProfileId(data.id)
    setRole('consultant')
    navigate('/onboarding')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Join MavenScout</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Demo build — no email verification or payment; accounts are mocked demo sessions.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div className="rounded-card border border-line bg-white p-6">
          <Briefcase size={20} className="text-brand-500" />
          <h2 className="mt-3 font-display text-lg font-semibold">I'm here to hire</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            Free for organizations. Save candidates into openings, collaborate with your team,
            watch Video Q&As, and rank against a job description.
          </p>
          <button
            onClick={() => {
              setRole('hiring_manager')
              navigate('/')
            }}
            className="mt-5 w-full rounded-full bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            Create free account
          </button>
        </div>

        <div className="rounded-card border border-line bg-white p-6">
          <UserRound size={20} className="text-brand-500" />
          <h2 className="mt-3 font-display text-lg font-semibold">I'm a {FIRMS_ENABLED ? 'consultant or firm' : 'consultant'}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            One profile: your listing in a curated pool and your public professional website.
            Small monthly fee after approval.
          </p>
          <form onSubmit={startConsultant} className="mt-5 space-y-2.5">
            <input
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={FIRMS_ENABLED ? 'Your name or firm name' : 'Your name'}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-full border border-brand-500 px-5 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
            >
              {creating ? 'Creating draft profile…' : 'Start building your profile'}
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  )
}
