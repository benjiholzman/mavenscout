// Editor-side validation (PRD 7.3/7.13/7.14): expertise tier caps,
// per-platform social URL validation (lenient about www/country
// subdomains/paths), handle slugs.

import { EXPERTISE_TIER_LIMITS } from './config'
import { TIER_LABELS, TIERS } from './expertise'
import { isFeatured, membershipLimits } from './membership'
import type { ExpertiseTag, Profile } from '../types/db'

export const HEADLINE_MAX = 120
export const ELIGIBILITY_MAX = 300
export const WORK_HISTORY_CAP = 10
export const EDUCATION_CAP = 5
export const ADDITIONAL_CAP = 5
export const PORTFOLIO_LINK_CAP = 3

/** Caps by membership level (config MEMBERSHIP_LIMITS); Featured caps apply
 *  once Featured status is active (lib/membership). */
export function portfolioCap(p: Profile): number {
  return membershipLimits(p).portfolio.max
}
export function socialLinkCap(p: Profile): number {
  return membershipLimits(p).socialLinks
}
/** Testimonial rules move to the testimonial flow (spec §4, §13 step 3). */
export function audioTestimonialCap(p: Profile): number {
  return isFeatured(p) ? 10 : 1
}

/** Save-time check for the tier maximums (EXPERTISE_TIER_LIMITS) — catches
 *  over-cap data, which the editor's add/move guards can't prevent. The
 *  minimums are enforced with the new editor (profiles-membership §13 step 2). */
export function expertiseTierError(tags: ExpertiseTag[]): string | null {
  for (const tier of TIERS) {
    const n = tags.filter((t) => t.tier === tier).length
    const { max } = EXPERTISE_TIER_LIMITS[tier]
    if (n > max) return `${TIER_LABELS[tier]}: pick at most ${max} (you have ${n}).`
  }
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
