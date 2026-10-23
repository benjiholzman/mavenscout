import { Plus } from 'lucide-react'
import { PROFILE_LIMITS } from '../../lib/config'
import type { Accreditation } from '../../types/db'
import { FieldRow, ListItemCard, TextField } from './fields'

/** Accreditations & certifications editor (PRD 7.15) — self-attested formal
 *  credentials: {name, issuing org, year, credential id/url}. */
export function AccreditationsEditor({
  value,
  onChange,
}: {
  value: Accreditation[]
  onChange: (next: Accreditation[]) => void
}) {
  const update = (i: number, patch: Partial<Accreditation>) =>
    onChange(value.map((a, j) => (j === i ? { ...a, ...patch } : a)))
  return (
    <div className="space-y-3">
      {value.map((acc, i) => (
        <ListItemCard key={i} onRemove={() => onChange(value.filter((_, j) => j !== i))}>
          <FieldRow>
            <TextField label="Credential" value={acc.name} onChange={(v) => update(i, { name: v })} placeholder="PMP, PhD, M&E certification…" />
            <TextField label="Issuing organization" value={acc.issuing_organization} onChange={(v) => update(i, { issuing_organization: v })} />
          </FieldRow>
          <FieldRow>
            <label className="block text-sm">
              <span className="font-medium">Year (optional)</span>
              <input
                type="number"
                min={1950}
                max={2035}
                value={acc.year ?? ''}
                onChange={(e) => update(i, { year: e.target.value ? +e.target.value : null })}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <TextField
              label="Credential ID or URL (optional)"
              value={acc.credential_id_or_url ?? ''}
              onChange={(v) => update(i, { credential_id_or_url: v || null })}
            />
          </FieldRow>
        </ListItemCard>
      ))}
      <button
        onClick={() =>
          onChange([...value, { name: '', issuing_organization: '', year: null, credential_id_or_url: null }])
        }
        disabled={value.length >= PROFILE_LIMITS.certifications.max}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink-faint/50 px-3.5 py-1.5 text-sm font-medium text-ink-soft hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={14} /> Add credential ({value.length}/{PROFILE_LIMITS.certifications.max})
      </button>
    </div>
  )
}
