import { Bookmark, CalendarDays, Plus, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../components/ui/Modal'
import { RowsSkeleton } from '../components/ui/Skeletons'
import { useOpeningsList } from '../hooks/useOpeningData'
import { fmtDate } from '../lib/dates'
import { clearOpening, createOpening, deleteOpening, openingDisplayName } from '../lib/openings'
import { useSession } from '../lib/session'
import { ManagerStatusNotice } from '../components/account/ManagerStatusNotice'

// /openings — the hiring manager's list of openings + create new (PRD 7.4).

export default function Openings() {
  const { role, hasAccess, manager } = useSession()
  const { openings, counts, reload } = useOpeningsList()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')

  if (role !== 'hiring_manager')
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">My openings</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Log in with a hiring account (or use the dev role switcher) to manage openings.
        </p>
        <Link to="/login" className="mt-4 inline-block rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white">
          Log in
        </Link>
      </div>
    )
  if (!hasAccess)
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <ManagerStatusNotice manager={manager} />
      </div>
    )

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">My openings</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Each opening is a role you're filling — with its long list, short list, team notes,
            and saved AI ranking.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <Plus size={15} /> New opening
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {openings === null && <RowsSkeleton rows={3} />}
        {openings?.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-white p-4">
            <span className={`rounded-full p-2 ${o.is_default ? 'bg-ink/5 text-ink-soft' : 'bg-brand-50 text-brand-600'}`}>
              {o.is_default ? <Bookmark size={16} /> : <Users size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <Link to={`/openings/${o.id}`} className="font-semibold hover:text-brand-700">
                {openingDisplayName(o)}
                {o.is_default && <span className="ml-2 text-xs font-normal text-ink-faint">quick-save list</span>}
              </Link>
              {o.description && <p className="truncate text-xs text-ink-soft">{o.description}</p>}
            </div>
            <div className="flex items-center gap-3 text-xs text-ink-faint">
              <span>{counts.get(o.id) ?? 0} candidate{(counts.get(o.id) ?? 0) === 1 ? '' : 's'}</span>
              {o.deadline && (
                <span className="flex items-center gap-1">
                  <CalendarDays size={12} /> {fmtDate(o.deadline)}
                </span>
              )}
              {(counts.get(o.id) ?? 0) > 0 && (
                <button
                  onClick={async () => {
                    await clearOpening(o.id)
                    reload()
                  }}
                  className="font-medium text-ink-soft hover:text-red-600"
                  title="Remove all candidates (fill-then-reset)"
                >
                  Clear
                </button>
              )}
              {!o.is_default && (
                <button
                  onClick={async () => {
                    await deleteOpening(o.id)
                    reload()
                  }}
                  aria-label={`Delete ${o.name}`}
                  className="rounded-full p-1 text-ink-faint hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New opening">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            await createOpening({
              name: name.trim(),
              description: description.trim() || null,
              deadline: deadline || null,
            })
            setCreateOpen(false)
            setName('')
            setDescription('')
            setDeadline('')
            reload()
          }}
        >
          <label className="block text-sm">
            <span className="font-medium">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Senior M&E Consultant — Sahel Resilience"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Description (optional)</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Deadline (optional)</span>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <button type="submit" className="w-full rounded-full bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
            Create opening
          </button>
        </form>
      </Modal>
    </div>
  )
}
