import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// ---------------------------------------------------------------------------
// MOCKED SESSION (PRD 7.9) — no real auth in this build.
// The dev role switcher (step 4) flips `role`; everything downstream reads it
// through useSession(). The developer's real-auth pass replaces this file's
// internals with Supabase Auth — the hook surface should survive unchanged.
// ---------------------------------------------------------------------------

export type Role = 'logged_out' | 'hiring_manager' | 'consultant' | 'admin'

// Fixed demo identities — must match supabase/003_seed_demo_accounts.sql.
export const DEMO_HIRING_MANAGER_ID = 'aaaaaaaa-0000-4000-a000-000000000001'
export const DEMO_REVIEWER_IDS = [
  'aaaaaaaa-0000-4000-a000-000000000002',
  'aaaaaaaa-0000-4000-a000-000000000003',
] as const
// Demo consultant impersonates the seeded profile "amara-diallo".
export const DEMO_CONSULTANT_PROFILE_ID = '388093d4-21e1-413a-a718-4296a10a44fc'
export const DEMO_CONSULTANT_HANDLE = 'amara-diallo'

const STORAGE_KEY = 'ms_dev_role'

interface SessionValue {
  role: Role
  setRole: (role: Role) => void
  /** Convenience: any signed-in state (the free-account gate in PRD 7.9a). */
  isLoggedIn: boolean
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'hiring_manager' || stored === 'consultant' || stored === 'admin'
      ? stored
      : 'logged_out'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, role)
  }, [role])

  return (
    <SessionContext.Provider
      value={{ role, setRole: setRoleState, isLoggedIn: role !== 'logged_out' }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}

// ---------------------------------------------------------------------------
// Which profile does the mocked consultant edit?
// Default: the seeded demo consultant. A fresh signup creates a new pending
// profile and pins its id here so onboarding continues on that draft.
// ---------------------------------------------------------------------------

const EDITOR_PROFILE_KEY = 'ms_editor_profile_id'

export function getEditorProfileId(): string {
  return localStorage.getItem(EDITOR_PROFILE_KEY) ?? DEMO_CONSULTANT_PROFILE_ID
}

export function setEditorProfileId(id: string) {
  localStorage.setItem(EDITOR_PROFILE_KEY, id)
}

export function resetEditorProfile() {
  localStorage.removeItem(EDITOR_PROFILE_KEY)
}
