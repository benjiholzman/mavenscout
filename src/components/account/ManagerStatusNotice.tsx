import { Clock, MailCheck, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MANAGER_SIGNUP_RULES } from '../../lib/config'
import type { HiringManager } from '../../types/db'

/** Where a hiring manager's sign-up stands while their account isn't active
 *  (spec §9): shown in place of the gated features, which stay locked until
 *  then. Browsing and filtering stay open. */
export function ManagerStatusNotice({
  manager,
  compact = false,
  showCta = true,
}: {
  manager: HiringManager | null
  compact?: boolean
  showCta?: boolean
}) {
  if (!manager) return <p className="text-sm text-ink-faint">Checking your account…</p>
  const { icon: Icon, title, body, cta } = describe(manager)
  return (
    <div className={compact ? '' : 'rounded-card border border-line bg-white p-5'} role="status">
      <p className="flex items-center gap-2 font-semibold text-ink">
        <Icon size={18} className="shrink-0 text-brand-500" />
        {title}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
      {manager.account_status === 'exception_declined' && manager.exception_note && (
        <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-sm text-ink-soft">“{manager.exception_note}”</p>
      )}
      {cta && showCta && (
        <Link
          to="/signup"
          className="mt-4 inline-block rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          {cta}
        </Link>
      )}
    </div>
  )
}

function describe(hm: HiringManager) {
  switch (hm.account_status) {
    case 'awaiting_code':
      return {
        icon: MailCheck,
        title: 'Confirm your email to finish signing up',
        body: `Enter the 6-digit code we sent to ${hm.email}. Until then you can browse and filter every profile.`,
        cta: 'Enter your code',
      }
    case 'exception_pending':
      return {
        icon: Clock,
        title: 'We’re reviewing your request',
        body: `Someone at MavenScout checks each request by hand, ${MANAGER_SIGNUP_RULES.exceptionTurnaround}. We’ll email ${hm.email} when your account is ready. Until then you can browse and filter every profile.`,
        cta: null,
      }
    case 'exception_declined':
      return {
        icon: XCircle,
        title: 'We couldn’t approve your request',
        body: 'You can still browse and filter every profile. If you have a work email at a recognised organization, sign up with that instead.',
        cta: 'Sign up with a work email',
      }
    default:
      return { icon: MailCheck, title: 'Your account is active', body: '', cta: null }
  }
}
