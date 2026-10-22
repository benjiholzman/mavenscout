import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { invalidateOrgIndex, normalizeOrgName, ORG_TYPE_LABELS, orgAcronym, orgLogoUrl } from '../../lib/organizations'
import { supabase } from '../../lib/supabase'
import type { Organization, OrgType } from '../../types/db'
import { LogoLookup } from '../onboarding/LogoLookup'
import { OrgLogo } from '../ui/OrgLogo'

// Admin: the canonical organizations list (profiles-membership §8). Seeded by
// 009; admins add, edit and remove organizations here. Employers and clients
// that aren't on the list stay free text, so removing an organization never
// breaks a profile (portfolio links are ON DELETE SET NULL).

type Draft = Pick<Organization, 'name' | 'type' | 'logo_url'> & { aliases: string; domains: string }

const EMPTY_DRAFT: Draft = { name: '', type: 'ngo', logo_url: null, aliases: '', domains: '' }
const TYPES = Object.keys(ORG_TYPE_LABELS) as OrgType[]
const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

export function OrganizationsManager() {
  const [orgs, setOrgs] = useState<Organization[] | null>(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<OrgType | ''>('')
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    const { data, error } = await supabase.from('organizations').select('*').order('name')
    if (error) return setError(`${error.message}. Has 009_organizations.sql been run?`)
    setOrgs(data as Organization[])
    invalidateOrgIndex()
  }
  useEffect(() => {
    load()
  }, [])

  const shown = useMemo(() => {
    const q = normalizeOrgName(query)
    return (orgs ?? []).filter(
      (o) =>
        (!typeFilter || o.type === typeFilter) &&
        (!q || [o.name, ...o.aliases, ...o.domains].some((k) => normalizeOrgName(k).includes(q))),
    )
  }, [orgs, query, typeFilter])

  const save = async () => {
    if (!editing) return
    const { draft, id } = editing
    if (!draft.name.trim()) return setError('Name is required')
    const row = {
      name: draft.name.trim(),
      type: draft.type,
      // '' = show initials (for a domain Brandfetch maps to the wrong brand).
      logo_url: draft.logo_url === '' ? '' : draft.logo_url?.trim() || null,
      aliases: splitList(draft.aliases),
      domains: splitList(draft.domains).map((d) => d.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')),
    }
    const { error } = id
      ? await supabase.from('organizations').update(row).eq('id', id)
      : await supabase.from('organizations').insert(row)
    if (error) return setError(error.message)
    setError(null)
    setEditing(null)
    load()
  }

  const remove = async (org: Organization) => {
    if (!confirm(`Remove ${org.name} from the list? Entries naming it become free text.`)) return
    const { error } = await supabase.from('organizations').delete().eq('id', org.id)
    if (error) return setError(error.message)
    load()
  }

  const startEdit = (org: Organization | null) =>
    setEditing({
      id: org?.id ?? null,
      draft: org
        ? { name: org.name, type: org.type, logo_url: org.logo_url, aliases: org.aliases.join(', '), domains: org.domains.join(', ') }
        : EMPTY_DRAFT,
    })

  const form = editing && (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      className="space-y-3 rounded-lg border border-brand-200 bg-brand-50/40 p-3 text-sm"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="font-medium">Name</span>
          <input
            autoFocus
            value={editing.draft.name}
            onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, name: e.target.value } })}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-400"
          />
        </label>
        <label className="block">
          <span className="font-medium">Type</span>
          <select
            value={editing.draft.type}
            onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, type: e.target.value as OrgType } })}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand-400"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {ORG_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-medium">Aliases</span>
          <input
            value={editing.draft.aliases}
            onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, aliases: e.target.value } })}
            placeholder="Comma-separated, e.g. WB, IBRD"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-400"
          />
        </label>
        <label className="block">
          <span className="font-medium">Domains</span>
          <input
            value={editing.draft.domains}
            onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, domains: e.target.value } })}
            placeholder="Primary first, e.g. worldbank.org"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-400"
          />
        </label>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={editing.draft.logo_url === ''}
          onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, logo_url: e.target.checked ? '' : null } })}
        />
        Show initials instead of a logo
        <span className="text-xs text-ink-faint">(when the domain's logo is wrong)</span>
      </label>
      {editing.draft.logo_url !== '' && (
        <>
          <label className="block">
            <span className="font-medium">Logo URL</span>
            <span className="ml-1.5 text-xs text-ink-faint">Leave blank to use the primary domain's logo</span>
            <input
              value={editing.draft.logo_url ?? ''}
              onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, logo_url: e.target.value || null } })}
              placeholder="https://…"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-400"
            />
          </label>
          <LogoLookup
            organization={editing.draft.name}
            onPick={(url) => setEditing({ ...editing, draft: { ...editing.draft, logo_url: url } })}
          />
        </>
      )}
      <div className="flex gap-2">
        <button type="submit" className="rounded-full bg-brand-500 px-4 py-1.5 text-xs font-medium text-white">
          Save
        </button>
        <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-line px-3.5 py-1.5 text-xs text-ink-soft">
          Cancel
        </button>
      </div>
    </form>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-56">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, alias or domain"
            aria-label="Search organizations"
            className="w-full rounded-full border border-line py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as OrgType | '')}
          aria-label="Filter by type"
          className="rounded-full border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
        >
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {ORG_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button
          onClick={() => startEdit(null)}
          className="flex items-center gap-1 rounded-full bg-brand-500 px-3.5 py-2 text-sm font-medium text-white"
        >
          <Plus size={14} /> Organization
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {editing && !editing.id && form}
      {orgs && (
        <p className="text-xs text-ink-faint">
          {shown.length === orgs.length ? `${orgs.length} organizations` : `${shown.length} of ${orgs.length} organizations`}
        </p>
      )}
      <ul className="divide-y divide-line-soft rounded-lg border border-line bg-white">
        {shown.map((org) =>
          editing?.id === org.id ? (
            <li key={org.id} className="p-2">
              {form}
            </li>
          ) : (
            <li key={org.id} className="flex items-center gap-3 px-3 py-2.5">
              <OrgLogo
                url={orgLogoUrl(org)}
                name={org.name}
                acronym={orgAcronym(org)}
                className="h-8 w-8 rounded-md"
                monogramClassName="font-display text-[11px] font-bold"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{org.name}</p>
                <p className="truncate text-xs text-ink-faint">
                  {ORG_TYPE_LABELS[org.type]}
                  {org.aliases.length > 0 && ` · ${org.aliases.join(', ')}`}
                  {org.domains.length > 0 && ` · ${org.domains.join(', ')}`}
                </p>
              </div>
              <button onClick={() => startEdit(org)} aria-label={`Edit ${org.name}`} className="p-1.5 text-ink-faint hover:text-ink">
                <Pencil size={14} />
              </button>
              <button onClick={() => remove(org)} aria-label={`Remove ${org.name}`} className="p-1.5 text-ink-faint hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}
