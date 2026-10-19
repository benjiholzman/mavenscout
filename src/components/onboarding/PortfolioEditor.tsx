import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PORTFOLIO_LINK_CAP } from '../../lib/validation'
import type { PortfolioItem } from '../../types/db'
import { FieldRow, ListItemCard, TextArea, TextField } from './fields'
import { YearFields } from './HistoryEditors'

// Portfolio editor (PRD 7.2/7.3): portfolio_items is its own table, so this
// section does direct row CRUD (not part of the profiles-row save). Tier cap:
// 3 Standard / 10 Premium. Each item: name, organization, year span, role,
// description, results, cover image, captioned carousel images, up to 3 links.

type Draft = Omit<PortfolioItem, 'id'> & { id?: string }

export function PortfolioEditor({ profileId, cap }: { profileId: string; cap: number }) {
  const [items, setItems] = useState<Draft[] | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('portfolio_items')
      .select('*')
      .eq('profile_id', profileId)
      .order('sort_order')
      .then(({ data }) => setItems((data as PortfolioItem[]) ?? []))
  }, [profileId])

  if (!items) return <p className="text-sm text-ink-faint">Loading…</p>

  const update = (i: number, patch: Partial<Draft>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)))

  const saveAll = async () => {
    const badSpan = items.findIndex((it) => it.start_year && it.end_year && it.end_year < it.start_year)
    if (badSpan >= 0) return setStatus(`Error: project ${badSpan + 1} ends before it starts`)
    setStatus('Saving…')
    for (const [i, item] of items.entries()) {
      const row = { ...item, profile_id: profileId, sort_order: i + 1 }
      const { error } = item.id
        ? await supabase.from('portfolio_items').update(row).eq('id', item.id)
        : await supabase.from('portfolio_items').insert(row)
      if (error) return setStatus(`Error: ${error.message}`)
    }
    const { data } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('profile_id', profileId)
      .order('sort_order')
    setItems((data as PortfolioItem[]) ?? [])
    setStatus('Saved')
    setTimeout(() => setStatus(null), 2000)
  }

  const remove = async (i: number) => {
    const item = items[i]
    if (item.id) await supabase.from('portfolio_items').delete().eq('id', item.id)
    setItems(items.filter((_, j) => j !== i))
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <ListItemCard key={item.id ?? `new-${i}`} onRemove={() => remove(i)}>
          <FieldRow>
            <TextField
              label="Project name"
              value={item.project_name}
              onChange={(v) => update(i, { project_name: v })}
              hint="Describe the project; the organization and dates are shown separately."
            />
            <TextField label="Your role" value={item.role} onChange={(v) => update(i, { role: v })} />
          </FieldRow>
          <TextField
            label="Organization (optional)"
            value={item.organization ?? ''}
            onChange={(v) => update(i, { organization: v || null })}
            placeholder="e.g. GIZ, World Bank, Ministry of Health"
          />
          <YearFields
            start={item.start_year ?? ''}
            end={item.end_year ?? ''}
            onStart={(v) => update(i, { start_year: v === '' ? null : v })}
            onEnd={(v) => update(i, { end_year: v === '' ? null : v })}
            endHint="Blank = ongoing. Same as start for a single year."
          />
          <TextArea label="Description" rows={3} value={item.description} onChange={(v) => update(i, { description: v })} />
          <TextArea
            label="Results (what changed because of your work?)"
            rows={2}
            value={item.results ?? ''}
            onChange={(v) => update(i, { results: v || null })}
          />
          <TextField
            label="Cover image URL"
            value={item.cover_image ?? ''}
            onChange={(v) => update(i, { cover_image: v || null })}
            placeholder="https://…/cover.jpg"
          />

          {/* Carousel images with captions */}
          <div>
            <p className="text-sm font-medium">Carousel images</p>
            <div className="mt-1.5 space-y-1.5">
              {item.images.map((img, k) => (
                <div key={k} className="flex gap-1.5">
                  <input
                    value={img.url}
                    onChange={(e) =>
                      update(i, { images: item.images.map((m, l) => (l === k ? { ...m, url: e.target.value } : m)) })
                    }
                    placeholder="Image URL"
                    className="w-2/5 rounded-lg border border-line px-2.5 py-1.5 text-xs outline-none focus:border-brand-400"
                  />
                  <input
                    value={img.caption ?? ''}
                    onChange={(e) =>
                      update(i, { images: item.images.map((m, l) => (l === k ? { ...m, caption: e.target.value || null } : m)) })
                    }
                    placeholder="Caption (optional)"
                    className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-xs outline-none focus:border-brand-400"
                  />
                  <button
                    onClick={() => update(i, { images: item.images.filter((_, l) => l !== k) })}
                    aria-label="Remove image"
                    className="rounded-full p-1 text-ink-faint hover:text-red-600"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => update(i, { images: [...item.images, { url: '', caption: null }] })}
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                + Add image
              </button>
            </div>
          </div>

          {/* Links, capped at 3 */}
          <div>
            <p className="text-sm font-medium">Links ({item.links.length}/{PORTFOLIO_LINK_CAP})</p>
            <div className="mt-1.5 space-y-1.5">
              {item.links.map((link, k) => (
                <div key={k} className="flex gap-1.5">
                  <input
                    value={link.label}
                    onChange={(e) =>
                      update(i, { links: item.links.map((m, l) => (l === k ? { ...m, label: e.target.value } : m)) })
                    }
                    placeholder="Label"
                    className="w-2/5 rounded-lg border border-line px-2.5 py-1.5 text-xs outline-none focus:border-brand-400"
                  />
                  <input
                    value={link.url}
                    onChange={(e) =>
                      update(i, { links: item.links.map((m, l) => (l === k ? { ...m, url: e.target.value } : m)) })
                    }
                    placeholder="https://…"
                    className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-xs outline-none focus:border-brand-400"
                  />
                  <button
                    onClick={() => update(i, { links: item.links.filter((_, l) => l !== k) })}
                    aria-label="Remove link"
                    className="rounded-full p-1 text-ink-faint hover:text-red-600"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              {item.links.length < PORTFOLIO_LINK_CAP && (
                <button
                  onClick={() => update(i, { links: [...item.links, { label: '', url: '' }] })}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  + Add link
                </button>
              )}
            </div>
          </div>
        </ListItemCard>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={() =>
            setItems([
              ...items,
              {
                profile_id: profileId,
                project_name: '',
                organization: null,
                start_year: null,
                end_year: null,
                role: '',
                description: '',
                results: null,
                cover_image: null,
                images: [],
                links: [],
                sort_order: items.length + 1,
              },
            ])
          }
          disabled={items.length >= cap}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink-faint/50 px-3.5 py-1.5 text-sm font-medium text-ink-soft hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} /> Add project ({items.length}/{cap})
        </button>
        <button
          onClick={saveAll}
          className="rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Save portfolio
        </button>
        {status && <span className="text-sm text-ink-soft">{status}</span>}
      </div>
      {items.length >= cap && (
        <p className="text-xs text-ink-faint">
          Portfolio limit reached for your tier ({cap}). Premium raises it to 10.
        </p>
      )}
    </div>
  )
}
