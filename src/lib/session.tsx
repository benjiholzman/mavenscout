import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadManager } from './managers'
import type { HiringManager } from '../types/db'

// ---------------------------------------------------------------------------
// MOCKED SESSION (PRD 7.9) — no real auth in this build.
// The dev role switcher (step 4) flips `role`; everything downstream reads it
// through useSession(). The developer's real-auth pass replaces this file's
// internals with Supabase Auth — the hook surface should survive unchanged.
// A hiring manager who signs up (spec §9) is pinned by their row id so the
// gate follows their account status; their workspace (openings, rankings,
// notes) is still the demo hiring manager's (DEMO_HIRING_MANAGER_ID) until
// real auth gives every account its own.
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
/** Who admin decisions are recorded as, while admin sign-in is mocked. */
export const DEMO_ADMIN_NAME = 'Demo Admin'

const STORAGE_KEY = 'ms_dev_role'
/** The signed-up hiring manager the session is pinned to; none = the demo
 *  hiring manager. */
const MANAGER_KEY = 'ms_manager_id'

function readManagerPin(): string {
  try {
    return localStorage.getItem(MANAGER_KEY) ?? DEMO_HIRING_MANAGER_ID
  } catch {
    return DEMO_HIRING_MANAGER_ID
  }
}

interface SessionValue {
  role: Role
  /** Switch the mocked identity. A hiring manager becomes the demo account
   *  (any pinned sign-up is dropped); use signInAsManager for a real row. */
  setRole: (role: Role) => void
  /** Any signed-in state: the header and user menu. */
  isLoggedIn: boolean
  /** Unlocks the free-account gate (PRD 7.9a; spec §9): signed in, and for a
   *  hiring manager, an active account. A sign-up still waiting on its email
   *  code or an exception request is signed in but gated. */
  hasAccess: boolean
  /** The hiring-manager row the session is signed in as (null for other
   *  roles, and while it loads). */
  manager: HiringManager | null
  /** Sign in as a hiring-manager row (sign-up, exception request, login by
   *  email). */
  signInAsManager: (hm: HiringManager) => void
  /** Re-read the manager row (e.g. after an admin decision). */
  refreshManager: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'hiring_manager' || stored === 'consultant' || stored === 'admin'
      ? stored
      : 'logged_out'
  })
  const [managerId, setManagerId] = useState<string>(readManagerPin)
  const [manager, setManager] = useState<HiringManager | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, role)
  }, [role])

  useEffect(() => {
    if (managerId === DEMO_HIRING_MANAGER_ID) localStorage.removeItem(MANAGER_KEY)
    else localStorage.setItem(MANAGER_KEY, managerId)
  }, [managerId])

  const refreshManager = useCallback(async () => {
    setManager(await loadManager(managerId))
  }, [managerId])

  useEffect(() => {
    if (role !== 'hiring_manager') return setManager(null)
    setManager((m) => (m?.id === managerId ? m : null))
    refreshManager()
  }, [role, managerId, refreshManager])

  const setRole = useCallback((next: Role) => {
    setManagerId(DEMO_HIRING_MANAGER_ID)
    setRoleState(next)
  }, [])

  const signInAsManager = useCallback((hm: HiringManager) => {
    setManager(hm)
    setManagerId(hm.id)
    setRoleState('hiring_manager')
  }, [])

  // The demo manager is active; while a pinned sign-up loads, stay gated.
  const managerActive =
    manager?.id === managerId ? manager.account_status === 'active' : managerId === DEMO_HIRING_MANAGER_ID
  const isLoggedIn = role !== 'logged_out'

  return (
    <SessionContext.Provider
      value={{
        role,
        setRole,
        isLoggedIn,
        hasAccess: isLoggedIn && (role !== 'hiring_manager' || managerActive),
        manager: role === 'hiring_manager' ? manager : null,
        signInAsManager,
        refreshManager,
      }}
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
