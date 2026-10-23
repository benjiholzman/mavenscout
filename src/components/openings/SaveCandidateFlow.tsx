import { Bookmark, Plus, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createOpening, openingDisplayName, removeEntry, saveToOpening, setListTag } from '../../lib/openings'
import { generalUsage, refreshSaved, savedMarks, useSavedState, type SavedState } from '../../lib/savedState'
import { useSession } from '../../lib/session'
import type { Opening, Profile } from '../../types/db'
import { Modal } from '../ui/Modal'
import { SignupPrompt } from '../ui/SignupPrompt'

// Saving a candidate (PRD 7.4). The bookmark adds them to an opening's long
// list (Favorites), the star to its short list (Starred, which is inside the
// long list: one entry row, list_tag records the tier). Either opens a small
// chooser: General (the default quick-save opening), the manager's openings,
// or "+ New opening". The last choice is pre-selected, so saving is two taps.
// Where the candidate is already saved, the chooser says so, with a one-tap
// remove (bookmark) or unstar (star). General is capped (GENERAL_LIST_LIMITS);
// named openings aren't. A dialog on desktop, a bottom sheet on phones.

export type SaveMode = 'favorite' | 'top_pick'

const LAST_KEY = 'ms_save_last_opening'
function readLast(): string | null {
  try {
    return localStorage.getItem(LAST_KEY)
  } catch {
    return null
  }
}
function writeLast(id: string) {
  try {
    localStorage.setItem(LAST_KEY, id)
  } catch {
    // per-browser convenience only
  }
}

const isManager = (role: string, hasAccess: boolean) => hasAccess && role === 'hiring_manager'

/** Filled-icon state for one candidate (false for anyone but a manager). */
export function useSavedMarks(profileId: string) {
  const { hasAccess, role } = useSession()
  const s = useSavedState(isManager(role, hasAccess))
  return isManager(role, hasAccess) ? savedMarks(s, profileId) : { saved: false, starred: false, entries: [] }
}

export function useSaveCandidate() {
  const { hasAccess, role } = useSession()
  const [gate, setGate] = useState(false)
  const [chooser, setChooser] = useState<{ profile: Profile; mode: SaveMode } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const save = (profile: Profile, mode: SaveMode) => {
    if (!isManager(role, hasAccess)) {
      setGate(true)
      return
    }
    setChooser({ profile, mode })
  }

  const ui = (
    <>
      <SignupPrompt open={gate} onClose={() => setGate(false)} feature="Saving candidates into openings" />
      {chooser && (
        <SaveChooser
          profile={chooser.profile}
          mode={chooser.mode}
          onClose={() => setChooser(null)}
          onSaved={setToast}
        />
      )}
      {toast && (
        <div
          className="fixed bottom-4 left-1/2 z-[55] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
    </>
  )

  return { save, ui }
}

type Target = string | 'new' | null

function SaveChooser({
  profile,
  mode,
  onClose,
  onSaved,
}: {
  profile: Profile
  mode: SaveMode
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const s = useSavedState(true)
  const star = mode === 'top_pick'
  const [target, setTarget] = useState<Target>(null)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const newInput = useRef<HTMLInputElement>(null)

  const entryIn = (o: Opening) => s.entries.find((e) => e.opening_id === o.id && e.profile_id === profile.id)
  const usage = generalUsage(s)
  /** Why General can't take this save, or null. */
  const generalFull = (o: Opening): string | null => {
    if (!o.is_default) return null
    const entry = entryIn(o)
    if (!entry && usage.favorites >= usage.limits.favorites)
      return `General already has ${usage.limits.favorites} Favorites, its limit.`
    if (star && entry?.list_tag !== 'top_pick' && usage.starred >= usage.limits.starred)
      return `General already has ${usage.limits.starred} Starred, its limit.`
    return null
  }
  /** Can this opening take the save? Not if they're already there at this tier. */
  const selectable = (o: Opening) => {
    const entry = entryIn(o)
    if (generalFull(o)) return false
    return star ? entry?.list_tag !== 'top_pick' : !entry
  }

  // Pre-select the last choice once the openings are in (General otherwise).
  const preselected = useRef(false)
  useEffect(() => {
    if (preselected.current || !s.loaded) return
    preselected.current = true
    const last = s.openings.find((o) => o.id === readLast())
    const pick = [last, s.openings.find((o) => o.is_default), ...s.openings].find((o) => o && selectable(o))
    setTarget(pick?.id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.loaded])
  useEffect(() => {
    if (target === 'new') newInput.current?.focus()
  }, [target])

  const general = s.openings.find((o) => o.is_default)
  const fullNote = general ? generalFull(general) : null
  const chosen = s.openings.find((o) => o.id === target)

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await refreshSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const confirm = () =>
    run(async () => {
      let opening = chosen
      if (target === 'new') opening = await createOpening({ name: newName.trim() })
      if (!opening) return
      await saveToOpening(opening.id, profile.id, mode)
      writeLast(opening.id)
      onSaved(`${profile.name} ${star ? 'starred in' : 'saved to'} ${openingDisplayName(opening)}`)
      onClose()
    })

  const canConfirm = !busy && (target === 'new' ? newName.trim() !== '' : !!chosen)
  const verb = star ? 'Star in' : 'Save to'

  return (
    <Modal open onClose={onClose} title={star ? `Star ${profile.name}` : `Save ${profile.name}`}>
      <p className="-mt-1 mb-3 text-sm text-ink-soft">
        {star ? 'Adds them to the short list (Starred), and to Favorites too.' : 'Adds them to the long list (Favorites).'}
      </p>
      {!s.loaded ? (
        <p className="py-4 text-sm text-ink-faint">Loading your openings…</p>
      ) : (
        <div role="radiogroup" aria-label="Opening" className="-mx-1 max-h-[45vh] space-y-1 overflow-y-auto px-1 sm:max-h-80">
          {s.openings.map((o) => (
            <ChoiceRow
              key={o.id}
              opening={o}
              state={s}
              profileId={profile.id}
              star={star}
              checked={target === o.id}
              selectable={selectable(o)}
              full={!!generalFull(o)}
              busy={busy}
              onSelect={() => setTarget(o.id)}
              onRemove={(entryId) => run(() => (star ? setListTag(entryId, 'favorite') : removeEntry(entryId)))}
            />
          ))}
          <div
            className={`rounded-xl border px-3 py-2.5 ${target === 'new' ? 'border-brand-500 bg-brand-50/60' : 'border-line'}`}
          >
            <button
              type="button"
              role="radio"
              aria-checked={target === 'new'}
              onClick={() => setTarget('new')}
              className="flex w-full items-center gap-2.5 text-left text-sm font-medium text-brand-700"
            >
              <Plus size={16} aria-hidden /> New opening
            </button>
            {target === 'new' && (
              <input
                ref={newInput}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canConfirm && confirm()}
                placeholder="Opening name, e.g. Nutrition advisor, Kenya"
                aria-label="New opening name"
                className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            )}
          </div>
        </div>
      )}

      {fullNote && general && (
        <p className="mt-3 rounded-lg border border-gold-300 bg-gold-300/15 px-3 py-2 text-xs leading-relaxed text-gold-800">
          {fullNote} Save to an opening instead, or{' '}
          <Link to={`/openings/${general.id}`} onClick={onClose} className="font-semibold underline">
            review General
          </Link>
          .
        </p>
      )}
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink">
          Close
        </button>
        <button
          onClick={confirm}
          disabled={!canConfirm}
          className="flex min-w-0 items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {star ? <Star size={15} aria-hidden /> : <Bookmark size={15} aria-hidden />}
          <span className="truncate">
            {target === 'new' ? `${verb} new opening` : chosen ? `${verb} ${openingDisplayName(chosen)}` : verb}
          </span>
        </button>
      </div>
    </Modal>
  )
}

function ChoiceRow({
  opening,
  state,
  profileId,
  star,
  checked,
  selectable,
  full,
  busy,
  onSelect,
  onRemove,
}: {
  opening: Opening
  state: SavedState
  profileId: string
  star: boolean
  checked: boolean
  selectable: boolean
  full: boolean
  busy: boolean
  onSelect: () => void
  onRemove: (entryId: string) => void
}) {
  const entry = state.entries.find((e) => e.opening_id === opening.id && e.profile_id === profileId)
  const usage = opening.is_default ? generalUsage(state) : null
  const status = entry ? (entry.list_tag === 'top_pick' ? 'Starred' : 'In Favorites') : null
  // The remove that undoes this chooser's own action: unstar, or take off the opening.
  const removable = entry && (star ? entry.list_tag === 'top_pick' : true)
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
        checked ? 'border-brand-500 bg-brand-50/60' : 'border-line'
      }`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        disabled={!selectable}
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:cursor-default"
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
            checked ? 'border-brand-500' : 'border-line'
          } ${selectable ? '' : 'opacity-40'}`}
        >
          {checked && <span className="h-2 w-2 rounded-full bg-brand-500" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{openingDisplayName(opening)}</span>
          <span className="block truncate text-xs text-ink-faint">
            {status && <span className="font-medium text-brand-700">{status}</span>}
            {status && (usage || full) && ' · '}
            {usage &&
              `${usage.favorites}/${usage.limits.favorites} Favorites, ${usage.starred}/${usage.limits.starred} Starred`}
            {full && <span className="font-medium text-gold-800"> · full</span>}
            {!opening.is_default && !status && opening.deadline && `Due ${new Date(opening.deadline).toLocaleDateString()}`}
          </span>
        </span>
      </button>
      {removable && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onRemove(entry!.id)}
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-paper hover:text-red-600 disabled:opacity-50"
        >
          {star ? 'Unstar' : 'Remove'}
        </button>
      )}
    </div>
  )
}
