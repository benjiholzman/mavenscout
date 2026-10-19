import { FlaskConical, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetEditorProfile, useSession, type Role } from '../../lib/session'

// ---------------------------------------------------------------------------
// DEV-ONLY ROLE SWITCHER (PRD 7.9 — required for testability).
// Instantly switches the mocked identity with no credentials so every state
// is testable: gates locking/unlocking, role-appropriate menus, /admin, the
// two profile-view contexts.
//
// REMOVAL (real-auth pass): delete this file and its single <DevRoleSwitcher/>
// mount in AppLayout.tsx. Nothing else references it.
// ---------------------------------------------------------------------------

const ROLES: { value: Role; label: string }[] = [
  { value: 'logged_out', label: 'Logged out' },
  { value: 'hiring_manager', label: 'Hiring manager' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'admin', label: 'Admin' },
]

export function DevRoleSwitcher() {
  const { role, setRole } = useSession()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      {open ? (
        <div className="w-60 rounded-xl border border-line bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Dev: viewing as
            </p>
            <button onClick={() => setOpen(false)} aria-label="Close role switcher">
              <X size={14} className="text-ink-faint hover:text-ink" />
            </button>
          </div>
          <div className="space-y-1">
            {ROLES.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  resetEditorProfile() // switching identity discards any signup draft pin
                  setRole(r.value)
                  setOpen(false)
                  if (r.value === 'admin') navigate('/admin')
                }}
                className={`w-full rounded-lg px-2.5 py-1.5 text-left text-sm ${
                  role === r.value
                    ? 'bg-brand-50 font-semibold text-brand-700'
                    : 'text-ink-soft hover:bg-paper'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          title="Dev role switcher (mocked auth)"
          aria-label={`Dev role switcher — viewing as ${ROLES.find((r) => r.value === role)?.label}`}
          className="flex items-center gap-1.5 rounded-full bg-ink/85 p-2.5 text-xs font-medium text-white shadow-lg backdrop-blur hover:bg-ink sm:px-3 sm:py-2"
        >
          <FlaskConical size={13} className="text-gold-300" />
          {/* icon-only at phone width so it doesn't sit on top of CTAs */}
          <span className="hidden sm:inline">{ROLES.find((r) => r.value === role)?.label}</span>
        </button>
      )}
    </div>
  )
}
