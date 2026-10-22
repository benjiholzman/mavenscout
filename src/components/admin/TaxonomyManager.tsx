import { ArrowDown, ArrowUp, Check, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EXPERTISE_KIND_LABELS, KIND_ORDER } from '../../lib/expertise'
import { supabase } from '../../lib/supabase'
import type { ExpertiseKind, TaxonomyCategory, TaxonomyItem, TaxonomyRequest } from '../../types/db'

// Taxonomy management (PRD 7.10, profiles-membership §6): the unified
// expertise list — items under browsing groups, each with a kind (sector /
// theme / method: drives Required-row matching) and search aliases — plus
// work arrangements, and the new-item request queue. Approving a request adds
// the item to a group with a kind.
//
// The old Domain Expertise / Technical Skills lists stay in the database for
// code on main until 012_cleanup_legacy_data.sql; they aren't edited here.
// Renaming an item doesn't rename it on profiles that already list it (tags
// reference names); the old name is kept as a legacy name so saved rankings
// still read it, and the editor flags such tags for the consultant to replace.

const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

function KindSelect({ value, onChange }: { value: ExpertiseKind; onChange: (k: ExpertiseKind) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ExpertiseKind)}
      aria-label="Kind"
      className="shrink-0 rounded-md border border-line bg-white px-1.5 py-0.5 text-xs text-ink-soft outline-none focus:border-brand-400"
    >
      {KIND_ORDER.map((k) => (
        <option key={k} value={k}>
          {EXPERTISE_KIND_LABELS[k]}
        </option>
      ))}
    </select>
  )
}

export function TaxonomyManager() {
  const [cats, setCats] = useState<TaxonomyCategory[]>([])
  const [items, setItems] = useState<TaxonomyItem[]>([])
  const [requests, setRequests] = useState<TaxonomyRequest[]>([])
  const [newItem, setNewItem] = useState<{ categoryId: string; name: string; kind: ExpertiseKind } | null>(null)
  /** Per request: the group and kind it will be approved into. */
  const [placement, setPlacement] = useState<Record<string, { categoryId: string; kind: ExpertiseKind }>>({})

  const load = async () => {
    const [c, i, r] = await Promise.all([
      supabase.from('taxonomy_categories').select('*').order('sort_order'),
      supabase.from('taxonomy_items').select('*').order('sort_order'),
      supabase.from('taxonomy_requests').select('*').eq('status', 'pending').order('created_at'),
    ])
    setCats((c.data as TaxonomyCategory[]) ?? [])
    setItems((i.data as TaxonomyItem[]) ?? [])
    setRequests((r.data as TaxonomyRequest[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  const groups = cats.filter((c) => c.type === 'expertise')
  const itemsOf = (catId: string) => items.filter((i) => i.category_id === catId)
  /** A group's usual kind, as the default for a new item in it. */
  const usualKind = (catId: string): ExpertiseKind => {
    const kinds = itemsOf(catId).map((i) => i.kind ?? 'sector')
    return KIND_ORDER.slice().sort((a, b) => kinds.filter((k) => k === b).length - kinds.filter((k) => k === a).length)[0]!
  }

  const update = async (id: string, patch: Partial<TaxonomyItem>) => {
    await supabase.from('taxonomy_items').update(patch).eq('id', id)
    load()
  }

  const swapItems = async (a: TaxonomyItem, b: TaxonomyItem) => {
    await Promise.all([
      supabase.from('taxonomy_items').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('taxonomy_items').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    load()
  }

  const placementOf = (req: TaxonomyRequest) => {
    const chosen = placement[req.id]
    if (chosen) return chosen
    const cat = groups.find((g) => g.name === req.proposed_parent) ?? groups[0]
    return cat ? { categoryId: cat.id, kind: usualKind(cat.id) } : null
  }

  const approveRequest = async (req: TaxonomyRequest) => {
    const place = placementOf(req)
    if (!place) return
    await supabase.from('taxonomy_items').insert({
      category_id: place.categoryId,
      name: req.proposed_name,
      kind: place.kind,
      sort_order: itemsOf(place.categoryId).length + 1,
    })
    await supabase.from('taxonomy_requests').update({ status: 'approved' }).eq('id', req.id)
    load()
  }

  const workArrangement = cats.filter((c) => c.type === 'work_arrangement')

  return (
    <div className="space-y-8">
      {/* Request queue first — it's the actionable part */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">
          New-item requests ({requests.length})
        </h3>
        {requests.length === 0 ? (
          <p className="text-sm text-ink-faint">No pending requests.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => {
              const place = placementOf(r)
              return (
                <div key={r.id} className="space-y-2 rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm">
                  <p>
                    <strong>{r.proposed_name}</strong>
                    {r.proposed_parent && <span className="text-xs text-ink-faint"> · suggested group: {r.proposed_parent}</span>}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <select
                      value={place?.categoryId ?? ''}
                      onChange={(e) =>
                        setPlacement({ ...placement, [r.id]: { categoryId: e.target.value, kind: usualKind(e.target.value) } })
                      }
                      aria-label="Group"
                      className="rounded-md border border-line bg-white px-1.5 py-1 text-xs outline-none focus:border-brand-400"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    {place && (
                      <KindSelect value={place.kind} onChange={(kind) => setPlacement({ ...placement, [r.id]: { ...place, kind } })} />
                    )}
                    <span className="ml-auto flex gap-1.5">
                      <button
                        onClick={() => approveRequest(r)}
                        disabled={!place}
                        className="flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                      >
                        <Check size={12} /> Approve & add
                      </button>
                      <button
                        onClick={async () => {
                          await supabase.from('taxonomy_requests').update({ status: 'rejected' }).eq('id', r.id)
                          load()
                        }}
                        className="flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft"
                      >
                        <X size={12} /> Reject
                      </button>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-faint">Expertise</h3>
        <p className="mb-3 text-xs text-ink-faint">
          Groups are for browsing. Kind decides matching: Required items of the same kind count as any of;
          different kinds must all be met. Aliases are search terms (comma-separated).
        </p>
        <div className="space-y-3">
          {groups.map((cat) => {
            const children = itemsOf(cat.id)
            return (
              <div key={cat.id} className="rounded-lg border border-line bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <input
                    defaultValue={cat.name}
                    onBlur={async (e) => {
                      if (e.target.value !== cat.name && e.target.value.trim()) {
                        await supabase.from('taxonomy_categories').update({ name: e.target.value.trim() }).eq('id', cat.id)
                        load()
                      }
                    }}
                    aria-label="Group name"
                    className="w-full rounded-md border border-transparent px-1.5 py-0.5 text-sm font-semibold hover:border-line focus:border-brand-400 focus:outline-none"
                  />
                  <button
                    onClick={() => setNewItem({ categoryId: cat.id, name: '', kind: usualKind(cat.id) })}
                    className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    <Plus size={12} /> Item
                  </button>
                </div>
                <ul className="mt-1.5 divide-y divide-line-soft">
                  {children.map((item, idx) => (
                    <li key={item.id} className="group flex flex-wrap items-center gap-1.5 py-1">
                      <input
                        defaultValue={item.name}
                        onBlur={(e) => {
                          const name = e.target.value.trim()
                          if (name && name !== item.name)
                            update(item.id, { name, legacy_names: [...new Set([...(item.legacy_names ?? []), item.name])] })
                        }}
                        aria-label="Item name"
                        className="min-w-0 flex-1 basis-48 rounded-md border border-transparent px-1.5 py-0.5 text-sm text-ink hover:border-line focus:border-brand-400 focus:outline-none"
                      />
                      <KindSelect value={item.kind ?? 'sector'} onChange={(kind) => update(item.id, { kind })} />
                      <input
                        defaultValue={(item.aliases ?? []).join(', ')}
                        onBlur={(e) => {
                          const aliases = splitList(e.target.value)
                          if (aliases.join('|') !== (item.aliases ?? []).join('|')) update(item.id, { aliases })
                        }}
                        placeholder="Aliases"
                        aria-label={`${item.name} aliases`}
                        className="min-w-0 flex-1 basis-48 rounded-md border border-transparent px-1.5 py-0.5 text-xs text-ink-faint hover:border-line focus:border-brand-400 focus:outline-none"
                      />
                      <span className="flex opacity-60 transition group-hover:opacity-100">
                        <button
                          disabled={idx === 0}
                          onClick={() => swapItems(item, children[idx - 1]!)}
                          className="p-1 text-ink-faint hover:text-ink disabled:opacity-30"
                          aria-label={`Move ${item.name} up`}
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          disabled={idx === children.length - 1}
                          onClick={() => swapItems(item, children[idx + 1]!)}
                          className="p-1 text-ink-faint hover:text-ink disabled:opacity-30"
                          aria-label={`Move ${item.name} down`}
                        >
                          <ArrowDown size={12} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                {newItem?.categoryId === cat.id && (
                  <form
                    className="mt-2 flex flex-wrap gap-1.5"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      if (!newItem.name.trim()) return
                      await supabase.from('taxonomy_items').insert({
                        category_id: cat.id,
                        name: newItem.name.trim(),
                        kind: newItem.kind,
                        sort_order: children.length + 1,
                      })
                      setNewItem(null)
                      load()
                    }}
                  >
                    <input
                      autoFocus
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="New item name"
                      className="min-w-0 flex-1 rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-brand-400"
                    />
                    <KindSelect value={newItem.kind} onChange={(kind) => setNewItem({ ...newItem, kind })} />
                    <button type="submit" className="rounded-full bg-brand-500 px-3.5 py-1.5 text-xs font-medium text-white">
                      Add
                    </button>
                    <button type="button" onClick={() => setNewItem(null)} className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft">
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">Work arrangement</h3>
        {workArrangement.map((cat) => (
          <ul key={cat.id} className="rounded-lg border border-line bg-white p-3 text-sm text-ink-soft">
            {itemsOf(cat.id).map((i) => (
              <li key={i.id}>{i.name}</li>
            ))}
          </ul>
        ))}
      </section>
    </div>
  )
}
