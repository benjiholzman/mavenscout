import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createOpening, ensureDefaultOpening, removeEntry, saveToOpening } from '../../lib/openings'
import { useSession } from '../../lib/session'
import type { Opening, Profile } from '../../types/db'
import { supabase } from '../../lib/supabase'
import { DEMO_HIRING_MANAGER_ID } from '../../lib/session'
import { Modal } from '../ui/Modal'
import { SignupPrompt } from '../ui/SignupPrompt'

// Quick-save flow (PRD 7.4): one tap saves into the always-present default
// opening — no naming required. The confirmation toast offers "Choose
// opening…" to move the save into a named opening (creating one inline).

interface PickerContext {
  profile: Profile
  tag: 'favorite' | 'top_pick'
  /** the quick-save entry to move if a named opening is chosen */
  quickEntryId: string | null
  defaultOpeningId: string | null
}

export function useSaveCandidate() {
  const { hasAccess, role } = useSession()
  const [gate, setGate] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [picker, setPicker] = useState<PickerContext | null>(null)

  const save = async (profile: Profile, tag: 'favorite' | 'top_pick') => {
    if (!hasAccess || role !== 'hiring_manager') {
      setGate(true)
      return
    }
    try {
      const def = await ensureDefaultOpening()
      const entry = await saveToOpening(def.id, profile.id, tag)
      setToast(`${profile.name} saved${tag === 'top_pick' ? ' as Top Pick' : ''}`)
      setPicker({ profile, tag, quickEntryId: entry.id, defaultOpeningId: def.id })
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Save failed')
    }
  }

  const ui = (
    <>
      <SignupPrompt open={gate} onClose={() => setGate(false)} feature="Saving candidates into openings" />
      {toast && picker && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg" role="status">
          {toast}
          <button
            className="font-medium text-gold-300 hover:text-gold-500"
            onClick={() => setToast(null)}
          >
            Choose opening…
          </button>
          <button className="text-white/60 hover:text-white" onClick={() => { setToast(null); setPicker(null) }}>
            ✕
          </button>
        </div>
      )}
      {picker && !toast && (
        <OpeningPickerModal context={picker} onClose={() => setPicker(null)} />
      )}
    </>
  )

  return { save, ui }
}

function OpeningPickerModal({ context, onClose }: { context: PickerContext; onClose: () => void }) {
  const [openings, setOpenings] = useState<Opening[] | null>(null)
  const [newName, setNewName] = useState('')
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('openings')
      .select('*')
      .eq('hiring_manager_id', DEMO_HIRING_MANAGER_ID)
      .eq('is_default', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => setOpenings((data as Opening[]) ?? []))
  }, [])

  const move = async (opening: Opening) => {
    await saveToOpening(opening.id, context.profile.id, context.tag)
    if (context.quickEntryId && opening.id !== context.defaultOpeningId) {
      await removeEntry(context.quickEntryId)
    }
    setDone(opening.name)
  }

  return (
    <Modal open onClose={onClose} title={`Save ${context.profile.name} to…`}>
      {done ? (
        <div className="py-4 text-center">
          <p className="text-sm text-ink-soft">Moved to <strong>{done}</strong>.</p>
          <button onClick={onClose} className="mt-4 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white">
            Done
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {openings === null && <p className="text-sm text-ink-faint">Loading…</p>}
          {openings?.map((o) => (
            <button
              key={o.id}
              onClick={() => move(o)}
              className="w-full rounded-lg border border-line px-3.5 py-2.5 text-left text-sm font-medium hover:border-brand-400 hover:bg-brand-50/50"
            >
              {o.name}
              {o.deadline && (
                <span className="ml-2 text-xs font-normal text-ink-faint">
                  due {new Date(o.deadline).toLocaleDateString()}
                </span>
              )}
            </button>
          ))}
          {openings?.length === 0 && (
            <p className="pb-1 text-sm text-ink-faint">No named openings yet — create one:</p>
          )}
          <form
            className="flex gap-2 pt-2"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!newName.trim()) return
              const o = await createOpening({ name: newName.trim() })
              await move(o)
            }}
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New opening name…"
              className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
            <button type="submit" className="flex items-center gap-1 rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              <Plus size={14} /> Create
            </button>
          </form>
          <p className="pt-1 text-xs text-ink-faint">
            Staying in "Saved" (quick save) is fine too — just close this.
          </p>
        </div>
      )}
    </Modal>
  )
}
