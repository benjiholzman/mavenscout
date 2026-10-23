import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { findManagerByEmail } from '../lib/managers'
import { resetEditorProfile, useSession } from '../lib/session'
import { FIRMS_ENABLED } from '../lib/config'

// Styled login screen backed by the MOCKED session (PRD 7.9): no real
// password check — submitting simply activates the chosen demo identity.
// Hiring: an email that belongs to a signed-up account (spec §9) signs in as
// that account, so its status (code, exception request) applies; any other
// email enters as the demo hiring manager.
// The developer's real-auth pass swaps the submit handler for Supabase Auth.

export default function Login() {
  const { setRole, signInAsManager } = useSession()
  const [email, setEmail] = useState('')
  const navigate = useNavigate()
  const [as, setAs] = useState<'hiring_manager' | 'consultant'>('hiring_manager')

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Demo build — any email and password work; pick which demo account to enter as.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          resetEditorProfile()
          const hm = as === 'hiring_manager' && email.trim() ? await findManagerByEmail(email) : null
          if (hm) signInAsManager(hm)
          else setRole(as)
          navigate(as === 'consultant' ? '/onboarding' : hm && hm.account_status !== 'active' ? '/signup' : '/')
        }}
      >
        <div className="grid grid-cols-2 gap-2 rounded-full border border-line bg-white p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setAs('hiring_manager')}
            className={`rounded-full px-3 py-1.5 ${
              as === 'hiring_manager' ? 'bg-brand-500 text-white' : 'text-ink-soft'
            }`}
          >
            I'm hiring
          </button>
          <button
            type="button"
            onClick={() => setAs('consultant')}
            className={`rounded-full px-3 py-1.5 ${
              as === 'consultant' ? 'bg-brand-500 text-white' : 'text-ink-soft'
            }`}
          >
            {FIRMS_ENABLED ? 'Consultant / firm' : 'Consultant'}
          </button>
        </div>
        <label className="block text-sm">
          <span className="font-medium">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@organization.org"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Password</span>
          <input
            type="password"
            placeholder="••••••••"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          Log in
        </button>
        <p className="text-center text-xs text-ink-faint">
          Forgot password? (Wired with real auth later.) · New here?{' '}
          <Link to="/signup" className="font-medium text-brand-600">
            Join MavenScout
          </Link>
        </p>
      </form>
    </div>
  )
}
