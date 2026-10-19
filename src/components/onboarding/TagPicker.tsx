import { ChevronDown, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getEditorProfileId } from '../../lib/session'
import { supabase } from '../../lib/supabase'
import { PRIMARY_CAP, SECONDARY_CAP, tagCapReached } from '../../lib/validation'
import type { TagSelection, TaxonomyCategory, TaxonomyItem } from '../../types/db'
import { Modal } from '../ui/Modal'

// Expertise/skills selection (PRD 7.14): up to 2 primary + 4 secondary per
// taxonomy, tagging at category level (broad/generalist) or sub-item level
// (specific depth). New items go through request-and-approve — no free text.

export function TagPicker({
  type,
  label,
  value,
  onChange,
  categories,
  items,
}: {
  type: 'domain_expertise' | 'technical_skills'
  label: string
  value: TagSelection[]
  onChange: (next: TagSelection[]) => void
  categories: TaxonomyCategory[]
  items: TaxonomyItem[]
}) {
  const [open, setOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const cats = categories.filter((c) => c.type === type)
  const selectedNames = new Set(value.map((t) => t.name))
  const primaryFull = tagCapReached(value, 'primary')
  const secondaryFull = tagCapReached(value, 'secondary')
  const primaryCount = value.filter((t) => t.tier === 'primary').length
  const secondaryCount = value.filter((t) => t.tier === 'secondary').length
  // Older rows can predate the caps; flag them so the save check isn't a surprise.
  const overCap = primaryCount > PRIMARY_CAP || secondaryCount > SECONDARY_CAP

  const add = (name: string, level: 'category' | 'item') => {
    if (selectedNames.has(name)) return
    const tier = !primaryFull ? 'primary' : !secondaryFull ? 'secondary' : null
    if (!tier) return
    onChange([...value, { name, tier, level }])
  }

  const remove = (name: string) => onChange(value.filter((t) => t.name !== name))

  const toggleTier = (tag: TagSelection) => {
    const target = tag.tier === 'primary' ? 'secondary' : 'primary'
    if (tagCapReached(value, target)) return
    onChange(value.map((t) => (t.name === tag.name ? { ...t, tier: target } : t)))
  }

  const Pill = ({ tag }: { tag: TagSelection }) => (
    <span
      className={`inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs font-medium ${
        tag.tier === 'primary'
          ? 'bg-brand-500 text-white'
          : 'border border-line bg-white text-ink-soft'
      }`}
    >
      <button
        onClick={() => toggleTier(tag)}
        title={`Make ${tag.tier === 'primary' ? 'secondary' : 'primary'}`}
        className="hover:underline"
      >
        {tag.name}
        {tag.level === 'category' && ' (broad)'}
      </button>
      <button
        onClick={() => remove(tag.name)}
        aria-label={`Remove ${tag.name}`}
        className={`rounded-full p-0.5 ${
          tag.tier === 'primary' ? 'hover:bg-brand-600' : 'hover:bg-paper'
        }`}
      >
        <X size={12} />
      </button>
    </span>
  )

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">{label}</p>
        <p className={`text-xs ${overCap ? 'font-medium text-red-600' : 'text-ink-faint'}`}>
          {primaryCount}/{PRIMARY_CAP} primary · {secondaryCount}/{SECONDARY_CAP} secondary
        </p>
      </div>
      <p className="mt-0.5 text-xs text-ink-faint">
        Pick a whole category to signal broad competency, or specific sub-items for depth.
        Click a selected tag to switch primary ↔ secondary.
      </p>
      {overCap && (
        <p className="mt-1 text-xs text-red-600">
          Over the limit — remove tags or move them to secondary before saving.
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {value.map((t) => (
          <Pill key={t.name} tag={t} />
        ))}
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen(!open)}
            disabled={primaryFull && secondaryFull}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink-faint/50 px-2.5 py-1 text-xs font-medium text-ink-soft hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={12} /> Add <ChevronDown size={11} />
          </button>
          {open && (
            <div className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-line bg-white p-2 shadow-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:max-h-96 sm:w-80 sm:rounded-xl">
              <div className="mb-1 flex items-center justify-between px-2 pt-1 sm:hidden">
                <span className="text-sm font-semibold">{label}</span>
                <button className="text-sm text-brand-600" onClick={() => setOpen(false)}>
                  Done
                </button>
              </div>
              {cats.map((cat) => {
                const children = items.filter((i) => i.category_id === cat.id)
                return (
                  <div key={cat.id} className="mb-1">
                    <button
                      disabled={selectedNames.has(cat.name)}
                      onClick={() => add(cat.name, 'category')}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-sm font-semibold hover:bg-paper disabled:opacity-40"
                    >
                      {cat.name} <span className="text-xs font-normal text-ink-faint">(broad)</span>
                    </button>
                    {children.map((item) => (
                      <button
                        key={item.id}
                        disabled={selectedNames.has(item.name)}
                        onClick={() => add(item.name, 'item')}
                        className="w-full rounded-lg py-1.5 pl-7 pr-2 text-left text-sm text-ink-soft hover:bg-paper disabled:opacity-40"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                )
              })}
              <button
                onClick={() => {
                  setOpen(false)
                  setRequestOpen(true)
                }}
                className="mt-1 w-full rounded-lg border-t border-line px-2 py-2 text-left text-sm font-medium text-brand-600 hover:bg-brand-50"
              >
                Something missing? Request a new item…
              </button>
            </div>
          )}
        </div>
      </div>

      <RequestItemModal type={type} open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  )
}

function RequestItemModal({
  type,
  open,
  onClose,
}: {
  type: 'domain_expertise' | 'technical_skills'
  open: boolean
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [parent, setParent] = useState('')
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle')

  return (
    <Modal open={open} onClose={onClose} title="Request a new taxonomy item">
      {state === 'sent' ? (
        <div className="py-4 text-center">
          <p className="text-sm text-ink-soft">
            Request sent — an admin reviews it, and on approval it appears in the list for
            everyone. (No free-text tags: this keeps the vocabulary clean and filterable.)
          </p>
          <button
            onClick={() => {
              setState('idle')
              setName('')
              setParent('')
              onClose()
            }}
            className="mt-4 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white"
          >
            Done
          </button>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            const { error } = await supabase.from('taxonomy_requests').insert({
              profile_id: getEditorProfileId(),
              type,
              proposed_name: name.trim(),
              proposed_parent: parent.trim() || null,
            })
            setState(error ? 'error' : 'sent')
          }}
        >
          <label className="block text-sm">
            <span className="font-medium">Proposed item</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Blue Economy"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Suggested parent category (optional)</span>
            <input
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              placeholder="e.g. Climate & Environment"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>
          {state === 'error' && <p className="text-xs text-red-600">Couldn't send — try again.</p>}
          <button
            type="submit"
            className="w-full rounded-full bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            Send request
          </button>
        </form>
      )}
    </Modal>
  )
}
