import { ArrowUp, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MEMBERSHIP_LIMITS, PORTFOLIO_FIELD_LIMITS } from '../../lib/config'
import { isPortfolioVideoUrl, portfolioItemErrors } from '../../lib/portfolio'
import { supabase } from '../../lib/supabase'
import type { PortfolioItem } from '../../types/db'
import { OrgPicker } from '../ui/OrgPicker'
import { FieldRow, ListItemCard, TextArea, TextField } from './fields'

// Portfolio editor (spec §7.2): portfolio_items is its own table, so this
// section does direct row CRUD (not part of the profiles-row save). Count by
// membership level: 3 Member / up to 10 Featured Member. Each item: title,
// start year + end year or Ongoing, role, organization (canonical list where
// possible), description, results, up to 3 captioned images (the first is the
// cover), up to 3 labelled links and one YouTube/Vimeo video link.

type Draft = Omit<PortfolioItem, 'id'> & { id?: string }

const L = PORTFOLIO_FIELD_LIMITS
const inputCls = 'rounded-lg border border-line px-2.5 py-1.5 text-xs outline-none focus:border-brand-400'
const yearCls =
  'mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:bg-paper disabled:text-ink-faint'

export function PortfolioEditor({
  profileId,
  cap,
  checkCount,
  onSaved,
}: {
  profileId: string
  cap: number
  /** Count rule for the save (lib/completeness): why going from `before` to
   *  `after` saved projects is refused, or null. */
  checkCount?: (before: number, after: number) => string | null
  /** The saved project count, after each save. */
  onSaved?: (count: number) => void
}) {
  const [items, setItems] = useState<Draft[] | null>(null)
  /** Items as loaded, by id: seeded items already over a limit can still be
   *  edited as long as they don't get further over it. */
  const [loaded, setLoaded] = useState<Map<string, PortfolioItem>>(new Map())
  const [status, setStatus] = useState<string | null>(null)

  const load = async () => {
    const { data } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('profile_id', profileId)
      .order('sort_order')
    const rows = (data as PortfolioItem[]) ?? []
    setItems(rows)
    setLoaded(new Map(rows.map((r) => [r.id, r])))
    return rows.length
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  if (!items) return <p className="text-sm text-ink-faint">Loading…</p>

  const update = (i: number, patch: Partial<Draft>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)))

  const saveAll = async () => {
    const countError = checkCount?.(loaded.size, items.length)
    if (countError) return setStatus(`Error: ${countError}.`)
    for (const [i, item] of items.entries()) {
      const errors = portfolioItemErrors(item, item.id ? loaded.get(item.id) : undefined)
      if (errors.length) return setStatus(`Project ${i + 1}: ${errors.join('; ')}.`)
    }
    setStatus('Saving…')
    // Removed projects are deleted on save, so the count rule covers them.
    const kept = new Set(items.map((it) => it.id).filter(Boolean))
    const removed = [...loaded.keys()].filter((id) => !kept.has(id))
    if (removed.length) {
      const { error } = await supabase.from('portfolio_items').delete().in('id', removed)
      if (error) return setStatus(`Error: ${error.message}`)
    }
    for (const [i, item] of items.entries()) {
      const row = {
        ...item,
        profile_id: profileId,
        sort_order: i + 1,
        video_url: item.video_url?.trim() || null,
        // Kept in step with the image list until 014 drops the column.
        cover_image: item.images[0]?.url ?? null,
      }
      const { error } = item.id
        ? await supabase.from('portfolio_items').update(row).eq('id', item.id)
        : await supabase.from('portfolio_items').insert(row)
      if (error) return setStatus(`Error: ${error.message}`)
    }
    onSaved?.(await load())
    setStatus('Saved')
    setTimeout(() => setStatus(null), 2000)
  }

  const remove = (i: number) => {
    setItems(items.filter((_, j) => j !== i))
    setStatus('Removed — save the portfolio to confirm.')
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const ongoing = item.end_year === null
        return (
          <ListItemCard key={item.id ?? `new-${i}`} onRemove={() => remove(i)}>
            <FieldRow>
              <TextField
                label="Title"
                value={item.project_name}
                onChange={(v) => update(i, { project_name: v })}
                hint="Name the project; the organization and years show separately."
                required
              />
              <TextField label="Your role" value={item.role} onChange={(v) => update(i, { role: v })} required />
            </FieldRow>
            <OrgPicker
              label="Organization / client"
              value={item.organization ?? ''}
              orgId={item.organization_id}
              onChange={(organization, organization_id) =>
                update(i, { organization: organization || null, organization_id })
              }
            />
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <label className="block text-sm">
                <span className="font-medium">Start year</span>
                <input
                  type="number"
                  min={1950}
                  max={2035}
                  value={item.start_year ?? ''}
                  onChange={(e) => update(i, { start_year: e.target.value ? +e.target.value : null })}
                  className={yearCls}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">End year</span>
                <input
                  type="number"
                  min={1950}
                  max={2035}
                  disabled={ongoing}
                  value={item.end_year ?? ''}
                  onChange={(e) => update(i, { end_year: e.target.value ? +e.target.value : (item.start_year ?? null) })}
                  className={yearCls}
                />
              </label>
              {/* Ongoing = no end year (years only, spec §7.2). */}
              <label className="col-span-2 flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={ongoing}
                  onChange={(e) =>
                    update(i, { end_year: e.target.checked ? null : (item.start_year ?? new Date().getFullYear()) })
                  }
                  className="accent-brand-500"
                />
                Ongoing
              </label>
            </div>
            <TextArea
              label="Description"
              rows={4}
              maxLength={L.description}
              value={item.description}
              onChange={(v) => update(i, { description: v })}
            />
            <TextArea
              label="Results (optional: what changed because of your work?)"
              rows={2}
              maxLength={L.results}
              value={item.results ?? ''}
              onChange={(v) => update(i, { results: v || null })}
            />

            {/* One image list; the first is the cover (spec §7.2). */}
            <div>
              <p className="text-sm font-medium">
                Images ({item.images.length}/{L.images})
              </p>
              <p className="text-xs text-ink-faint">The first image is the cover on your card and profile.</p>
              <div className="mt-1.5 space-y-2">
                {item.images.map((img, k) => (
                  <div key={k} className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                    <span className="w-12 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                      {k === 0 ? 'Cover' : `#${k + 1}`}
                    </span>
                    <input
                      value={img.url}
                      onChange={(e) =>
                        update(i, { images: item.images.map((m, l) => (l === k ? { ...m, url: e.target.value } : m)) })
                      }
                      placeholder="Image URL"
                      className={`${inputCls} sm:w-2/5`}
                    />
                    <div className="flex flex-1 items-center gap-1.5">
                      <input
                        value={img.caption ?? ''}
                        onChange={(e) =>
                          update(i, {
                            images: item.images.map((m, l) => (l === k ? { ...m, caption: e.target.value || null } : m)),
                          })
                        }
                        placeholder="Caption (optional)"
                        className={`${inputCls} min-w-0 flex-1`}
                      />
                      {k > 0 && (
                        <button
                          type="button"
                          onClick={() => update(i, { images: [img, ...item.images.filter((_, l) => l !== k)] })}
                          title="Make this the cover"
                          aria-label="Make this the cover"
                          className="rounded-full p-1.5 text-ink-faint hover:text-brand-600"
                        >
                          <ArrowUp size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => update(i, { images: item.images.filter((_, l) => l !== k) })}
                        aria-label="Remove image"
                        className="rounded-full p-1.5 text-ink-faint hover:text-red-600"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                {item.images.length > L.images && (
                  <p className="text-xs text-amber-700">
                    Only the first {L.images} images show; remove {item.images.length - L.images} to tidy this project.
                  </p>
                )}
                {item.images.length < L.images && (
                  <button
                    type="button"
                    onClick={() => update(i, { images: [...item.images, { url: '', caption: null }] })}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    + Add image
                  </button>
                )}
              </div>
            </div>

            {/* Links, capped at 3 */}
            <div>
              <p className="text-sm font-medium">
                Links ({item.links.length}/{L.links})
              </p>
              <div className="mt-1.5 space-y-1.5">
                {item.links.map((link, k) => (
                  <div key={k} className="flex flex-col gap-1.5 sm:flex-row">
                    <input
                      value={link.label}
                      onChange={(e) =>
                        update(i, { links: item.links.map((m, l) => (l === k ? { ...m, label: e.target.value } : m)) })
                      }
                      placeholder="Label"
                      className={`${inputCls} sm:w-2/5`}
                    />
                    <div className="flex flex-1 items-center gap-1.5">
                      <input
                        value={link.url}
                        onChange={(e) =>
                          update(i, { links: item.links.map((m, l) => (l === k ? { ...m, url: e.target.value } : m)) })
                        }
                        placeholder="https://…"
                        className={`${inputCls} min-w-0 flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => update(i, { links: item.links.filter((_, l) => l !== k) })}
                        aria-label="Remove link"
                        className="rounded-full p-1.5 text-ink-faint hover:text-red-600"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                {item.links.length < L.links && (
                  <button
                    type="button"
                    onClick={() => update(i, { links: [...item.links, { label: '', url: '' }] })}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    + Add link
                  </button>
                )}
              </div>
            </div>

            <TextField
              label="Video link (optional)"
              type="url"
              value={item.video_url ?? ''}
              onChange={(v) => update(i, { video_url: v || null })}
              placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
              hint={
                item.video_url && !isPortfolioVideoUrl(item.video_url)
                  ? 'Use a YouTube or Vimeo link.'
                  : 'One YouTube or Vimeo video, shown with this project.'
              }
            />
          </ListItemCard>
        )
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            setItems([
              ...items,
              {
                profile_id: profileId,
                project_name: '',
                organization: null,
                organization_id: null,
                start_year: null,
                end_year: null,
                role: '',
                description: '',
                results: null,
                cover_image: null,
                images: [],
                links: [],
                video_url: null,
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
          type="button"
          onClick={saveAll}
          className="rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Save portfolio
        </button>
        {status && (
          <span
            className={`text-sm ${status.startsWith('Project') || status.startsWith('Error') ? 'text-red-600' : 'text-ink-soft'}`}
            role="status"
          >
            {status}
          </span>
        )}
      </div>
      {items.length >= cap && (
        <p className="text-xs text-ink-faint">
          Portfolio limit reached ({cap}).
          {cap < MEMBERSHIP_LIMITS.featured.portfolio.max &&
            ` Featured Members can show up to ${MEMBERSHIP_LIMITS.featured.portfolio.max}.`}
        </p>
      )}
    </div>
  )
}
