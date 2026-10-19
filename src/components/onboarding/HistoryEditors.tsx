import { Plus } from 'lucide-react'
import type {
  AdditionalExperienceEntry,
  EducationEntry,
  WorkHistoryEntry,
} from '../../types/db'
import { FieldRow, ListItemCard, TextArea, TextField } from './fields'
import { LogoLookup } from './LogoLookup'

// The three Experience-tab history editors (PRD 7.2/7.3): Work History (≤10,
// with manual logo URL — Brandfetch autocomplete is a P1 fast-follow, 7.11),
// Education (≤5), Additional Experience (≤5). Year-level dates only.

function AddButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink-faint/50 px-3.5 py-1.5 text-sm font-medium text-ink-soft hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Plus size={14} /> {label}
    </button>
  )
}

export function YearFields({
  start,
  end,
  onStart,
  onEnd,
  endHint = 'Blank = Present',
}: {
  start: number | ''
  end: number | ''
  onStart: (v: number | '') => void
  onEnd: (v: number | '') => void
  endHint?: string
}) {
  const yearProps = { type: 'number', min: 1950, max: 2035, className: 'mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400' }
  return (
    <FieldRow>
      <label className="block text-sm">
        <span className="font-medium">Start year</span>
        <input {...yearProps} value={start} onChange={(e) => onStart(e.target.value ? +e.target.value : '')} />
      </label>
      <label className="block text-sm">
        <span className="font-medium">End year</span>
        <input {...yearProps} value={end} onChange={(e) => onEnd(e.target.value ? +e.target.value : '')} />
        <span className="mt-0.5 block text-xs text-ink-faint">{endHint}</span>
      </label>
    </FieldRow>
  )
}

export function WorkHistoryEditor({
  value,
  onChange,
  cap,
}: {
  value: WorkHistoryEntry[]
  onChange: (next: WorkHistoryEntry[]) => void
  cap: number
}) {
  const update = (i: number, patch: Partial<WorkHistoryEntry>) =>
    onChange(value.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  return (
    <div className="space-y-3">
      {value.map((entry, i) => (
        <ListItemCard key={i} onRemove={() => onChange(value.filter((_, j) => j !== i))}>
          <FieldRow>
            <TextField label="Organization" value={entry.organization} onChange={(v) => update(i, { organization: v })} />
            <TextField label="Role" value={entry.role} onChange={(v) => update(i, { role: v })} />
          </FieldRow>
          <YearFields
            start={entry.start_year || ''}
            end={entry.end_year ?? ''}
            onStart={(v) => update(i, { start_year: v || 0 })}
            onEnd={(v) => update(i, { end_year: v === '' ? null : v })}
          />
          <div>
            <TextField
              label="Logo URL (optional)"
              value={entry.logo_url ?? ''}
              onChange={(v) => update(i, { logo_url: v || null })}
              placeholder="https://…/logo.png"
              hint="Paste an image URL — shown in Work History and as a card-front Sector Experience chip"
            />
            <div className="mt-1">
              <LogoLookup
                organization={entry.organization}
                onPick={(url) => update(i, { logo_url: url })}
              />
            </div>
          </div>
          <TextArea
            label="Description (optional)"
            rows={2}
            value={entry.description ?? ''}
            onChange={(v) => update(i, { description: v || null })}
          />
        </ListItemCard>
      ))}
      <AddButton
        label={`Add role (${value.length}/${cap})`}
        disabled={value.length >= cap}
        onClick={() =>
          onChange([
            ...value,
            { organization: '', role: '', start_year: new Date().getFullYear(), end_year: null, logo_url: null, description: null },
          ])
        }
      />
    </div>
  )
}

export function EducationEditor({
  value,
  onChange,
  cap,
}: {
  value: EducationEntry[]
  onChange: (next: EducationEntry[]) => void
  cap: number
}) {
  const update = (i: number, patch: Partial<EducationEntry>) =>
    onChange(value.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  return (
    <div className="space-y-3">
      {value.map((entry, i) => (
        <ListItemCard key={i} onRemove={() => onChange(value.filter((_, j) => j !== i))}>
          <FieldRow>
            <TextField label="Institution" value={entry.institution} onChange={(v) => update(i, { institution: v })} />
            <TextField label="Degree / course" value={entry.degree_or_course} onChange={(v) => update(i, { degree_or_course: v })} />
          </FieldRow>
          <YearFields
            start={entry.start_year || ''}
            end={entry.end_year ?? ''}
            onStart={(v) => update(i, { start_year: v || 0 })}
            onEnd={(v) => update(i, { end_year: v === '' ? null : v })}
            endHint=""
          />
          <TextField
            label="Logo URL (optional)"
            value={entry.logo_url ?? ''}
            onChange={(v) => update(i, { logo_url: v || null })}
            placeholder="https://…/crest.png"
          />
        </ListItemCard>
      ))}
      <AddButton
        label={`Add education (${value.length}/${cap})`}
        disabled={value.length >= cap}
        onClick={() =>
          onChange([
            ...value,
            { institution: '', degree_or_course: '', start_year: new Date().getFullYear() - 4, end_year: null, logo_url: null },
          ])
        }
      />
    </div>
  )
}

export function AdditionalExperienceEditor({
  value,
  onChange,
  cap,
}: {
  value: AdditionalExperienceEntry[]
  onChange: (next: AdditionalExperienceEntry[]) => void
  cap: number
}) {
  const update = (i: number, patch: Partial<AdditionalExperienceEntry>) =>
    onChange(value.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  return (
    <div className="space-y-3">
      {value.map((entry, i) => (
        <ListItemCard key={i} onRemove={() => onChange(value.filter((_, j) => j !== i))}>
          <FieldRow>
            <TextField label="Organization" value={entry.organization} onChange={(v) => update(i, { organization: v })} />
            <TextField label="Role" value={entry.role} onChange={(v) => update(i, { role: v })} />
          </FieldRow>
          <YearFields
            start={entry.start_year || ''}
            end={entry.end_year ?? ''}
            onStart={(v) => update(i, { start_year: v || 0 })}
            onEnd={(v) => update(i, { end_year: v === '' ? null : v })}
          />
          <TextArea
            label="Description (optional)"
            rows={2}
            value={entry.description ?? ''}
            onChange={(v) => update(i, { description: v || null })}
          />
        </ListItemCard>
      ))}
      <AddButton
        label={`Add entry (${value.length}/${cap})`}
        disabled={value.length >= cap}
        onClick={() =>
          onChange([
            ...value,
            { organization: '', role: '', start_year: new Date().getFullYear(), end_year: null, description: null },
          ])
        }
      />
    </div>
  )
}
