import { PORTFOLIO_FIELD_LIMITS } from './config'
import type { PortfolioItem } from '../types/db'

// Portfolio items (docs/MavenScout-profiles-membership.md §7.2): title, years
// (start + end, or Ongoing = end_year null), role, organization, description,
// optional results, up to 3 captioned images (the first is the cover), up to
// 3 labelled links and one YouTube/Vimeo video link.

type ItemImages = Pick<PortfolioItem, 'images'>

/** The images shown: the first 3, cover first. */
export function portfolioImages(item: ItemImages): { url: string; caption?: string | null }[] {
  return item.images.filter((i) => i.url.trim() !== '').slice(0, PORTFOLIO_FIELD_LIMITS.images)
}

export function portfolioCover(item: ItemImages): string | null {
  return portfolioImages(item)[0]?.url ?? null
}

const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com']

/** A portfolio video link must be on YouTube or Vimeo. */
export function isPortfolioVideoUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    if (!/^https?:$/.test(url.protocol)) return false
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    return VIDEO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
  } catch {
    return false
  }
}

type ItemDraft = Omit<PortfolioItem, 'id' | 'profile_id' | 'sort_order'>

/**
 * Field problems that stop an item from saving. `before` is the item as it
 * was loaded (absent for a new item): an existing item already over a limit
 * (seeded data) may still be edited as long as that count doesn't grow.
 */
export function portfolioItemErrors(item: ItemDraft, before?: ItemDraft): string[] {
  const L = PORTFOLIO_FIELD_LIMITS
  const errors: string[] = []
  if (!item.project_name.trim()) errors.push('add a title')
  if (!item.start_year) errors.push('add a start year')
  else if (item.end_year !== null && item.end_year < item.start_year) errors.push('the end year is before the start year')
  if (!item.role.trim()) errors.push('add your role')
  if (!item.organization?.trim()) errors.push('add the organization or client')
  if (!item.description.trim()) errors.push('add a description')
  if (item.description.length > L.description && item.description.length > (before?.description.length ?? 0))
    errors.push(`shorten the description to ${L.description} characters`)
  const results = item.results ?? ''
  if (results.length > L.results && results.length > (before?.results ?? '').length)
    errors.push(`shorten the results to ${L.results} characters`)
  if (item.images.some((i) => !i.url.trim())) errors.push('fill in or remove the empty image')
  if (item.images.length > L.images && item.images.length > (before?.images.length ?? 0))
    errors.push(`keep at most ${L.images} images`)
  if (item.links.some((l) => !l.label.trim() || !l.url.trim())) errors.push('give every link a label and a URL')
  if (item.links.length > L.links) errors.push(`keep at most ${L.links} links`)
  if (item.video_url && !isPortfolioVideoUrl(item.video_url)) errors.push('use a YouTube or Vimeo link for the video')
  return errors
}
