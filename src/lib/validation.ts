// Editor-side validation (PRD 7.3/7.13): caps, per-platform social URL
// validation (lenient about www/country subdomains/paths), handle slugs.
// Profile minimums and maximums live in lib/completeness.

import { PORTFOLIO_FIELD_LIMITS, PROFILE_LIMITS } from './config'
import { isFeatured, membershipLimits } from './membership'
import type { Profile } from '../types/db'

export const HEADLINE_MAX = 120
export const ELIGIBILITY_MAX = 300
export const WORK_HISTORY_CAP = PROFILE_LIMITS.workHistory.max
export const EDUCATION_CAP = PROFILE_LIMITS.education.max
export const ADDITIONAL_CAP = 5
export const PORTFOLIO_LINK_CAP = PORTFOLIO_FIELD_LIMITS.links

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
