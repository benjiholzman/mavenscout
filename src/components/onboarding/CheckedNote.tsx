import { AlertTriangle, BadgeCheck } from 'lucide-react'
import { LABEL_TEXT, type VerificationLabel } from '../../lib/verification/state'

/** A checked item's label in the editor (spec §3.1): editing the checked
 *  fields removes it until it's re-checked, so say so before the save. */
export interface CheckedMark {
  label: VerificationLabel
  /** The fingerprint it was checked with (lib/verification/items). */
  fingerprint: string
  /** Confirmed by a referee's work email rather than an admin check. */
  viaTestimonial?: boolean
}

export function CheckedNote({ mark, current, fields }: { mark: CheckedMark | undefined; current: string; fields: string }) {
  if (!mark) return null
  const label = LABEL_TEXT[mark.label]
  if (mark.fingerprint !== current)
    return (
      <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900" role="status">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        Saving this change removes the {label} label until it’s checked again.
      </p>
    )
  return (
    <p className="flex items-start gap-1.5 text-xs text-ink-soft">
      <BadgeCheck size={13} className="mt-0.5 shrink-0 text-emerald-600" />
      <span>
        {label}
        {mark.viaTestimonial ? ' by your referee’s work email' : ''}. Editing the {fields} removes the label until it’s
        checked again.
      </span>
    </p>
  )
}
