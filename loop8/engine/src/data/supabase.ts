import { buildExpertiseIndex } from '../../../../src/lib/expertise'
import type { ExpertiseIndex } from '../../../../src/lib/expertise'
import type { CandidateInput } from '../../../../src/lib/matching/fit'
import type { ExtractedRequirements } from '../../../../src/lib/matching/types'
import { buildOrgIndex } from '../../../../src/lib/organizations'
import type { OrgIndex } from '../../../../src/lib/organizations'
import type { Organization, PortfolioItem, Profile, TaxonomyCategory, TaxonomyItem } from '../../../../src/types/db'

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export interface SupabaseConfig { url: string; anonKey: string; fetch?: FetchLike }

export interface ReferenceLists {
  organizations: string[]
  organizationTerms: { names: string[]; aliases: string[] }
  languages: string[]
}

export interface ScoringData {
  candidates: CandidateInput[]
  expertise: ExpertiseIndex
  orgs: OrgIndex
  missing: string[]
}

export interface Extraction {
  extracted: ExtractedRequirements | null
  hiringOrganization: string | null
}

export interface SupabaseReader {
  getJobDescriptionText(id: string): Promise<string | null>
  getReferenceLists(): Promise<ReferenceLists>
  getScoringData(profileIds: string[]): Promise<ScoringData>
  getExtraction(jobDescriptionId: string): Promise<Extraction>
}

const CHUNK = 100

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Trims, drops empty and non-string values, de-duplicates case-insensitively keeping the first spelling.
function clean(values: unknown[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    if (typeof v !== 'string') continue
    const s = v.trim()
    const key = s.toLowerCase()
    if (!s || seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

export function createSupabaseReader(cfg: SupabaseConfig): SupabaseReader {
  if (!cfg.url || !cfg.anonKey) throw new Error('supabase_config_missing')
  const base = cfg.url.replace(/\/+$/, '')
  const headers = {
    apikey: cfg.anonKey,
    Authorization: `Bearer ${cfg.anonKey}`,
    Accept: 'application/json',
  }

  async function rows(table: string, query: string): Promise<Record<string, unknown>[]> {
    const doFetch = cfg.fetch ?? (globalThis.fetch as unknown as FetchLike)
    const res = await doFetch(`${base}/rest/v1/${table}?${query}`, { method: 'GET', headers })
    if (!res.ok) throw new Error(`supabase_error: ${table} ${res.status}`)
    let body: unknown
    try {
      body = await res.json()
    } catch {
      // The parse error can quote the start of the body, so it is not passed on.
      throw new Error(`supabase_error: ${table} bad_body`)
    }
    if (!Array.isArray(body)) throw new Error(`supabase_error: ${table} bad_body`)
    return body as Record<string, unknown>[]
  }

  return {
    async getJobDescriptionText(id) {
      if (!UUID.test(id)) return null
      const found = await rows('job_descriptions', `select=raw_text&id=eq.${encodeURIComponent(id)}&limit=1`)
      const text = found[0]?.raw_text
      return typeof text === 'string' && text.trim() ? text : null
    },

    async getReferenceLists() {
      const [orgs, langs] = await Promise.all([
        rows('organizations', 'select=name,aliases'),
        rows('languages', 'select=name'),
      ])
      const names = clean(orgs.map((o) => o.name))
      const aliases = clean(orgs.flatMap((o) => (Array.isArray(o.aliases) ? o.aliases : [])))
      const organizations = clean(orgs.flatMap((o) => [o.name, ...(Array.isArray(o.aliases) ? o.aliases : [])]))
      return { organizations, organizationTerms: { names, aliases }, languages: clean(langs.map((l) => l.name)) }
    },

    // Mirrors the app: useDirectoryData (profiles select, taxonomy), loadEvidence in
    // lib/matching/score.ts (portfolio items), loadOrgIndex (organizations). The directory's
    // approved and active filters are not applied: the pool already passed them.
    async getScoringData(profileIds) {
      const valid = [...new Set(profileIds.filter((id) => UUID.test(id)))]
      const chunks: string[][] = []
      for (let i = 0; i < valid.length; i += CHUNK) chunks.push(valid.slice(i, i + CHUNK))
      const [profileChunks, portfolioChunks, cats, items, orgRows] = await Promise.all([
        Promise.all(chunks.map((c) => rows('profiles', `select=*&id=in.(${c.join(',')})`))),
        Promise.all(chunks.map((c) => rows('portfolio_items', `select=*&profile_id=in.(${c.join(',')})&order=sort_order`))),
        rows('taxonomy_categories', 'select=*&order=sort_order'),
        rows('taxonomy_items', 'select=*&order=sort_order'),
        rows('organizations', 'select=*&order=name'),
      ])
      const profileBy = new Map<string, Profile>()
      for (const p of profileChunks.flat() as unknown as Profile[]) profileBy.set(p.id, p)
      const portfolioBy = new Map<string, PortfolioItem[]>()
      for (const item of portfolioChunks.flat() as unknown as PortfolioItem[])
        portfolioBy.set(item.profile_id, [...(portfolioBy.get(item.profile_id) ?? []), item])
      const candidates: CandidateInput[] = []
      const found = new Set<string>()
      for (const id of valid) {
        const profile = profileBy.get(id)
        if (!profile) continue
        found.add(id)
        candidates.push({ profile, portfolio: portfolioBy.get(id) ?? [] })
      }
      return {
        candidates,
        expertise: buildExpertiseIndex(cats as unknown as TaxonomyCategory[], items as unknown as TaxonomyItem[]),
        orgs: buildOrgIndex(orgRows as unknown as Organization[]),
        missing: profileIds.filter((id) => !found.has(id)),
      }
    },

    async getExtraction(jobDescriptionId) {
      const none = { extracted: null, hiringOrganization: null }
      if (!UUID.test(jobDescriptionId)) return none
      const found = await rows(
        'job_descriptions',
        `select=extracted,hiring_organization&id=eq.${encodeURIComponent(jobDescriptionId)}&limit=1`,
      )
      const row = found[0]
      if (!row) return none
      const ex = row.extracted
      const org = row.hiring_organization
      return {
        extracted: ex && typeof ex === 'object' && !Array.isArray(ex) ? (ex as unknown as ExtractedRequirements) : null,
        hiringOrganization: typeof org === 'string' && org.trim() ? org : null,
      }
    },
  }
}
