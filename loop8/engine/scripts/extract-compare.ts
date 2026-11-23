// Extraction comparison (loop8/docs/planning/extract-format-fix-plan.md). Run from loop8/engine:
//
//   npm run extract-compare -- --models=us.amazon.nova-pro-v1:0,us.amazon.nova-2-lite-v1:0
//       prints the planned live calls only: no database read and no model call
//   npm run extract-compare -- --models=<ids> --confirm-live --max-calls=<planned>
//       runs the real extraction code with the real text model, paid by the customer
//
// For each sample ToR (docs/samples) and each model it builds the context from the customer database (read only),
// runs extractFromJd, and scores the result against the expected terms of docs/samples/expectations.json. The keyword
// extractor is scored too, which needs no call. The AWS credentials come from the environment and must be able to
// invoke the models. It prints counts, scores, tokens and times, never the text of a job description, a model reply
// or the credentials. The table is also written to loop8/internal/extract-compare-<timestamp>.md.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { deriveOptions } from '../../../src/lib/filters'
import { isListed } from '../../../src/lib/listing'
import { placeholderExtract } from '../../../src/lib/matching/extract'
import type { ExtractedRequirements, ExtractionContext } from '../../../src/lib/matching/types'
import type { Profile } from '../../../src/types/db'
import { createExtractCompleter, EXTRACT_CALL_TIMEOUT_MS } from '../src/extract/complete'
import { extractFromJd, type ExtractionStats } from '../src/extract/extract'
import { EXTRACTION_PROMPT_VERSION } from '../src/extract/prompt'
import {
  checkLiveApproval,
  livePlanText,
  parseExtractCompareArgs,
  plannedCalls,
  scoreExtraction,
  type ExpectedTerms,
} from '../src/eval/extract-compare'
import { createBedrockTextModel } from '../src/models/text-model'

const ROOT = resolve(process.cwd(), '..', '..')
const SAMPLES = join(ROOT, 'docs', 'samples')
const INTERNAL = join(ROOT, 'loop8', 'internal')

interface TorSpec {
  id: string
  title: string
  file: string
  expected_extraction: ExpectedTerms
}

/** Values by name from the repo root .env; never printed. */
function readEnvFile(): Record<string, string> {
  const env: Record<string, string> = {}
  const file = join(ROOT, '.env')
  if (!existsSync(file)) return env
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return env
}

async function rows<T>(base: string, key: string, table: string, query: string): Promise<T[]> {
  const res = await fetch(`${base}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  })
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`)
  return (await res.json()) as T[]
}

/** The context the app builds: the expertise list, the locations and the languages of the listed profiles. */
async function loadContext(): Promise<ExtractionContext> {
  const fileEnv = readEnvFile()
  const url = process.env.SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || ''
  const key = process.env.SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY || ''
  if (!url || !key) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the root .env')
  const base = url.replace(/\/+$/, '')
  const [categories, items, profiles] = await Promise.all([
    rows<any>(base, key, 'taxonomy_categories', 'select=*&order=sort_order'),
    rows<any>(base, key, 'taxonomy_items', 'select=*&order=sort_order'),
    rows<Profile>(base, key, 'profiles', 'select=*&approval_status=eq.approved&subscription_status=eq.active'),
  ])
  const options = deriveOptions(profiles.filter(isListed))
  return {
    taxonomy: { categories, items },
    locationOptions: options.locations.flatMap((g) => [g.label, ...g.items]),
    languageOptions: options.languages,
  }
}

interface Row {
  label: string
  hit: number
  total: number
  unexpected: number
  degraded: number
  calls: number
  inputTokens: number
  outputTokens: number
  ms: number
  hintRemoved: number
  dropped: number
  returned: number
  perTor: string[]
}

const newRow = (label: string): Row => ({
  label, hit: 0, total: 0, unexpected: 0, degraded: 0, calls: 0, inputTokens: 0, outputTokens: 0, ms: 0,
  hintRemoved: 0, dropped: 0, returned: 0, perTor: [],
})

async function main(): Promise<void> {
  const args = parseExtractCompareArgs(process.argv.slice(2))
  const { tors: all } = JSON.parse(readFileSync(join(SAMPLES, 'expectations.json'), 'utf8')) as { tors: TorSpec[] }
  const tors = args.torIds ? all.filter((t) => args.torIds?.includes(t.id)) : all
  if (tors.length === 0) throw new Error('No sample ToR matches --tors')
  if (!args.confirmLive) {
    console.log(livePlanText(args, tors.length))
    return
  }
  checkLiveApproval(args, tors.length)

  const ctx = await loadContext()
  console.log(`Context: ${ctx.taxonomy.items.length} expertise items, ${ctx.locationOptions.length} locations, ${ctx.languageOptions.length} languages. Prompt ${EXTRACTION_PROMPT_VERSION}. ${plannedCalls(args, tors.length)} live calls.`)
  const textModel = createBedrockTextModel({ requestTimeoutMs: EXTRACT_CALL_TIMEOUT_MS })

  const keyword = newRow('keyword extractor (no call)')
  const modelRows = new Map(args.models.map((m) => [m, newRow(m)]))
  for (const tor of tors) {
    const jd = readFileSync(join(SAMPLES, tor.file), 'utf8')
    const floor = await placeholderExtract(jd, ctx)
    const fs = scoreExtraction(floor, tor.expected_extraction)
    keyword.hit += fs.hit
    keyword.total += fs.total
    keyword.unexpected += fs.unexpected.length
    keyword.perTor.push(`${tor.id} ${fs.hit}/${fs.total}`)
    for (const model of args.models) {
      const row = modelRows.get(model) as Row
      const completer = createExtractCompleter({ textModel, modelId: model, deadlineAt: Date.now() + 40000 })
      let degraded = false
      let stats: ExtractionStats | null = null
      const started = Date.now()
      const got: ExtractedRequirements = await extractFromJd(jd, ctx, {
        complete: completer.complete,
        onFallback: () => { degraded = true },
        onStats: (s) => { stats = s },
      })
      row.ms += Date.now() - started
      const sc = scoreExtraction(got, tor.expected_extraction)
      const u = completer.usage()
      row.hit += sc.hit
      row.total += sc.total
      row.unexpected += sc.unexpected.length
      row.degraded += degraded ? 1 : 0
      row.calls += u.calls
      row.inputTokens += u.inputTokens
      row.outputTokens += u.outputTokens
      const st = stats as ExtractionStats | null
      if (st) {
        row.returned += st.expertise.returned
        row.hintRemoved += st.expertise.hintRemoved
        row.dropped += st.expertise.dropped
      }
      row.perTor.push(`${tor.id} ${sc.hit}/${sc.total}`)
      console.log(`${tor.id} | ${model} | ${sc.hit}/${sc.total} | unexpected: ${sc.unexpected.join('; ') || 'none'} | missed: ${sc.missed.join('; ') || 'none'} | degraded ${degraded} | tokens ${u.inputTokens}/${u.outputTokens}`)
    }
  }

  const lines: string[] = [
    `# Extraction comparison, prompt ${EXTRACTION_PROMPT_VERSION}, ${new Date().toISOString()}`,
    '',
    '| Extractor | Recall | Unexpected suggestions | Degraded | Model calls | Input tokens | Output tokens | Model names returned | Hint removed | Dropped | Mean ms |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    `| ${keyword.label} | ${keyword.hit}/${keyword.total} | ${keyword.unexpected} | | | | | | | | |`,
  ]
  for (const r of modelRows.values()) {
    lines.push(`| ${r.label} | ${r.hit}/${r.total} | ${r.unexpected} | ${r.degraded} | ${r.calls} | ${r.inputTokens} | ${r.outputTokens} | ${r.returned} | ${r.hintRemoved} | ${r.dropped} | ${Math.round(r.ms / tors.length)} |`)
  }
  lines.push('', 'Per ToR:', '', `1. keyword: ${keyword.perTor.join(', ')}`)
  let i = 2
  for (const r of modelRows.values()) lines.push(`${i++}. ${r.label}: ${r.perTor.join(', ')}`)
  lines.push('', 'The cost per call is computed from the tokens and the AWS price list, not here.')
  const out = lines.join('\n')
  console.log(`\n${out}`)
  mkdirSync(INTERNAL, { recursive: true })
  const file = join(INTERNAL, `extract-compare-${new Date().toISOString().replace(/[:.]/g, '-')}.md`)
  writeFileSync(file, out + '\n')
  console.log(`\nWritten to ${file.replace(ROOT, '.')}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
