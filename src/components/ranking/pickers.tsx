import { AlertTriangle, Info, Plus, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { RequirementValueByKind } from '../../lib/matching/types'
import { ORG_SCOPE_LABELS } from '../../lib/requirements/labels'
import { OrgPicker } from '../ui/OrgPicker'

// Small controls shared by the ranking drawer's priority editors.

export function ChipToggles({
  choices,
  selected,
  onChange,
  disabledValues = [],
}: {
  choices: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
  /** Values already in this kind's Must have row (preference rows only). */
  disabledValues?: string[]
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {choices.map((c) => {
        const on = selected.includes(c.value)
        const off = disabledValues.includes(c.value)
        return (
          <button
            key={c.value}
            type="button"
            aria-pressed={on}
            disabled={off}
            title={off ? 'Already a Must have' : undefined}
            onClick={() => onChange(on ? selected.filter((v) => v !== c.value) : [...selected, c.value])}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              off
                ? 'cursor-not-allowed border-dashed border-line text-ink-faint'
                : on
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-line text-ink-soft hover:border-ink-faint'
            }`}
          >
            {c.label}
            {off && <span className="ml-1 font-normal italic">· already Must have</span>}
          </button>
        )
      })}
    </div>
  )
}

export function OrgHistoryPicker({
  value,
  onValue,
}: {
  value: RequirementValueByKind['org_history']
  onValue: (v: RequirementValueByKind['org_history']) => void
}) {
  const [peerDraft, setPeerDraft] = useState('')
  const addPeer = () => {
    const name = peerDraft.trim()
    if (name && !value.peers.some((p) => p.toLowerCase() === name.toLowerCase()))
      onValue({ ...value, peers: [...value.peers, name] })
    setPeerDraft('')
  }
  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={value.scope}
          onChange={(e) => onValue({ ...value, scope: e.target.value as typeof value.scope })}
          aria-label="Scope"
          className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs outline-none focus:border-brand-400"
        >
          {Object.entries(ORG_SCOPE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <OrgPicker
          compact
          label="Organization name"
          placeholder="Organization name"
          value={value.org}
          orgId={value.org_id}
          onChange={(org, org_id) => onValue({ ...value, org, org_id })}
          className="min-w-0 flex-1"
        />
      </div>
      <AlsoOrgs value={value} onValue={onValue} />
      {value.scope === 'ever_or_peer' && (
        <div>
          <p className="text-xs font-medium text-ink-soft">Peer organizations</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {value.peers.map((p) => (
              <span key={p} className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-xs text-ink-soft">
                {p}
                <button
                  type="button"
                  aria-label={`Remove ${p}`}
                  onClick={() => onValue({ ...value, peers: value.peers.filter((x) => x !== p) })}
                  className="text-ink-faint hover:text-ink"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <span className="inline-flex items-center gap-1">
              <input
                value={peerDraft}
                onChange={(e) => setPeerDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addPeer()
                  }
                }}
                placeholder="Add a peer org"
                aria-label="Add a peer organization"
                className="w-32 rounded-lg border border-line px-2 py-1 text-xs outline-none focus:border-brand-400"
              />
              <button
                type="button"
                onClick={addPeer}
                aria-label="Add peer organization"
                className="rounded-full p-1 text-brand-600 hover:bg-brand-50"
              >
                <Plus size={13} />
              </button>
            </span>
          </div>
          <p className="mt-1 text-[11px] text-ink-faint">The real engine will suggest peers.</p>
        </div>
      )}
    </div>
  )
}

/** More organizations, any of which counts (the Previous employers filter's
 *  multiple picks land here too): chips with ×, and a picker to add one. */
function AlsoOrgs({
  value,
  onValue,
}: {
  value: RequirementValueByKind['org_history']
  onValue: (v: RequirementValueByKind['org_history']) => void
}) {
  const also = value.also ?? []
  const [draft, setDraft] = useState<{ org: string; org_id: string | null }>({ org: '', org_id: null })
  const [adding, setAdding] = useState(false)
  const add = () => {
    const org = draft.org.trim()
    const taken = [value.org, ...also.map((o) => o.org)].some((o) => o.trim().toLowerCase() === org.toLowerCase())
    if (org && !taken) onValue({ ...value, also: [...also, { org, org_id: draft.org_id }] })
    setDraft({ org: '', org_id: null })
    setAdding(false)
  }
  const remove = (org: string) => {
    const rest = also.filter((o) => o.org !== org)
    const { also: _drop, ...single } = value
    onValue(rest.length > 0 ? { ...value, also: rest } : single)
  }
  if (!value.org.trim() && also.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {also.map((o) => (
        <span key={o.org} className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-xs text-ink-soft">
          <span className="text-ink-faint">or</span> {o.org}
          <button
            type="button"
            aria-label={`Remove ${o.org}`}
            onClick={() => remove(o.org)}
            className="text-ink-faint hover:text-ink"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      {adding ? (
        <span className="flex w-full items-start gap-1 sm:w-auto">
          <OrgPicker
            compact
            label="Another organization"
            placeholder="Another organization"
            value={draft.org}
            orgId={draft.org_id}
            onChange={(org, org_id) => setDraft({ org, org_id })}
            className="min-w-0 flex-1 sm:w-56"
          />
          <button
            type="button"
            onClick={add}
            className="rounded-lg border border-line px-2 py-1.5 text-xs font-medium text-brand-700 hover:border-brand-400"
          >
            Add
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2 py-0.5 text-xs font-medium text-ink-soft hover:border-brand-400 hover:text-brand-700"
        >
          <Plus size={11} aria-hidden /> Or another organization
        </button>
      )}
    </div>
  )
}

export function Note({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  const Icon = tone === 'warn' ? AlertTriangle : Info
  return (
    <p
      className={`mt-2 flex gap-1.5 text-[11.5px] leading-snug ${
        tone === 'warn' ? 'text-gold-700' : 'text-ink-faint'
      }`}
    >
      <Icon size={13} className="mt-px shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

