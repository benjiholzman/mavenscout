import { AlertTriangle, Info, Plus, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { availabilitySummary } from '../directory/AvailabilityModal'
import { EXPERTISE_TIER_LIMITS } from '../../lib/config'
import { EXPERTISE_KIND_LABELS, type ExpertiseIndex } from '../../lib/expertise'
import { locationLabel, type EngagementType } from '../../lib/filters'
import type { Level, Requirement, RequirementValueByKind } from '../../lib/matching/types'
import { CAREER_LEVEL_SHORT, KIND_LABELS, ORG_SCOPE_LABELS } from '../../lib/requirements/labels'
import { rowHasValue } from '../../lib/requirements/model'
import { MultiSelect, type OptionGroup } from '../ui/MultiSelect'
import { OrgPicker } from '../ui/OrgPicker'
import { Segmented } from '../ui/Segmented'
import { MIN_PROFICIENCY_LABELS } from '../../lib/languages'
import { LevelControl } from './LevelControl'

// One row of the requirements grid (match rework spec §3): label · value
// picker · level control · source tag · remove. Every row can be removed —
// no row means no preference.
//
// The location and language pickers are the swap point for Branch 2 (Mapbox
// places, canonical languages): they read and write the row's { values }
// only, so replacing them doesn't touch scoring.

export interface PickerOptions {
  /** The unified expertise list (an expertise row shows its item's kind). */
  expertise: ExpertiseIndex
  locations: OptionGroup[]
  languages: string[]
  types: string[]
  workArrangements: string[]
}

const SOURCE_LABELS = { jd: 'from JD', filter: 'from filters', manual: 'added' } as const

export function RequirementRow({
  row,
  options,
  onLevel,
  onValue,
  onRemove,
  highlighted,
  requiredValues = [],
}: {
  row: Requirement
  options: PickerOptions
  onLevel: (level: Level) => void
  onValue: (value: Requirement['value']) => void
  onRemove: () => void
  highlighted?: boolean
  /** Preference row of a multi-value kind: the values already in that
   *  kind's Required row, which can't be picked here (no duplicates). */
  requiredValues?: string[]
}) {
  const isTag = row.kind === 'expertise'
  const title = isTag ? row.value.name : KIND_LABELS[row.kind]
  const itemKind = isTag ? options.expertise.byName.get(row.value.name)?.kind : undefined
  const sourceTag = SOURCE_LABELS[row.source]

  return (
    <div
      id={`req-row-${row.id}`}
      className={`scroll-mt-4 rounded-xl border bg-white p-3 transition-shadow ${
        row.level === 'must' ? 'border-ink/25' : 'border-brand-200'
      } ${highlighted ? 'ring-2 ring-brand-400 ring-offset-1' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug text-ink">{title}</p>
          {isTag && (
            <p className="text-xs text-ink-faint">
              {KIND_LABELS.expertise}
              {itemKind && ` · ${EXPERTISE_KIND_LABELS[itemKind]}`}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {sourceTag && (
            <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-ink-faint">
              {sourceTag}
            </span>
          )}
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${title}`}
            className="rounded-full p-1 text-ink-faint hover:bg-paper hover:text-ink"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <ValuePicker row={row} options={options} onValue={onValue} requiredValues={requiredValues} />

      <div className="mt-2.5">
        <LevelControl value={row.level} onChange={onLevel} rowLabel={title} />
      </div>

      <RowNotes row={row} />
    </div>
  )
}

// ---- value pickers ----------------------------------------------------------

function ValuePicker({
  row,
  options,
  onValue,
  requiredValues,
}: {
  row: Requirement
  options: PickerOptions
  onValue: (value: Requirement['value']) => void
  requiredValues: string[]
}) {
  switch (row.kind) {
    case 'expertise':
      return null // the pick is the row's title; remove and re-add to change it
    case 'org_history':
      return <OrgHistoryPicker value={row.value} onValue={onValue} />
    case 'location':
      return (
        <ListPicker
          label="Places"
          summary={row.value.values.map(locationLabel).join(', ')}
          emptyText="Based in any of the places you pick"
          groups={options.locations}
          formatValue={locationLabel}
          disabledValues={requiredValues}
          selected={row.value.values}
          onChange={(values) => onValue({ values })}
        />
      )
    case 'language':
      return (
        <>
          <ListPicker
            label="Languages"
            summary={row.value.values.join(', ')}
            emptyText="Speaks any of the languages you pick"
            options={options.languages}
            disabledValues={requiredValues}
            selected={row.value.values}
            onChange={(values) => onValue({ ...row.value, values })}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Segmented
              label={`${KIND_LABELS.language}: minimum level`}
              value={row.value.min ?? 'working'}
              options={(['working', 'fluent'] as const).map((v) => ({ value: v, label: MIN_PROFICIENCY_LABELS[v] }))}
              onChange={(min) => onValue({ ...row.value, min })}
            />
            <span className="text-[11px] text-ink-faint">Fluent counts as Working.</span>
          </div>
        </>
      )
    case 'type':
      return (
        <ChipToggles
          choices={options.types.map((t) => ({ value: t, label: t }))}
          disabledValues={requiredValues}
          selected={row.value.values}
          onChange={(values) => onValue({ values })}
        />
      )
    case 'career_level':
      return (
        <ChipToggles
          choices={Object.entries(CAREER_LEVEL_SHORT).map(([value, label]) => ({ value, label }))}
          disabledValues={requiredValues}
          selected={row.value.values}
          onChange={(values) => onValue({ values })}
        />
      )
    case 'work_arrangement':
      return (
        <ChipToggles
          choices={options.workArrangements.map((w) => ({ value: w, label: w }))}
          disabledValues={requiredValues}
          selected={row.value.values}
          onChange={(values) => onValue({ values })}
        />
      )
    case 'availability':
      return <AvailabilityPicker value={row.value} onValue={onValue} />
    case 'verified':
      return (
        <p className="mt-1.5 text-xs text-ink-faint">
          Profiles that passed evidence-based vetting.
        </p>
      )
  }
}

function ChipToggles({
  choices,
  selected,
  onChange,
  disabledValues = [],
}: {
  choices: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
  /** Values already in this kind's Required row (preference rows only). */
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
            title={off ? 'Already required' : undefined}
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
            {off && <span className="ml-1 font-normal italic">· already required</span>}
          </button>
        )
      })}
    </div>
  )
}

function ListPicker({
  label,
  summary,
  emptyText,
  disabledValues,
  options,
  groups,
  formatValue,
  selected,
  onChange,
}: {
  label: string
  summary: string
  emptyText: string
  disabledValues?: string[]
  options?: string[]
  groups?: OptionGroup[]
  formatValue?: (v: string) => string
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <MultiSelect
        label={label}
        options={options}
        groups={groups}
        selectableGroup={!!groups}
        formatValue={formatValue}
        disabledValues={disabledValues}
        disabledLabel="already required"
        selected={selected}
        onChange={onChange}
        open={open}
        onToggle={setOpen}
      />
      <span className="min-w-0 text-xs text-ink-soft">{summary || emptyText}</span>
    </div>
  )
}

const ENGAGEMENTS: { value: EngagementType; label: string }[] = [
  { value: 'either', label: 'Either' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'full_time', label: 'Full-time' },
]

function AvailabilityPicker({
  value,
  onValue,
}: {
  value: RequirementValueByKind['availability']
  onValue: (v: RequirementValueByKind['availability']) => void
}) {
  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {ENGAGEMENTS.map((e) => (
          <button
            key={e.value}
            type="button"
            aria-pressed={value.engagement === e.value}
            onClick={() => onValue({ ...value, engagement: e.value })}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              value.engagement === e.value
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-line text-ink-soft hover:border-ink-faint'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>
      <label className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
        Available by
        <input
          type="month"
          value={value.untilMonth ?? ''}
          onChange={(e) => onValue({ ...value, untilMonth: e.target.value || null })}
          className="rounded-lg border border-line px-2 py-1 text-xs outline-none focus:border-brand-400"
        />
        <span className="text-ink-faint">{availabilitySummary(value)}</span>
      </label>
    </div>
  )
}

function OrgHistoryPicker({
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

// ---- notes ------------------------------------------------------------------

function Note({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
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

function RowNotes({ row }: { row: Requirement }) {
  const notes: ReactNode[] = []
  if (!rowHasValue(row))
    notes.push(
      <Note key="empty" tone="warn">
        {row.kind === 'org_history' ? 'Add an organization name' : 'Choose at least one option'} for
        this row to count.
      </Note>,
    )
  if (row.kind === 'expertise' && row.level === 'must')
    notes.push(
      <Note key="tagcap" tone="warn">
        Required counts only the {EXPERTISE_TIER_LIMITS.core.max + EXPERTISE_TIER_LIMITS.strong.max} Core and
        Strong items each candidate picks{row.value.includeWorking ? ', plus Working knowledge' : ''}, so it may
        exclude qualified people who didn't tag it. Consider Important.
      </Note>,
    )
  if (row.kind === 'org_history')
    notes.push(
      <Note key="ethics">
        Add this deliberately: favoring people who worked where you work can entrench who-you-know
        hiring.
      </Note>,
    )
  if (row.kind === 'career_level')
    notes.push(<Note key="firms">Firms aren't applicable — never excluded or adjusted by this row.</Note>)
  return <>{notes}</>
}
