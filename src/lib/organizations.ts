import { logoLinkUrl } from './brandfetch'
import { supabase } from './supabase'
import type { Organization, OrgType, PortfolioItem, Profile } from '../types/db'

// Canonical organizations list (docs/MavenScout-profiles-membership.md §8).
//
// Employers and clients are free text unless picked from the list. Existing
// entries are linked at READ time: resolveOrganization() maps a typed name to
// an organization by name or alias, so stored rows never need rewriting (009 is
// additive). Picking an organization in the editor stores its id as well.

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  multilateral: 'Multilateral',
  bilateral_donor: 'Bilateral donor',
  un_agency: 'UN agency',
  ngo: 'NGO',
  government: 'Government',
  private_firm: 'Private firm',
  academic: 'Academic & research',
  foundation: 'Foundation',
}

/** Lowercase, accent-free, '&' → 'and', punctuation → single spaces. */
export function normalizeOrgName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Work-history "employers" that aren't an organization. They never resolve
 *  and are left out of Sector Experience. */
const PSEUDO_EMPLOYERS = new Set([
  'independent',
  'independent consultant',
  'independent researcher',
  'freelance',
  'freelancer',
  'freelance consultant',
  'self employed',
  'consultant',
])

export function isPseudoEmployer(name: string): boolean {
  return PSEUDO_EMPLOYERS.has(normalizeOrgName(name))
}

export interface OrgIndex {
  list: Organization[]
  byId: Map<string, Organization>
  /** Normalized name or alias → organization. */
  byKey: Map<string, Organization>
  /** Keys usable as a prefix ("UNICEF" in "UNICEF Ethiopia"), longest first. */
  prefixKeys: string[]
}

export const EMPTY_ORG_INDEX: OrgIndex = { list: [], byId: new Map(), byKey: new Map(), prefixKeys: [] }

/** Shortest key allowed to match as a prefix, so "UN" never swallows "UN Women
 *  Senegal" and two-letter aliases ("WB", "EU") only match exactly. */
const MIN_PREFIX_KEY = 3

export function buildOrgIndex(orgs: Organization[]): OrgIndex {
  const byKey = new Map<string, Organization>()
  for (const org of orgs)
    for (const key of [org.name, ...org.aliases].map(normalizeOrgName))
      if (key && !byKey.has(key)) byKey.set(key, org)
  const prefixKeys = [...byKey.keys()].filter((k) => k.length >= MIN_PREFIX_KEY).sort((a, b) => b.length - a.length)
  return { list: orgs, byId: new Map(orgs.map((o) => [o.id, o])), byKey, prefixKeys }
}

/**
 * The organization a typed name refers to, or null for free text. In order:
 *  1. a stored id (picked in the editor);
 *  2. the exact name or an alias ("IBRD", "Asia Foundation");
 *  3. the same without parentheticals ("IFC (International Finance Corporation)");
 *  4. a parenthetical that is itself a name or alias ("Australian Government (DFAT)");
 *  5. the longest name or alias followed by more words: a country office or
 *     unit ("UNICEF Ethiopia", "European Commission, DG CONNECT").
 */
export function resolveOrganization(
  index: OrgIndex,
  name: string | null | undefined,
  id?: string | null,
): Organization | null {
  if (id && index.byId.has(id)) return index.byId.get(id)!
  if (!name || isPseudoEmployer(name)) return null
  const exact = index.byKey.get(normalizeOrgName(name))
  if (exact) return exact
  const stripped = normalizeOrgName(name.replace(/\([^)]*\)/g, ' '))
  const plain = index.byKey.get(stripped)
  if (plain) return plain
  for (const m of name.matchAll(/\(([^)]*)\)/g)) {
    const inner = index.byKey.get(normalizeOrgName(m[1]))
    if (inner) return inner
  }
  const key = index.prefixKeys.find((k) => stripped.startsWith(`${k} `))
  return key ? index.byKey.get(key)! : null
}

// The list is ~200 rows: loaded whole, once per page load, and shared. A failed
// load (e.g. 009 not applied yet) degrades to an empty index: employers stay
// free text with monograms, and Org History falls back to name matching.
let cache: Promise<OrgIndex> | null = null

export function loadOrgIndex(): Promise<OrgIndex> {
  cache ??= (async () => {
    const { data, error } = await supabase.from('organizations').select('*').order('name')
    if (error) {
      console.warn(`organizations not loaded (${error.message}); employers stay free text`)
      cache = null // retry on the next call
      return EMPTY_ORG_INDEX
    }
    return buildOrgIndex(data as Organization[])
  })()
  return cache
}

/** Call after an admin edits the list, so the next load sees the change. */
export function invalidateOrgIndex() {
  cache = null
}

/** Picker suggestions: names starting with the query first, then aliases
 *  starting with it, then any word starting with it, then anywhere. */
export function searchOrganizations(index: OrgIndex, query: string, limit = 8): Organization[] {
  const q = normalizeOrgName(query)
  if (!q) return []
  const scored: { org: Organization; rank: number }[] = []
  for (const org of index.list) {
    const keys = [org.name, ...org.aliases].map(normalizeOrgName)
    const rank = keys[0]!.startsWith(q)
      ? 0
      : keys.some((k) => k.startsWith(q))
        ? 1
        : keys.some((k) => k.includes(` ${q}`))
          ? 2
          : keys.some((k) => k.includes(q))
            ? 3
            : -1
    if (rank >= 0) scored.push({ org, rank })
  }
  return scored
    .sort((a, b) => a.rank - b.rank || a.org.name.length - b.org.name.length || a.org.name.localeCompare(b.org.name))
    .slice(0, limit)
    .map((s) => s.org)
}

/**
 * ⚑ LOGO HOOK — the one place an organization's logo is chosen.
 * Today: an explicit `logo_url` (admin-set; '' means "show initials", for
 * organizations whose domain Brandfetch maps to the wrong brand), else the
 * Brandfetch Logo Link for the primary domain (resolveLogoUrl adds the client
 * id at render; without VITE_BRANDFETCH_CLIENT_ID, or when Brandfetch has no
 * logo for the domain, the monogram shows). Spec §8 stores logos in
 * Supabase Storage: the hardening pass can copy each Brandfetch logo into
 * Storage once and write that URL into `logo_url`, with no change here.
 */
export function orgLogoUrl(org: Organization | null | undefined): string | null {
  if (!org || org.logo_url === '') return null // '' = initials, not a wrong Brandfetch logo
  return org.logo_url ?? (org.domains[0] ? logoLinkUrl(org.domains[0]) : null)
}

/** Logo for a work-history entry or portfolio client: the organization's
 *  logo when it resolves, else the entry's own pasted URL (if any). */
export function entryLogoUrl(
  index: OrgIndex,
  name: string | null | undefined,
  id?: string | null,
  ownUrl?: string | null,
): string | null {
  return orgLogoUrl(resolveOrganization(index, name, id)) ?? ownUrl ?? null
}

/** Short form for a monogram: the shortest all-caps alias of 2–6 characters
 *  (IRC, UNICEF), or the name itself when it already is one (BRAC). */
export function orgAcronym(org: Organization | null | undefined): string | null {
  if (!org) return null
  const isAcronym = (s: string) => /^[A-Z][A-Z0-9-]{1,6}$/.test(s) && s.replace(/-/g, '').length <= 6
  const candidates = [org.name, ...org.aliases].filter(isAcronym).sort((a, b) => a.length - b.length)
  return candidates[0]?.replace(/-/g, '') ?? null
}

export interface SectorOrg {
  key: string
  name: string
  logoUrl: string | null
  acronym: string | null
}

/**
 * Sector Experience (card front; PRD 7.1, profiles-membership §7.2): the most
 * recent distinct organizations a candidate worked for or with, employers from
 * work history and clients from portfolio items, current ones first, then by
 * most recent year. Deduped by organization, so "UNICEF Ethiopia" and "UNICEF
 * Bangladesh" count once; free text dedupes by its normalized name, ignoring
 * an added place or unit.
 * Pseudo-employers ("Independent consultant") are left out.
 */
export function sectorExperience(
  profile: Pick<Profile, 'work_history'>,
  portfolio: Pick<PortfolioItem, 'organization' | 'organization_id' | 'start_year' | 'end_year'>[],
  index: OrgIndex,
  n: number,
): SectorOrg[] {
  const current = Number.MAX_SAFE_INTEGER
  const entries = [
    ...profile.work_history.map((w, i) => ({
      name: w.organization, id: w.organization_id, ownLogo: w.logo_url,
      end: w.end_year ?? current, start: w.start_year, order: i,
    })),
    ...portfolio.map((p, i) => ({
      name: p.organization ?? '', id: p.organization_id, ownLogo: null,
      // Undated items sort after dated ones.
      end: p.start_year == null ? 0 : (p.end_year ?? current), start: p.start_year ?? 0,
      order: 1000 + i,
    })),
  ].filter((e) => e.name.trim() && !isPseudoEmployer(e.name))
  entries.sort((a, b) => b.end - a.end || b.start - a.start || a.order - b.order)

  const seenOrgs = new Set<string>()
  const seenText: string[] = []
  const out: SectorOrg[] = []
  for (const e of entries) {
    const org = resolveOrganization(index, e.name, e.id)
    if (org) {
      if (seenOrgs.has(org.id)) continue
      seenOrgs.add(org.id)
    } else {
      // Free text: a variant that only adds a place or unit is the same body
      // ("Agence de l'Informatique de l'État" / "…, Senegal").
      const key = normalizeOrgName(e.name.replace(/\([^)]*\)/g, ' '))
      if (seenText.some((k) => k === key || key.startsWith(`${k} `) || k.startsWith(`${key} `))) continue
      seenText.push(key)
    }
    out.push({
      key: org ? `org:${org.id}` : `text:${normalizeOrgName(e.name)}`,
      name: org?.name ?? e.name,
      logoUrl: orgLogoUrl(org) ?? e.ownLogo ?? null,
      acronym: orgAcronym(org),
    })
    if (out.length === n) break
  }
  return out
}
