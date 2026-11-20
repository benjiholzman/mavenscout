import { loadIndexArtifact } from './search/artifact'
import { findOrgNames, orgTerms } from './search/org-check'
import { createSupabaseReader, type SupabaseConfig, type SupabaseReader } from './data/supabase'

export interface CheckDeps {
  readFile(path: string): Promise<string>
  createReader(cfg: SupabaseConfig): SupabaseReader
  out(line: string): void
  err(line: string): void
}

export const realDeps = (readFile: CheckDeps['readFile']): CheckDeps => ({
  readFile,
  createReader: createSupabaseReader,
  out: (l) => console.log(l),
  err: (l) => console.error(l),
})

const USAGE = 'usage: npm run check-artifact -- <artifact.json> [--orgs <orgs.json>]\n'
  + 'Terms come from SUPABASE_URL and SUPABASE_ANON_KEY when both are set, otherwise from --orgs.\n'
  + 'The --orgs file is a JSON object { "names": string[], "aliases": string[] }.'

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

// Returns the exit code: 0 no hits, 1 hits, 2 usage or load error.
export async function main(argv: string[], env: Record<string, string | undefined>, deps: CheckDeps): Promise<number> {
  let path: string | undefined
  let orgsPath: string | undefined
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--orgs') orgsPath = argv[++i]
    else if (!argv[i].startsWith('--') && path === undefined) path = argv[i]
  }
  const url = env.SUPABASE_URL
  const anonKey = env.SUPABASE_ANON_KEY
  const useReader = Boolean(url && anonKey)
  if (!path || (!useReader && !orgsPath)) {
    deps.err(USAGE)
    return 2
  }
  try {
    const artifact = loadIndexArtifact(await deps.readFile(path))
    let names: string[]
    let aliases: string[]
    if (useReader) {
      const lists = await deps.createReader({ url: url as string, anonKey: anonKey as string }).getReferenceLists()
      ;({ names, aliases } = lists.organizationTerms)
    } else {
      const o = JSON.parse(await deps.readFile(orgsPath as string)) as { names?: unknown; aliases?: unknown }
      if (!isStrings(o?.names) || !isStrings(o?.aliases)) throw new Error('invalid_orgs: expected { names: string[], aliases: string[] }')
      ;({ names, aliases } = o as { names: string[]; aliases: string[] })
    }
    const terms = orgTerms(names, aliases)
    const hits = findOrgNames(artifact, terms)
    deps.out(`fragments ${artifact.fragments.length}`)
    deps.out(`terms ${terms.length}`)
    for (const h of hits) deps.out(`${h.fragmentId} ${h.profileId} ${h.type} ${h.term}`)
    return hits.length > 0 ? 1 : 0
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    deps.err(`error: ${anonKey ? msg.split(anonKey).join('[redacted]') : msg}`)
    return 2
  }
}
