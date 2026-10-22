import { Info, Plus } from 'lucide-react'
import { useState } from 'react'
import { MAX_TAG_ROWS } from '../../lib/matching/config'
import { ALWAYS_PRESENT_KINDS, type Requirement } from '../../lib/matching/types'
import { KIND_LABELS } from '../../lib/requirements/labels'
import { canAddKind, makeRow, tagRowCount, type SingleKind, type TagKind } from '../../lib/requirements/model'
import type { RequirementsStore } from '../../lib/requirements/store'
import type { OptionGroup } from '../ui/MultiSelect'
import { RequirementRow, type PickerOptions } from './RequirementRow'

// The requirements grid (match rework spec §3). Rows only exist once added:
// expertise and skills (from JD suggestions or "+ Add"), then "Other
// requirements", which starts empty with one add chip per kind. Filters set in
// the filter bar arrive here as Required rows. A multi-value kind can show
// two rows: its Required row and a preference row (e.g. Required: French,
// Nice to have: English).

export interface GridOptions extends PickerOptions {
  /** Taxonomy for "+ Add expertise" / "+ Add skill": category → items. */
  expertiseGroups: OptionGroup[]
  skillGroups: OptionGroup[]
}

/** Add-chip order for "Other requirements". */
const ADD_ORDER: SingleKind[] = [
  'location',
  'language',
  'availability',
  'org_history',
  'type',
  'career_level',
  'work_arrangement',
  'verified',
]

const ADD_LABELS: Record<SingleKind, string> = {
  location: 'Location',
  language: 'Language',
  availability: 'Availability',
  org_history: 'Org history',
  type: 'Type',
  career_level: 'Career level',
  work_arrangement: 'Work arrangement',
  verified: 'Verified',
}

function AddChip({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-soft hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Plus size={12} aria-hidden /> {label}
    </button>
  )
}

export function RequirementsGrid({
  store,
  options,
  focusId,
  onFocusRow,
  orgPrefill,
}: {
  store: RequirementsStore
  options: GridOptions
  focusId: string | null
  onFocusRow: (id: string) => void
  /** The manager's own organization, prefilled when Org history is added. */
  orgPrefill: string
}) {
  const { requirements } = store.state
  const tagRows = requirements.filter((r) => r.kind === 'expertise' || r.kind === 'skill')
  // Already in display order (normalizeRequirements): per kind, Required first.
  const otherRows = requirements.filter((r) => (ALWAYS_PRESENT_KINDS as readonly string[]).includes(r.kind))
  // A multi-value kind can still get a preference row next to its Required row.
  const missing = ADD_ORDER.filter((k) => canAddKind(requirements, k))
  const atCap = tagRowCount(requirements) >= MAX_TAG_ROWS
  const [adding, setAdding] = useState<TagKind | null>(null)

  const mustCount = (kind: TagKind) => tagRows.filter((r) => r.kind === kind && r.level === 'must').length
  const anyOfKinds = (['expertise', 'skill'] as const).filter((k) => mustCount(k) >= 2)

  const add = (row: Requirement) => {
    store.addRow(row)
    onFocusRow(row.id)
  }

  const renderRow = (r: Requirement) => (
    <RequirementRow
      key={r.id}
      row={r}
      options={options}
      onLevel={(level) => store.setLevel(r.id, level)}
      onValue={(value) => store.setValue(r.id, value)}
      onRemove={() => store.removeRow(r.id)}
      highlighted={focusId === r.id}
    />
  )

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Expertise &amp; skills
        </h3>
        {anyOfKinds.length > 0 && (
          <p className="mb-2 flex gap-1.5 rounded-lg bg-paper px-2.5 py-2 text-[11.5px] leading-snug text-ink-soft">
            <Info size={13} className="mt-px shrink-0" aria-hidden />
            <span>
              Several Required {anyOfKinds.join(' and ')} rows count as{' '}
              <b className="font-semibold">any of</b>: a candidate needs at least one of them, like
              selecting several in the filter bar.
            </span>
          </p>
        )}
        <div className="space-y-2">{tagRows.map(renderRow)}</div>

        {adding ? (
          <AddTagPicker
            kind={adding}
            groups={adding === 'expertise' ? options.expertiseGroups : options.skillGroups}
            taken={tagRows.flatMap((r) => (r.kind === adding ? [r.value.name] : []))}
            onCancel={() => setAdding(null)}
            onPick={(name, level) => {
              add(makeRow(adding, { name, level }))
              setAdding(null)
            }}
          />
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <AddChip label="Expertise" disabled={atCap} onClick={() => setAdding('expertise')} />
            <AddChip label="Skill" disabled={atCap} onClick={() => setAdding('skill')} />
            {atCap && (
              <span className="text-[11.5px] text-ink-faint">Up to {MAX_TAG_ROWS} expertise and skill rows.</span>
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Other requirements
        </h3>
        <div className="space-y-2">{otherRows.map(renderRow)}</div>
        {missing.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {missing.map((kind) => (
              <AddChip
                key={kind}
                label={
                  requirements.some((r) => r.kind === kind && r.level === 'must')
                    ? `${ADD_LABELS[kind]} preference`
                    : ADD_LABELS[kind]
                }
                onClick={() =>
                  add(
                    kind === 'org_history'
                      ? makeRow(kind, { org: orgPrefill, scope: 'ever', peers: [] })
                      : makeRow(kind),
                  )
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/** Native select with one group per category: the category itself ("broad")
 *  first, then its items. Names already in the grid are left out. */
function AddTagPicker({
  kind,
  groups,
  taken,
  onPick,
  onCancel,
}: {
  kind: TagKind
  groups: OptionGroup[]
  taken: string[]
  onPick: (name: string, level: 'category' | 'item') => void
  onCancel: () => void
}) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <select
        autoFocus
        defaultValue=""
        aria-label={`Add ${KIND_LABELS[kind].toLowerCase()}`}
        onChange={(e) => {
          const [level, name] = e.target.value.split('|')
          if (name) onPick(name, level as 'category' | 'item')
        }}
        className="min-w-0 flex-1 rounded-lg border border-line bg-white px-2 py-1.5 text-xs outline-none focus:border-brand-400"
      >
        <option value="" disabled>
          {kind === 'expertise' ? 'Choose expertise…' : 'Choose a skill…'}
        </option>
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {!taken.includes(g.label) && <option value={`category|${g.label}`}>All of {g.label} (broad)</option>}
            {g.items
              .filter((i) => !taken.includes(i))
              .map((i) => (
                <option key={i} value={`item|${i}`}>
                  {i}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      <button type="button" onClick={onCancel} className="text-xs font-medium text-ink-faint hover:text-ink">
        Cancel
      </button>
    </div>
  )
}
