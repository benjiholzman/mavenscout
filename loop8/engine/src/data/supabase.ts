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

export interface SupabaseReader {
  getJobDescriptionText(id: string): Promise<string | null>
  getReferenceLists(): Promise<ReferenceLists>
}

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
  }
}
