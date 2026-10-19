// Editor-side validation (PRD 7.3/7.13/7.14): tag caps, per-platform social
// URL validation (lenient about www/country subdomains/paths), handle slugs.

import type { TagSelection } from '../types/db'

export const HEADLINE_MAX = 120
export const ELIGIBILITY_MAX = 300
export const PRIMARY_CAP = 2
export const SECONDARY_CAP = 4
export const WORK_HISTORY_CAP = 10
export const EDUCATION_CAP = 5
export const ADDITIONAL_CAP = 5
export const PORTFOLIO_LINK_CAP = 3

export function portfolioCap(isPremium: boolean): number {
  return isPremium ? 10 : 3
}
export function socialLinkCap(isPremium: boolean): number {
  return isPremium ? 5 : 2
}
export function audioTestimonialCap(isPremium: boolean): number {
  return isPremium ? 10 : 1
}

/** Can this tag still be added under the 2-primary/4-secondary caps? */
export function tagCapReached(tags: TagSelection[], tier: 'primary' | 'secondary'): boolean {
  const cap = tier === 'primary' ? PRIMARY_CAP : SECONDARY_CAP
  return tags.filter((t) => t.tier === tier).length >= cap
}

/** Save-time check for the caps — catches over-cap data loaded from older
 *  rows, which the picker's add/toggle guards can't prevent. */
export function tagCapError(tags: TagSelection[], label: string): string | null {
  const primary = tags.filter((t) => t.tier === 'primary').length
  const secondary = tags.filter((t) => t.tier === 'secondary').length
  if (primary > PRIMARY_CAP) return `${label}: pick at most ${PRIMARY_CAP} primary (you have ${primary}).`
  if (secondary > SECONDARY_CAP)
    return `${label}: pick at most ${SECONDARY_CAP} secondary (you have ${secondary}).`
  return null
}

// ---- social link validation (PRD 7.13) -------------------------------------

const PLATFORM_HOSTS: Record<string, string[]> = {
  'X/Twitter': ['x.com', 'twitter.com'],
  LinkedIn: ['linkedin.com'],
  ResearchGate: ['researchgate.net'],
  'Google Scholar': ['scholar.google.com', 'scholar.google.co.uk', 'scholar.google.de'],
  GitHub: ['github.com'],
  ORCID: ['orcid.org'],
  YouTube: ['youtube.com', 'youtu.be'],
  Instagram: ['instagram.com'],
  Facebook: ['facebook.com', 'fb.com'],
  // 'Medium/Blog' and 'Other' accept any well-formed URL — blogs live anywhere.
}

export function validateSocialUrl(platform: string, raw: string): { ok: boolean; message?: string } {
  let url: URL
  try {
    url = new URL(raw)
    if (!/^https?:$/.test(url.protocol)) throw new Error()
  } catch {
    return { ok: false, message: 'Enter a full URL, e.g. https://…' }
  }
  const hosts = PLATFORM_HOSTS[platform]
  if (!hosts) return { ok: true }
  const hostname = url.hostname.toLowerCase()
  // Lenient: exact host, www./country/regional subdomains all pass.
  const ok = hosts.some(
    (h) => hostname === h || hostname.endsWith(`.${h}`) ||
      // Google Scholar's many ccTLDs: scholar.google.<anything>
      (platform === 'Google Scholar' && hostname.startsWith('scholar.google.')),
  )
  return ok
    ? { ok: true }
    : { ok: false, message: `A ${platform} link should be on ${hosts[0]}` }
}

// ---- handle generation ------------------------------------------------------

export function slugifyHandle(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // strip accents
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'consultant'
  )
}
