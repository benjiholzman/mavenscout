import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useState } from 'react'
import { EXPERTISE_TIER_LIMITS } from '../../lib/config'
import { TIER_LABELS, TIERS, type ExpertiseIndex } from '../../lib/expertise'
import { getEditorProfileId } from '../../lib/session'
import { supabase } from '../../lib/supabase'
import type { ExpertiseTag, ExpertiseTier } from '../../types/db'
import { ExpertisePicker } from '../ui/ExpertisePicker'
import { Modal } from '../ui/Modal'

// Expertise in three tiers (profiles-membership §6, §7.1): Core, Strong and
// Working knowledge, from the one unified list. Counts come from
// EXPERTISE_TIER_LIMITS; the editor enforces the maximums and shows the
// minimums as guidance (enforced with the new editor, §13 step 2). New items
// go through request-and-approve — no free text.

const TIER_HINTS: Record<ExpertiseTier, string> = {
  core: 'What you are known for. Shown first on your card.',
  strong: 'Areas you have delivered in repeatedly. Also on your card.',
  working: 'Areas you can contribute to. On your full profile.',
}

export function ExpertiseEditor({
  value,
  onChange,
  index,
}: {
  value: ExpertiseTag[]
  onChange: (next: ExpertiseTag[]) => void
  index: ExpertiseIndex
}) {
  const [requestOpen, setRequestOpen] = useState(false)
  const chosen = value.map((t) => t.name)
  const countOf = (tier: ExpertiseTier) => value.filter((t) => t.tier === tier).length
  const full = (tier: ExpertiseTier) => countOf(tier) >= EXPERTISE_TIER_LIMITS[tier].max

  const add = (name: string, tier: ExpertiseTier) => {
    if (chosen.includes(name) || full(tier)) return
    onChange([...value, { name, tier }])
  }
  const move = (name: string, tier: ExpertiseTier) => {
    if (full(tier)) return
    onChange(value.map((t) => (t.name === name ? { ...t, tier } : t)))
  }

  return (
    <div className="space-y-5">
      {TIERS.map((tier, ti) => {
        const tags = value.filter((t) => t.tier === tier)
        const { min, max } = EXPERTISE_TIER_LIMITS[tier]
        const over = tags.length > max
        const under = tags.length < min
        const up = TIERS[ti - 1]
        const down = TIERS[ti + 1]
        return (
          <section key={tier}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{TIER_LABELS[tier]}</p>
              <p className={`text-xs ${over ? 'font-medium text-red-600' : 'text-ink-faint'}`}>
                {tags.length}/{max}
                {min > 0 && min === max ? '' : min > 0 ? ` · at least ${min}` : ''}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-ink-faint">{TIER_HINTS[tier]}</p>
            {tags.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((t) => {
                  const known = index.items.length === 0 || index.byName.has(t.name)
                  return (
                    <li
                      key={t.name}
                      title={known ? undefined : 'No longer on the list — replace it'}
                      className={`inline-flex items-center gap-0.5 rounded-full py-1 pl-2.5 pr-1 text-xs font-medium ${
                        !known
                          ? 'border border-red-300 bg-red-50 text-red-700'
                          : tier === 'core'
                            ? 'bg-brand-500 text-white'
                            : tier === 'strong'
                              ? 'border border-brand-200 bg-brand-50 text-brand-800'
                              : 'border border-line bg-white text-ink-soft'
                      }`}
                    >
                      <span className="mr-0.5">{t.name}</span>
                      {up && (
                        <button
                          type="button"
                          onClick={() => move(t.name, up)}
                          disabled={full(up)}
                          aria-label={`Move ${t.name} to ${TIER_LABELS[up]}`}
                          title={full(up) ? `${TIER_LABELS[up]} is full` : `Move to ${TIER_LABELS[up]}`}
                          className="rounded-full p-0.5 hover:bg-black/10 disabled:opacity-40"
                        >
                          <ChevronUp size={12} />
                        </button>
                      )}
                      {down && (
                        <button
                          type="button"
                          onClick={() => move(t.name, down)}
                          disabled={full(down)}
                          aria-label={`Move ${t.name} to ${TIER_LABELS[down]}`}
                          title={full(down) ? `${TIER_LABELS[down]} is full` : `Move to ${TIER_LABELS[down]}`}
                          className="rounded-full p-0.5 hover:bg-black/10 disabled:opacity-40"
                        >
                          <ChevronDown size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onChange(value.filter((x) => x.name !== t.name))}
                        aria-label={`Remove ${t.name}`}
                        className="rounded-full p-0.5 hover:bg-black/10"
                      >
                        <X size={12} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="mt-2">
              <ExpertisePicker
                index={index}
                exclude={chosen}
                disabled={full(tier)}
                label={`Add to ${TIER_LABELS[tier]}`}
                placeholder={full(tier) ? `${TIER_LABELS[tier]} is full` : 'Search, e.g. Nutrition, M&E, PFM'}
                onPick={(name) => add(name, tier)}
              />
            </div>
            {over && (
              <p className="mt-1 text-xs text-red-600">
                Over the limit: move or remove {tags.length - max} before saving.
              </p>
            )}
            {!over && under && (
              <p className="mt-1 text-xs text-ink-faint">
                {min - tags.length} more needed for a complete profile.
              </p>
            )}
          </section>
        )
      })}
      <button
        type="button"
        onClick={() => setRequestOpen(true)}
        className="text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        Something missing? Request a new item…
      </button>
      <RequestItemModal groups={index.groups.map((g) => g.label)} open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  )
}

function RequestItemModal({ groups, open, onClose }: { groups: string[]; open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle')

  return (
    <Modal open={open} onClose={onClose} title="Request a new expertise item">
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
              setGroup('')
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
              type: 'expertise',
              proposed_name: name.trim(),
              proposed_parent: group || null,
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
              placeholder="e.g. Blue Carbon"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Closest group (optional)</span>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
            >
              <option value="">Not sure</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
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
