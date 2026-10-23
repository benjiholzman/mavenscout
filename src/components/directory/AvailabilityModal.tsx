import { useState } from 'react'
import { DEFAULT_AVAILABILITY, isDefaultAvailability, type AvailabilityFilter } from '../../lib/filters'
import { Modal } from '../ui/Modal'
import { AvailabilityControls } from './AvailabilityControls'

// Availability filter modal (PRD 7.1/7.16): which tracks, and when by.
// Deliberately just those two questions — no duration precision the
// self-reported data can't support. Applying the defaults (both tracks, any
// time) clears the filter.

export function AvailabilityModal({
  open,
  onClose,
  value,
  onApply,
}: {
  open: boolean
  onClose: () => void
  value: AvailabilityFilter | null
  onApply: (next: AvailabilityFilter | null) => void
}) {
  // Mounted only while open (FilterBar), so each opening starts from the
  // current filter, including a change made with the Available now toggle.
  const [draft, setDraft] = useState<AvailabilityFilter>(value ?? DEFAULT_AVAILABILITY)

  return (
    <Modal open={open} onClose={onClose} title="Availability">
      <div className="space-y-5">
        <AvailabilityControls value={draft} onChange={setDraft} />

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <button
            className="text-sm font-medium text-ink-faint hover:text-ink"
            onClick={() => {
              onApply(null)
              onClose()
            }}
          >
            Clear
          </button>
          <button
            className="rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600"
            onClick={() => {
              onApply(isDefaultAvailability(draft) ? null : draft)
              onClose()
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </Modal>
  )
}
