import { Info, Plus, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { AvailabilityControls } from '../directory/AvailabilityControls'
import { EXPERTISE_TIER_LIMITS } from '../../lib/config'
import { describeExpertiseSelection, EXPERTISE_KIND_LABELS, type ExpertiseIndex } from '../../lib/expertise'
import { DEFAULT_AVAILABILITY, isDefaultAvailability, locationLabel } from '../../lib/filters'
import { MIN_PROFICIENCY_LABELS } from '../../lib/languages'
import { MAX_TAG_ROWS } from '../../lib/matching/config'
import type { Level, Requirement, RequirementOf } from '../../lib/matching/types'
import { CAREER_LEVEL_SHORT, KIND_LABELS } from '../../lib/requirements/labels'
import {
  isMust,
  makeRow,
  preferenceRowOf,
  requiredRowOf,
  rowHasValue,
  setKindRow,
  type SingleKind,
} from '../../lib/requirements/model'
import type { PriorityKey } from '../../lib/requirements/priorities'
import type { RequirementsStore } from '../../lib/requirements/store'
import { ExpertisePicker } from '../ui/ExpertisePicker'
import { MultiSelect, type TreeNode } from '../ui/MultiSelect'
import { Segmented } from '../ui/Segmented'
import { Switch } from '../ui/Switch'
import { LevelControl } from './LevelControl'
import { ChipToggles, Note, OrgHistoryPicker } from './pickers'

// The priority editors that slide in over "Your priorities" (one per
// priority). They read and write the shared rows through the store, so a Must
// have set here is the filter bar's filter, and the reverse.
//
// Location and Language always show two sections: Must have (the kind's
// Required row) and Preferred (its preference row, Nice to have or
// Important) — at most one of each. The other priorities have one level
// control; No preference removes the row.

export interface PickerOptions {
  /** The unified expertise list. */
  expertise: ExpertiseIndex
  /** Continent → sub-region → country → city (lib/locations). */
  locations: TreeNode[]
  languages: string[]
  types: string[]
  workArrangements: string[]
}

const PREFERRED_LEVELS: Level[] = ['slight', 'strong']

const hint = 'text-xs leading-snug text-ink-faint'

function Section({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-3">
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      <p className={`mt-0.5 ${hint}`}>{sub}</p>
      <div className="mt-2.5 space-y-2.5">{children}</div>
    </section>
  )
}

export function PriorityEditor({
  priority,
  store,
  options,
  orgPrefill,
}: {
  priority: PriorityKey
  store: RequirementsStore
  options: PickerOptions
  orgPrefill: string
}) {
  switch (priority) {
    case 'expertise':
      return <ExpertiseEditor store={store} options={options} />
    case 'location':
    case 'language':
      return <SplitEditor kind={priority} store={store} options={options} />
    case 'availability':
      return <AvailabilityEditor store={store} />
    case 'org_history':
      return <OrgHistoryEditor store={store} orgPrefill={orgPrefill} />
    case 'career_level':
    case 'work_arrangement':
    case 'type':
      return <ChipsEditor kind={priority} store={store} options={options} />
  }
}

/** One level for a single-row priority: No preference removes its rows;
 *  another level creates the row (with `initial`) or changes it. */
function useSingleLevel(store: RequirementsStore, kind: SingleKind, initial: () => Requirement['value']) {
  const rows = store.state.requirements.filter((r) => r.kind === kind)
  const row = rows.length === 1 ? rows[0] : undefined
  const setLevel = (level: Level | null) => {
    if (level === null) store.apply((rs) => rs.filter((r) => r.kind !== kind))
    else if (row) store.setLevel(row.id, level)
    else store.addRow(makeRow(kind, initial() as never, { level }))
  }
  return { row, setLevel }
}

// ---- Expertise ----------------------------------------------------------------

function ExpertiseEditor({ store, options }: { store: RequirementsStore; options: PickerOptions }) {
  const tagRows = store.state.requirements.filter((r): r is RequirementOf<'expertise'> => r.kind === 'expertise')
  const mustTags = tagRows.filter(isMust)
  const includeWorking = mustTags.some((r) => r.value.includeWorking)
  const setIncludeWorking = (on: boolean) =>
    mustTags.forEach((r) => store.setValue(r.id, on ? { name: r.value.name, includeWorking: true } : { name: r.value.name }))
  const atCap = tagRows.length >= MAX_TAG_ROWS

  return (
    <div className="space-y-4">
      <p className={hint}>Pick the expertise this work needs, then set how much each item matters.</p>

      {tagRows.length > 0 && (
        <ul className="space-y-2">
          {tagRows.map((r) => {
            const kind = options.expertise.byName.get(r.value.name)?.kind
            return (
              <li key={r.id} className="rounded-xl border border-line bg-white p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-ink">{r.value.name}</p>
                    {kind && <p className="text-xs text-ink-faint">{EXPERTISE_KIND_LABELS[kind]}</p>}
                  </div>
                  {r.source === 'jd' && (
                    <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-ink-faint">
                      from JD
                    </span>
                  )}
                </div>
                <LevelControl
                  value={r.level}
                  rowLabel={r.value.name}
                  onChange={(level) => (level === null ? store.removeRow(r.id) : store.setLevel(r.id, level))}
                />
              </li>
            )
          })}
        </ul>
      )}

      {mustTags.length > 0 && (
        <div className="space-y-2 rounded-lg bg-white px-3 py-2.5 text-[11.5px] leading-snug text-ink-soft ring-1 ring-line">
          <p className="flex gap-1.5">
            <Info size={13} className="mt-px shrink-0" aria-hidden />
            <span>
              {mustTags.length > 1 ? (
                <>
                  Must have:{' '}
                  <b className="font-semibold">
                    {describeExpertiseSelection(
                      mustTags.map((r) => r.value.name),
                      options.expertise,
                    )}
                  </b>
                  . Items of the same kind (sectors, themes, methods) count as any of; different kinds must all be met.
                </>
              ) : (
                <>Must have expertise counts Core and Strong tags{includeWorking ? ', and Working knowledge' : ''}.</>
              )}
            </span>
          </p>
          <Switch checked={includeWorking} onChange={setIncludeWorking} label="Include Working knowledge" />
          <Note tone="warn">
            Must have counts only the {EXPERTISE_TIER_LIMITS.core.max + EXPERTISE_TIER_LIMITS.strong.max} Core and Strong
            items each candidate picks{includeWorking ? ', plus Working knowledge' : ''}, so it may exclude qualified
            people who didn't tag it. Consider Important.
          </Note>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs font-medium text-ink-soft">
          {atCap ? `Up to ${MAX_TAG_ROWS} expertise items.` : 'Add expertise'}
        </p>
        <ExpertisePicker
          index={options.expertise}
          exclude={tagRows.map((r) => r.value.name)}
          disabled={atCap}
          inline={!atCap}
          onPick={(name) => store.addRow(makeRow('expertise', { name }))}
        />
      </div>
    </div>
  )
}

// ---- Location / Language: Must have + Preferred ------------------------------

function SplitEditor({
  kind,
  store,
  options,
}: {
  kind: 'location' | 'language'
  store: RequirementsStore
  options: PickerOptions
}) {
  const reqs = store.state.requirements
  const must = requiredRowOf(reqs, kind) as RequirementOf<typeof kind> | undefined
  const pref = preferenceRowOf(reqs, kind) as RequirementOf<typeof kind> | undefined
  const [adding, setAdding] = useState<'must' | 'pref' | null>(null)
  const isLocation = kind === 'location'
  const format = isLocation ? locationLabel : (v: string) => v

  const setValues = (toMust: boolean, row: typeof must, values: string[]) =>
    store.apply((rs) => setKindRow(rs, kind, toMust, values.length ? { ...(row?.value ?? {}), values } : null))

  const section = (toMust: boolean, row: typeof must) => {
    const values = row?.value.values ?? []
    const which = toMust ? 'must' : 'pref'
    const blocked = toMust ? [] : (must?.value.values ?? [])
    return (
      <>
        {values.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {values.map((v) => (
              <span
                key={v}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                  toMust ? 'bg-ink text-white' : 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                }`}
              >
                {format(v)}
                <button
                  type="button"
                  aria-label={`Remove ${format(v)}`}
                  onClick={() => setValues(toMust, row, values.filter((x) => x !== v))}
                  className="opacity-70 hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        {!toMust && row && (
          <LevelControl
            value={row.level}
            levels={PREFERRED_LEVELS}
            rowLabel={`Preferred ${KIND_LABELS[kind].toLowerCase()}`}
            onChange={(level) => level && store.setLevel(row.id, level)}
          />
        )}
        {row?.kind === 'language' && (
          <Segmented
            label={`${toMust ? 'Must have' : 'Preferred'} languages: minimum level`}
            value={row.value.min ?? 'working'}
            options={(['working', 'fluent'] as const).map((v) => ({ value: v, label: MIN_PROFICIENCY_LABELS[v] }))}
            onChange={(min) => store.setValue(row.id, { ...row.value, min })}
          />
        )}
        {adding === which ? (
          <div className="space-y-1.5">
            <MultiSelect
              inline
              open
              onToggle={() => {}}
              label={isLocation ? 'Places' : 'Languages'}
              tree={isLocation ? options.locations : undefined}
              options={isLocation ? undefined : options.languages}
              searchable
              formatValue={format}
              disabledValues={blocked}
              disabledLabel="already Must have"
              selected={values}
              onChange={(next) => setValues(toMust, row, next)}
            />
            <button
              type="button"
              onClick={() => setAdding(null)}
              className="text-xs font-medium text-brand-700 hover:text-brand-800"
            >
              Done
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(which)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-soft hover:border-brand-400 hover:text-brand-700"
          >
            <Plus size={12} aria-hidden />
            {values.length ? 'Change' : 'Choose'} {isLocation ? 'places' : 'languages'}
          </button>
        )}
      </>
    )
  }

  return (
    <div className="space-y-3">
      <Section
        title="Must have"
        sub={
          isLocation
            ? 'Only candidates based in one of these places. Shown in the filter bar too.'
            : 'Only candidates who speak one of these. Shown in the filter bar too.'
        }
      >
        {section(true, must)}
      </Section>
      <Section
        title="Preferred"
        sub={
          isLocation
            ? 'Candidates based here score higher; no one else is excluded.'
            : 'Candidates who speak one of these score higher; no one else is excluded.'
        }
      >
        {section(false, pref)}
      </Section>
    </div>
  )
}

// ---- Availability -------------------------------------------------------------

function AvailabilityEditor({ store }: { store: RequirementsStore }) {
  const { row, setLevel } = useSingleLevel(store, 'availability', () => ({ ...DEFAULT_AVAILABILITY }))
  const value = row?.kind === 'availability' ? row.value : DEFAULT_AVAILABILITY
  return (
    <div className="space-y-4">
      <LevelControl value={row?.level ?? null} onChange={setLevel} rowLabel="Availability" />
      <AvailabilityControls
        value={value}
        onChange={(next) => {
          if (row) store.setValue(row.id, next)
          else if (!isDefaultAvailability(next)) store.addRow(makeRow('availability', next))
        }}
      />
      {row && !rowHasValue(row) && (
        <Note tone="warn">Choose one track or a timing for this priority to count.</Note>
      )}
    </div>
  )
}

// ---- Organizational history ---------------------------------------------------

function OrgHistoryEditor({ store, orgPrefill }: { store: RequirementsStore; orgPrefill: string }) {
  const { row, setLevel } = useSingleLevel(store, 'org_history', () => ({ org: orgPrefill, scope: 'ever', peers: [] }))
  return (
    <div className="space-y-4">
      <Note>
        Add this deliberately: favoring people who worked where you work can entrench who-you-know hiring.
      </Note>
      <LevelControl value={row?.level ?? null} onChange={setLevel} rowLabel="Organizational history" />
      {row?.kind === 'org_history' ? (
        <>
          <OrgHistoryPicker value={row.value} onValue={(v) => store.setValue(row.id, v)} />
          {!rowHasValue(row) && <Note tone="warn">Add an organization name for this priority to count.</Note>}
        </>
      ) : (
        <p className={hint}>Off by default. Choose a level to pick an organization.</p>
      )}
    </div>
  )
}

// ---- Career level, Work arrangement (and Type while firms are listed) --------

function ChipsEditor({
  kind,
  store,
  options,
}: {
  kind: 'career_level' | 'work_arrangement' | 'type'
  store: RequirementsStore
  options: PickerOptions
}) {
  const reqs = store.state.requirements
  const choices =
    kind === 'career_level'
      ? Object.entries(CAREER_LEVEL_SHORT).map(([value, label]) => ({ value, label }))
      : (kind === 'type' ? options.types : options.workArrangements).map((v) => ({ value: v, label: v }))
  const must = requiredRowOf(reqs, kind) as RequirementOf<typeof kind> | undefined
  const pref = preferenceRowOf(reqs, kind) as RequirementOf<typeof kind> | undefined
  const { row, setLevel } = useSingleLevel(store, kind, () => ({ values: [] }))
  const note =
    kind === 'career_level' ? (
      <Note>Firms aren't applicable — never excluded or adjusted by this priority.</Note>
    ) : null

  // A Must have from the filter bar plus a preference: both, as sections.
  if (must && pref)
    return (
      <div className="space-y-3">
        <Section title="Must have" sub="Only candidates matching one of these. Shown in the filter bar too.">
          <ChipToggles
            choices={choices}
            selected={must.value.values}
            onChange={(values) => store.apply((rs) => setKindRow(rs, kind, true, values.length ? { values } : null))}
          />
        </Section>
        <Section title="Preferred" sub="Candidates matching one of these score higher; no one else is excluded.">
          <LevelControl
            value={pref.level}
            levels={PREFERRED_LEVELS}
            rowLabel={`Preferred ${KIND_LABELS[kind].toLowerCase()}`}
            onChange={(level) => level && store.setLevel(pref.id, level)}
          />
          <ChipToggles
            choices={choices}
            disabledValues={must.value.values}
            selected={pref.value.values}
            onChange={(values) => store.apply((rs) => setKindRow(rs, kind, false, values.length ? { values } : null))}
          />
        </Section>
        {note}
      </div>
    )

  const selected = row && 'values' in row.value ? row.value.values : []
  return (
    <div className="space-y-4">
      <LevelControl value={row?.level ?? null} onChange={setLevel} rowLabel={KIND_LABELS[kind]} />
      <ChipToggles
        choices={choices}
        selected={selected}
        onChange={(values) =>
          row ? store.setValue(row.id, { values }) : store.apply((rs) => setKindRow(rs, kind, false, { values }))
        }
      />
      {row && !rowHasValue(row) && <Note tone="warn">Choose at least one option for this priority to count.</Note>}
      {note}
    </div>
  )
}
