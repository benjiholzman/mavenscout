import { Mic, Plus } from 'lucide-react'
import { useOrganizations } from '../../hooks/useOrganizations'
import { resolveOrganization } from '../../lib/organizations'
import { degreeFingerprint, employerFingerprint, employerOrgFingerprint } from '../../lib/verification/items'
import type {
  AdditionalExperienceEntry,
  EducationEntry,
  WorkHistoryEntry,
} from '../../types/db'
import { OrgPicker } from '../ui/OrgPicker'
import { CheckedNote, type CheckedMark } from './CheckedNote'
import { FieldRow, ListItemCard, TextArea, TextField } from './fields'
import { LogoLookup } from './LogoLookup'

// The three Experience-tab history editors (PRD 7.2/7.3): Work History (≤10),
// Education (≤5), Additional Experience (≤5). Year-level dates only.
// Work History employers come from the canonical organizations list
// (profiles-membership §8), which supplies the logo; the manual logo URL and
// Brandfetch lookup (PRD 7.11) remain only for organizations not on the list.

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

/** An entry's audio testimonial, mirrored from the testimonials section. */
export interface EntryTestimonialStatus {
  label: string
  /** An active request or testimonial: the entry can't be removed. */
  locked: boolean
}

export function WorkHistoryEditor({
  value,
  onChange,
  cap,
  testimonials = {},
  marks = {},
}: {
  value: WorkHistoryEntry[]
  onChange: (next: WorkHistoryEntry[]) => void
  cap: number
  /** By entry id. */
  testimonials?: Record<string, EntryTestimonialStatus>
  /** Verification labels by entry id (spec §3.1). */
  marks?: Record<string, CheckedMark>
}) {
  const orgs = useOrganizations()
  const update = (i: number, patch: Partial<WorkHistoryEntry>) =>
    onChange(value.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  return (
    <div className="space-y-3">
      {value.map((entry, i) => {
        const testimonial = entry.id ? testimonials[entry.id] : undefined
        return (
        <ListItemCard
          key={entry.id ?? i}
          onRemove={() => onChange(value.filter((_, j) => j !== i))}
          removeBlockedReason={
            testimonial?.locked
              ? 'This entry has an audio testimonial or an open request. Cancel or replace it under Audio testimonials first.'
              : null
          }
        >
          {testimonial && (
            <p className="flex items-center gap-1.5 text-xs text-ink-soft">
              <Mic size={12} className="text-brand-500" /> Audio testimonial: {testimonial.label}
            </p>
          )}
          {entry.id && marks[entry.id] && (
            <CheckedNote
              mark={marks[entry.id]}
              current={marks[entry.id].viaTestimonial ? employerOrgFingerprint(entry) : employerFingerprint(entry)}
              fields={marks[entry.id].viaTestimonial ? 'organization' : 'organization, role or years'}
            />
          )}
          <FieldRow>
            <OrgPicker
              label="Organization"
              value={entry.organization}
              orgId={entry.organization_id}
              onChange={(organization, organization_id) => update(i, { organization, organization_id })}
            />
            <TextField label="Role" value={entry.role} onChange={(v) => update(i, { role: v })} />
          </FieldRow>
          <YearFields
            start={entry.start_year || ''}
            end={entry.end_year ?? ''}
            onStart={(v) => update(i, { start_year: v || 0 })}
            onEnd={(v) => update(i, { end_year: v === '' ? null : v })}
          />
          {/* Listed organizations bring their own logo; this is for the rest. */}
          {entry.organization.trim() && !resolveOrganization(orgs, entry.organization, entry.organization_id) && (
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
          )}
          <TextArea
            label="Description (optional)"
            rows={2}
            value={entry.description ?? ''}
            onChange={(v) => update(i, { description: v || null })}
          />
        </ListItemCard>
        )
      })}
      <AddButton
        label={`Add role (${value.length}/${cap})`}
        disabled={value.length >= cap}
        onClick={() =>
          onChange([
            ...value,
            { id: crypto.randomUUID(), organization: '', organization_id: null, role: '', start_year: new Date().getFullYear(), end_year: null, logo_url: null, description: null },
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
  marks = {},
}: {
  value: EducationEntry[]
  onChange: (next: EducationEntry[]) => void
  cap: number
  /** Verification labels by entry id (spec §3.1). */
  marks?: Record<string, CheckedMark>
}) {
  const update = (i: number, patch: Partial<EducationEntry>) =>
    onChange(value.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  return (
    <div className="space-y-3">
      {value.map((entry, i) => (
        <ListItemCard key={entry.id ?? i} onRemove={() => onChange(value.filter((_, j) => j !== i))}>
          {entry.id && (
            <CheckedNote mark={marks[entry.id]} current={degreeFingerprint(entry)} fields="institution, degree or years" />
          )}
          <FieldRow>
            <TextField label="Institution" value={entry.institution} onChange={(v) => update(i, { institution: v })} />
            <TextField label="Degree / course" value={entry.degree_or_course} onChange={(v) => update(i, { degree_or_course: v })} />
          </FieldRow>
          <YearFields
            start={entry.start_year || ''}
            end={entry.end_year ?? ''}
            onStart={(v) => update(i, { start_year: v || 0 })}
            onEnd={(v) => update(i, { end_year: v === '' ? null : v })}
            endHint="Blank = ongoing. Your most recent completed degree is checked."
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
            { id: crypto.randomUUID(), institution: '', degree_or_course: '', start_year: new Date().getFullYear() - 4, end_year: null, logo_url: null },
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
