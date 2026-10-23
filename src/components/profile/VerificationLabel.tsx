import { BadgeCheck, Clock, FileCheck2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ProfileLabel } from '../../lib/verification/state'
import { Tooltip } from '../ui/Tooltip'

// Verification labels on profiles (docs/MavenScout-profiles-membership.md
// §3.1): Confirmed, Document reviewed, or — certifications only — Pending
// check. Unlabelled items are self-reported and carry no mark.

const LABELS: Record<ProfileLabel, { text: string; tip: string; icon: typeof BadgeCheck; cls: string }> = {
  confirmed: {
    text: 'Confirmed',
    tip: 'Checked by MavenScout with an independent source.',
    icon: BadgeCheck,
    cls: 'text-emerald-700',
  },
  document_reviewed: {
    text: 'Document reviewed',
    tip: 'MavenScout examined the evidence and found it genuine-looking; not confirmed with the source.',
    icon: FileCheck2,
    cls: 'text-emerald-700',
  },
  pending: {
    text: 'Pending check',
    tip: 'Every certification is checked; MavenScout hasn’t checked this one yet.',
    icon: Clock,
    cls: 'text-ink-faint',
  },
}

export function VerificationLabel({ label }: { label: ProfileLabel | undefined }) {
  if (!label) return null
  const { text, tip, icon: Icon, cls } = LABELS[label]
  return (
    <Tooltip tapToggle content={tip}>
      <button
        type="button"
        aria-label={`${text}: ${tip}`}
        className={`inline-flex items-center gap-1 rounded-full align-middle text-xs font-medium ${cls} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`}
      >
        <Icon size={13} className="shrink-0" />
        {text}
      </button>
    </Tooltip>
  )
}

/** The one-line legend (§3.1). */
export function VerificationLegend({ pending = false }: { pending?: boolean }) {
  return (
    <p className="text-xs leading-relaxed text-ink-faint">
      <BadgeCheck size={12} className="inline align-[-2px] text-emerald-700" /> Confirmed: checked with an independent
      source · <FileCheck2 size={12} className="inline align-[-2px] text-emerald-700" /> Document reviewed: evidence
      examined{pending ? ' · Pending check: a certification not checked yet' : ''} · Unmarked: self-reported.{' '}
      <Link to="/about#verification" className="font-medium text-brand-600 hover:text-brand-700">
        What verification means
      </Link>
    </p>
  )
}
