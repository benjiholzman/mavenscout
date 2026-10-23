import { Clapperboard, Send } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  createRequests,
  listRequestsForOpening,
  MAX_OUTSTANDING_PER_OPENING,
  type RequestWithProfile,
} from '../../lib/videoRequests'
import type { OpeningEntry, Profile } from '../../types/db'
import { VideoPlayer } from '../media/VideoPlayer'
import { Modal } from '../ui/Modal'

// Manager side of async video requests (PRD 7.17): pick up to 3 of the
// opening's candidates, send the standing "why this role" prompt with the
// opening's JD attached. Submitted responses play right here, alongside the
// candidate's other material.

const STATUS_STYLE: Record<string, string> = {
  sent: 'bg-amber-100 text-amber-800',
  submitted: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-ink/10 text-ink-faint',
}

export function VideoRequestsPanel({
  openingId,
  entries,
  profiles,
  jobDescriptionId,
}: {
  openingId: string
  entries: OpeningEntry[]
  profiles: Map<string, Profile>
  /** The opening's saved ranking JD, if one exists — travels with requests. */
  jobDescriptionId: string | null
}) {
  const [requests, setRequests] = useState<RequestWithProfile[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [watching, setWatching] = useState<RequestWithProfile | null>(null)

  const reload = useCallback(
    () => listRequestsForOpening(openingId).then(setRequests),
    [openingId],
  )
  useEffect(() => {
    reload()
  }, [reload])

  const outstanding = requests.filter((r) => r.status === 'sent').length
  const slotsLeft = MAX_OUTSTANDING_PER_OPENING - outstanding
  const requestable = entries.filter(
    (e) => !requests.some((r) => r.profile_id === e.profile_id && r.status !== 'declined'),
  )

  return (
    <div className="rounded-card border border-line bg-white p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <Clapperboard size={15} className="text-brand-500" /> Async video responses
      </h3>
      <p className="mt-1 text-xs text-ink-faint">
        Ask up to {MAX_OUTSTANDING_PER_OPENING} candidates for a ≤5-minute "why this role" video —
        screening across time zones without scheduling a call.
      </p>

      {requests.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {requests.map((r) => (
            <li key={r.id} className="rounded-lg bg-paper px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{r.profiles?.name ?? '?'}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[r.status]}`}>
                  {r.status}
                </span>
              </div>
              {r.status === 'submitted' && (
                <button
                  onClick={() => setWatching(r)}
                  className="mt-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Watch response
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => {
          setSelected(new Set())
          setError(null)
          setModalOpen(true)
        }}
        disabled={slotsLeft <= 0 || requestable.length === 0}
        className="mt-2.5 flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        title={slotsLeft <= 0 ? `Max ${MAX_OUTSTANDING_PER_OPENING} outstanding requests` : undefined}
      >
        <Send size={12} /> Request videos… ({slotsLeft} slot{slotsLeft === 1 ? '' : 's'} left)
      </button>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Request video responses">
        <p className="text-xs text-ink-faint">
          Each candidate is asked: <em>"Why do you want this role, and why do you believe you'd
          excel in it?"</em> — max 5 minutes, with this opening's JD attached.
          <strong> Email notification is stubbed this build</strong> — the request appears in the
          candidate's logged-in view.
        </p>
        <div className="mt-3 space-y-1.5">
          {requestable.map((e) => {
            const p = profiles.get(e.profile_id)
            if (!p) return null
            const checked = selected.has(e.profile_id)
            return (
              <label key={e.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm hover:bg-paper">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && selected.size >= slotsLeft}
                  onChange={(ev) => {
                    const next = new Set(selected)
                    ev.target.checked ? next.add(e.profile_id) : next.delete(e.profile_id)
                    setSelected(next)
                  }}
                  className="accent-brand-500"
                />
                <span className="font-medium">{p.name}</span>
                <span className="truncate text-xs text-ink-faint">{p.headline}</span>
              </label>
            )
          })}
          {requestable.length === 0 && (
            <p className="text-sm text-ink-faint">Every candidate here has already been asked.</p>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <button
          disabled={selected.size === 0}
          onClick={async () => {
            try {
              await createRequests(openingId, [...selected], jobDescriptionId)
              setModalOpen(false)
              reload()
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e))
            }
          }}
          className="mt-4 w-full rounded-full bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          Send {selected.size || ''} request{selected.size === 1 ? '' : 's'}
        </button>
      </Modal>

      {watching && (
        <Modal open onClose={() => setWatching(null)} title={`${watching.profiles?.name} — video response`} wide>
          <p className="mb-2 text-xs text-ink-faint">"{watching.prompt}"</p>
          <VideoPlayer
            video={{ video_url: watching.video_url, video_path: watching.video_path }}
            title="Async video response"
          />
        </Modal>
      )}
    </div>
  )
}
