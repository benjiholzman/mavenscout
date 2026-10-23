import { TESTIMONIAL_RULES } from '../config'
import { normalizeOrgName, type OrgIndex } from '../organizations'
import type { Organization, Profile, ReviewFlag } from '../../types/db'

// Referee email integrity rules (docs/MavenScout-profiles-membership.md §4.6).
//
// Two outcomes:
// - blocks: the request can't be made with this address (shown in the form);
// - flags: the request is made but held for admin review before the link
//   exists (name/address mismatch, newly added organization). The volume flag
//   is the exception: the admin sees it, but it doesn't hold the link.
//
// Pure functions over data the caller loads, so the server-side version in
// the hardening pass can run the same rules.

export const HOLDING_FLAGS = new Set(['name_mismatch', 'new_organization', 'precheck'])

/** A flag that holds the link until an admin clears it. */
export function holdsLink(flag: ReviewFlag): boolean {
  return HOLDING_FLAGS.has(flag.code) || flag.code.startsWith('precheck')
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isEmailShaped(email: string): boolean {
  return /^[^\s@]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(email)
}

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf('@')
  return at > 0 ? email.slice(at + 1).toLowerCase() : null
}

function emailLocal(email: string): string {
  return email.slice(0, email.lastIndexOf('@')).toLowerCase()
}

/** Hostname of a URL or bare domain, without "www.". */
export function hostOf(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`)
    return url.hostname.toLowerCase().replace(/^www\./, '') || null
  } catch {
    return null
  }
}

/** Same domain, or one is a subdomain of the other. */
function sameOrSub(a: string, b: string): boolean {
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`)
}

/** The canonical organization whose domains include this one (or a parent of
 *  it: `hq.unicef.org` → UNICEF). The longest matching domain wins. */
export function orgForDomain(orgs: OrgIndex, domain: string | null): Organization | null {
  if (!domain) return null
  let best: { org: Organization; len: number } | null = null
  for (const org of orgs.list)
    for (const d of org.domains) {
      const dd = d.toLowerCase()
      if ((domain === dd || domain.endsWith(`.${dd}`)) && (!best || dd.length > best.len)) best = { org, len: dd.length }
    }
  return best?.org ?? null
}

/** Domains the consultant controls (§4.6 rule 2): their personal website,
 *  custom domain and own email domain — except a canonical organization's
 *  domain, which is a shared employer (colleagues there are fine). Their own
 *  company's domain is covered when it's their website or email domain. */
export function controlledDomains(
  consultant: Pick<Profile, 'website_url' | 'custom_domain' | 'email'>,
  orgs: OrgIndex,
): string[] {
  const candidates = [
    hostOf(consultant.website_url),
    hostOf(consultant.custom_domain),
    consultant.email ? emailDomain(normalizeEmail(consultant.email)) : null,
  ]
  return [...new Set(candidates.filter((d): d is string => !!d && !orgForDomain(orgs, d)))]
}

const HONORIFICS = new Set(['dr', 'prof', 'professor', 'mr', 'mrs', 'ms', 'mx', 'sir', 'dame', 'eng', 'h', 'e'])

function nameTokens(name: string): string[] {
  return normalizeOrgName(name)
    .split(' ')
    .filter((t) => t && !HONORIFICS.has(t))
}

/** The address plausibly belongs to the named person (§4.6 rule 3): a name
 *  token of 3+ letters inside the local part (`a.bello`, `abello`,
 *  `amina.b`), or a short token as a whole part (`ng.w`). */
export function nameMatchesEmail(name: string, email: string): boolean {
  const parts = emailLocal(email)
    .split('+')[0]
    .replace(/[0-9]/g, '')
    .split(/[._-]+/)
    .filter(Boolean)
  const compact = parts.join('')
  return nameTokens(name).some((t) => (t.length >= 3 && compact.includes(t)) || parts.includes(t))
}

export function isGenericMailbox(email: string): boolean {
  const local = emailLocal(email).split('+')[0]
  return (TESTIMONIAL_RULES.genericMailboxes as readonly string[]).includes(local)
}

/** Added by an admin recently, rather than part of the seeded list: created
 *  within the window AND more than a day after the list's first entries
 *  (the seed batch all share one created_at day). */
export function isRecentlyAddedOrg(org: Organization, orgs: OrgIndex, now = new Date()): boolean {
  const created = Date.parse(org.created_at)
  const seeded = Math.min(...orgs.list.map((o) => Date.parse(o.created_at)))
  const day = 86_400_000
  return created > seeded + day && now.getTime() - created < TESTIMONIAL_RULES.newOrgDays * day
}

export interface RefereeEmailContext {
  consultant: Pick<Profile, 'name' | 'email' | 'website_url' | 'custom_domain'>
  orgs: OrgIndex
  refereeName: string
  /** This address's testimonials (any consultant) in the volume window,
   *  not counting the one being requested. */
  recentCount: number
  now?: Date
}

export interface RefereeEmailCheck {
  email: string
  domain: string | null
  /** The canonical organization of the email domain. */
  org: Organization | null
  blocks: string[]
  flags: ReviewFlag[]
}

/** Runs every §4.6 rule that the request form can check. */
export function checkRefereeEmail(raw: string, ctx: RefereeEmailContext): RefereeEmailCheck {
  const email = normalizeEmail(raw)
  const domain = emailDomain(email)
  const blocks: string[] = []
  const flags: ReviewFlag[] = []
  if (!isEmailShaped(email) || !domain)
    return { email, domain, org: null, blocks: ['Enter a full email address.'], flags }

  const org = orgForDomain(ctx.orgs, domain)
  if (ctx.consultant.email && normalizeEmail(ctx.consultant.email) === email)
    blocks.push("That's your own email address. Ask the person you worked with for theirs.")
  if (isGenericMailbox(email))
    blocks.push(`${email.split('@')[0]}@ is a shared mailbox. Use the referee's personal work address.`)
  if (ctx.consultant.email || ctx.consultant.website_url || ctx.consultant.custom_domain) {
    const controlled = controlledDomains(ctx.consultant, ctx.orgs).find((d) => sameOrSub(domain, d))
    if (controlled) blocks.push(`${domain} is a domain you control, so it can't confirm a referee.`)
  }
  if (!org)
    blocks.push(
      `${domain} isn't on our list of recognised organizations. Referees need an institutional email (a personal address like Gmail can't be used).`,
    )

  if (org && isRecentlyAddedOrg(org, ctx.orgs, ctx.now))
    flags.push({ code: 'new_organization', message: `${org.name} was added to the organizations list recently.` })
  if (ctx.refereeName.trim() && !nameMatchesEmail(ctx.refereeName, email))
    flags.push({
      code: 'name_mismatch',
      message: `The address ${email} doesn't obviously belong to ${ctx.refereeName.trim()}.`,
    })
  if (ctx.recentCount >= TESTIMONIAL_RULES.volumeFlag.max)
    flags.push({
      code: 'volume',
      message: `This referee has given ${ctx.recentCount} testimonials in the last ${Math.round(TESTIMONIAL_RULES.volumeFlag.windowDays / 30)} months.`,
    })
  return { email, domain, org, blocks, flags }
}
