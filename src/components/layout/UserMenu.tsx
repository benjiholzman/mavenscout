import { ChevronDown, CreditCard, LayoutDashboard, ListChecks, LogOut, Settings, UserPen } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession, type Role } from '../../lib/session'

// Top-right user menu (PRD 7.9b) — role-appropriate items.
// Consultant: My Profile / Account Settings / Billing / Log out.
// Hiring manager: My Openings / Account Settings / Log out (free — no billing).
// Admin: Admin panel / Log out.

const IDENTITY: Record<Exclude<Role, 'logged_out'>, { name: string; initials: string }> = {
  hiring_manager: { name: 'Demo Hiring Manager', initials: 'DH' },
  consultant: { name: 'Demo Consultant', initials: 'DC' },
  admin: { name: 'Demo Admin', initials: 'DA' },
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function UserMenu() {
  const { role, setRole, manager } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (role === 'logged_out') return null
  // A signed-up hiring manager (spec §9) shows as themself.
  const identity =
    role === 'hiring_manager' && manager && manager.name
      ? { name: manager.name, initials: initialsOf(manager.name) }
      : IDENTITY[role]

  const items =
    role === 'consultant'
      ? [
          { to: '/onboarding', label: 'My Profile', icon: UserPen },
          { to: '/account', label: 'Account Settings', icon: Settings },
          { to: '/billing', label: 'Billing', icon: CreditCard },
        ]
      : role === 'hiring_manager'
        ? [
            { to: '/openings', label: 'My Openings', icon: ListChecks },
            { to: '/account', label: 'Account Settings', icon: Settings },
          ]
        : [{ to: '/admin', label: 'Admin panel', icon: LayoutDashboard }]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-2.5 text-sm font-medium text-ink-soft hover:border-ink-faint"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
          {identity.initials}
        </span>
        <span className="hidden lg:inline">{identity.name}</span>
        <ChevronDown size={14} className={open ? 'rotate-180 transition' : 'transition'} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-line bg-white p-1.5 shadow-xl" role="menu">
          <p className="px-2.5 pb-1.5 pt-1 text-xs text-ink-faint lg:hidden">{identity.name}</p>
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-soft hover:bg-paper hover:text-ink"
            >
              <item.icon size={15} /> {item.label}
            </Link>
          ))}
          <button
            role="menuitem"
            onClick={() => {
              setRole('logged_out')
              setOpen(false)
              navigate('/')
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-soft hover:bg-paper hover:text-ink"
          >
            <LogOut size={15} /> Log out
          </button>
        </div>
      )}
    </div>
  )
}
