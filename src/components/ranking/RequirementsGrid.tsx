import { Info, Plus } from 'lucide-react'
import { useState } from 'react'
import { describeExpertiseSelection, type ExpertiseIndex } from '../../lib/expertise'
import { FIRMS_ENABLED } from '../../lib/config'
import { MAX_TAG_ROWS } from '../../lib/matching/config'
import { ALWAYS_PRESENT_KINDS, type Requirement, type RequirementOf } from '../../lib/matching/types'
import {
  canAddKind,
  isMust,
  isValuesKind,
  makeRow,
  requiredRowOf,
  tagRowCount,
  type SingleKind,
} from '../../lib/requirements/model'
import type { RequirementsStore } from '../../lib/requirements/store'
import { ExpertisePicker } from '../ui/ExpertisePicker'
import { Switch } from '../ui/Switch'
import { RequirementRow, type PickerOptions } from './RequirementRow'

// The requirements grid (match rework spec §3). Rows only exist once added:
// expertise items (from JD suggestions or "+ Expertise"), then "Other
// requirements", which starts empty with one add chip per kind. Filters set in
// the filter bar arrive here as Required rows. A multi-value kind can show
// two rows: its Required row and a preference row (e.g. Required: French,
// Nice to have: English).

export interface GridOptions extends PickerOptions {
  /** The unified expertise list, for "+ Expertise" and the Required rule. */
  expertise: ExpertiseIndex
}

/** Add-chip order for "Other requirements". Type is offered only while firm
 *  listings are on (spec §1). */
const ADD_ORDER: SingleKind[] = (
  [
    'location',
    'language',
    'availability',
    'org_history',
    'type',
    'career_level',
    'work_arrangement',
    'video_qna',
    'audio_testimonial',
  ] as SingleKind[]
).filter((k) => FIRMS_ENABLED || k !== 'type')

const ADD_LABELS: Record<SingleKind, string> = {
  location: 'Location',
  language: 'Language',
  availability: 'Availability',
  org_history: 'Org history',
  type: 'Type',
  career_level: 'Career level',
  work_arrangement: 'Work arrangement',
  video_qna: 'Has video Q&As',
  audio_testimonial: 'Has audio testimonial',
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
  const tagRows = requirements.filter((r): r is RequirementOf<'expertise'> => r.kind === 'expertise')
  // Already in display order (normalizeRequirements): per kind, Required first.
  const otherRows = requirements.filter((r) => (ALWAYS_PRESENT_KINDS as readonly string[]).includes(r.kind))
  // A multi-value kind can still get a preference row next to its Required row.
  const missing = ADD_ORDER.filter((k) => canAddKind(requirements, k))
  const atCap = tagRowCount(requirements) >= MAX_TAG_ROWS
  const [adding, setAdding] = useState(false)

  // Required expertise rows: OR within a kind, AND across kinds; one shared
  // "Include Working knowledge" setting, kept on each row.
  const mustTags = tagRows.filter(isMust)
  const includeWorking = mustTags.some((r) => r.value.includeWorking)
  const setIncludeWorking = (on: boolean) =>
    mustTags.forEach((r) => store.setValue(r.id, on ? { name: r.value.name, includeWorking: true } : { name: r.value.name }))

  /** For a multi-value preference row: values its Required row already has. */
  const requiredValuesFor = (r: Requirement): string[] => {
    if (isMust(r) || !isValuesKind(r.kind)) return []
    const req = requiredRowOf(requirements, r.kind)
    return req && 'values' in req.value ? req.value.values : []
  }

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
      requiredValues={requiredValuesFor(r)}
    />
  )

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Expertise</h3>
        {mustTags.length > 0 && (
          <div className="mb-2 space-y-2 rounded-lg bg-paper px-2.5 py-2 text-[11.5px] leading-snug text-ink-soft">
            <p className="flex gap-1.5">
              <Info size={13} className="mt-px shrink-0" aria-hidden />
              <span>
                {mustTags.length > 1 ? (
                  <>
                    Required: <b className="font-semibold">{describeExpertiseSelection(mustTags.map((r) => r.value.name), options.expertise)}</b>.
                    Items of the same kind (sectors, themes, methods) count as any of; different kinds must all be met.
                  </>
                ) : (
                  <>Required expertise counts Core and Strong tags{includeWorking ? ', and Working knowledge' : ''}.</>
                )}
              </span>
            </p>
            <Switch checked={includeWorking} onChange={setIncludeWorking} label="Include Working knowledge" />
          </div>
        )}
        <div className="space-y-2">{tagRows.map(renderRow)}</div>

        {adding ? (
          <div className="mt-2 flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <ExpertisePicker
                index={options.expertise}
                exclude={tagRows.map((r) => r.value.name)}
                autoFocus
                onPick={(name) => {
                  add(makeRow('expertise', { name }))
                  setAdding(false)
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="mt-2 text-xs font-medium text-ink-faint hover:text-ink"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <AddChip label="Expertise" disabled={atCap} onClick={() => setAdding(true)} />
            {atCap && <span className="text-[11.5px] text-ink-faint">Up to {MAX_TAG_ROWS} expertise rows.</span>}
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
