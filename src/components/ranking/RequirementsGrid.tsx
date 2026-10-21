import { Info, Plus } from 'lucide-react'
import { useState } from 'react'
import { MAX_TAG_ROWS } from '../../lib/matching/config'
import { ALWAYS_PRESENT_KINDS, type Requirement } from '../../lib/matching/types'
import { tagRowCount } from '../../lib/requirements/model'
import { makeRow, type RequirementsStore } from '../../lib/requirements/store'
import type { OptionGroup } from '../ui/MultiSelect'
import { RequirementRow, type PickerOptions } from './RequirementRow'

// The requirements grid (match rework spec §3): expertise and skill rows
// (from the JD or added here) first, then the always-present rows.

export interface GridOptions extends PickerOptions {
  /** Taxonomy for "+ Add expertise" / "+ Add skill": category → items. */
  expertiseGroups: OptionGroup[]
  skillGroups: OptionGroup[]
}

type TagKind = 'expertise' | 'skill'

export function RequirementsGrid({
  store,
  options,
  focusId,
}: {
  store: RequirementsStore
  options: GridOptions
  focusId: string | null
}) {
  const { requirements } = store.state
  const tagRows = requirements.filter((r) => r.kind === 'expertise' || r.kind === 'skill')
  const otherRows = ALWAYS_PRESENT_KINDS.map((k) => requirements.find((r) => r.kind === k)).filter(
    (r): r is Requirement => !!r,
  )
  const atCap = tagRowCount(requirements) >= MAX_TAG_ROWS
  const [adding, setAdding] = useState<TagKind | null>(null)

  const mustCount = (kind: TagKind) => tagRows.filter((r) => r.kind === kind && r.level === 'must').length
  const anyOfKinds = (['expertise', 'skill'] as const).filter((k) => mustCount(k) >= 2)

  const renderRow = (r: Requirement, removable: boolean) => (
    <RequirementRow
      key={r.id}
      row={r}
      options={options}
      onLevel={(level) => store.setLevel(r.id, level)}
      onValue={(value) => store.setValue(r.id, value)}
      onRemove={removable ? () => store.removeRow(r.id) : undefined}
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
              Several Must-have {anyOfKinds.map((k) => (k === 'expertise' ? 'expertise' : 'skill')).join(' and ')}{' '}
              rows count as <b className="font-semibold">any of</b>: a candidate needs at least one of
              them, like selecting several in the filter bar.
            </span>
          </p>
        )}
        <div className="space-y-2">
          {tagRows.map((r) => renderRow(r, true))}
          {tagRows.length === 0 && (
            <p className="rounded-xl border border-dashed border-line px-3 py-3 text-xs text-ink-faint">
              Read the job description to pull out expertise and skills, or add them yourself.
            </p>
          )}
        </div>

        {adding ? (
          <AddTagPicker
            kind={adding}
            groups={adding === 'expertise' ? options.expertiseGroups : options.skillGroups}
            taken={tagRows.filter((r) => r.kind === adding).map((r) => (r.kind === adding ? r.value.name : ''))}
            onCancel={() => setAdding(null)}
            onPick={(name, level) => {
              store.addRow(makeRow(adding, { name, level }, { level: 'strong', source: 'manual' }))
              setAdding(null)
            }}
          />
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {(['expertise', 'skill'] as const).map((k) => (
              <button
                key={k}
                type="button"
                disabled={atCap}
                onClick={() => setAdding(k)}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-ink-soft hover:border-ink-faint disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={13} /> Add {k === 'expertise' ? 'expertise' : 'skill'}
              </button>
            ))}
            {atCap && (
              <span className="text-[11.5px] text-ink-faint">
                Up to {MAX_TAG_ROWS} expertise and skill rows.
              </span>
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Other requirements
        </h3>
        <div className="space-y-2">{otherRows.map((r) => renderRow(r, false))}</div>
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
        aria-label={kind === 'expertise' ? 'Add domain expertise' : 'Add technical skill'}
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
