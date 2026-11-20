// Manual against AI comparison (src/eval/compare.ts). Run from loop8/engine:
//
//   npm run compare                                    fake models (default), no model call
//   npm run compare -- --models=live                   prints the planned live calls only, no read or call
//   npm run compare -- --models=live --confirm-live    Titan and Bedrock, customer paid
//
// Reads the demo seed profiles, the sample ToRs and the hard-case fixtures from
// disk, and the taxonomy and organizations through the Supabase reader (read
// only), with the values named VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in
// the repo root .env (or SUPABASE_URL and SUPABASE_ANON_KEY in the environment).
// Prints a markdown table and writes it to loop8/internal/compare-<timestamp>.md.
// Handles, ranks and scores only: no profile, JD or secret text is printed.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadSettings } from '../src/core/settings'
import { createSupabaseReader } from '../src/data/supabase'
import { parseCompareArgs, printLivePlan, runCompare, safeError } from '../src/eval/compare'
import type { LiveDeps, RawDemoProfile, TorSpec } from '../src/eval/compare'
import { loadHardCases } from '../src/eval/hard-cases'

const ROOT = resolve(process.cwd(), '..', '..')
const SAMPLES = join(ROOT, 'docs', 'samples')
const PROFILES_DIR = join(ROOT, 'scripts', 'demo-seed', 'profiles')
const INTERNAL = join(ROOT, 'loop8', 'internal')

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

async function loadDemoProfiles(): Promise<RawDemoProfile[]> {
  const files = readdirSync(PROFILES_DIR).filter((f) => f.endsWith('.mjs')).sort()
  const all: RawDemoProfile[] = []
  for (const f of files) {
    const mod = (await import(pathToFileURL(join(PROFILES_DIR, f)).href)) as { default: RawDemoProfile[] }
    all.push(...mod.default)
  }
  return all
}

async function main(): Promise<void> {
  const args = parseCompareArgs(process.argv.slice(2))
  const { tors } = JSON.parse(readFileSync(join(SAMPLES, 'expectations.json'), 'utf8')) as { tors: TorSpec[] }
  const settings = loadSettings(process.env)
  if (args.models === 'live' && !args.confirmLive) {
    // Counts only, from the files on disk: no Supabase read, no artifact read, no model call.
    printLivePlan({ tors, demoProfiles: await loadDemoProfiles(), fixtures: loadHardCases(), settings, print: (l) => console.log(l) })
    return
  }
  const fileEnv = readEnvFile()
  const url = process.env.SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || ''
  const anonKey = process.env.SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY || ''
  if (!url || !anonKey) throw new Error('missing_supabase_settings')

  const now = new Date()
  const baselineFile = join(SAMPLES, 'ranking-baseline.md')
  const live = async (): Promise<LiveDeps> => {
    // Loaded only in live mode, so a fake run builds no AWS client.
    const titan = await import('../src/bedrock/titan')
    const text = await import('../src/models/text-model')
    const artifactPath = join(INTERNAL, 'index-artifact.json')
    return {
      embed: titan.embedText,
      embedModelId: titan.MODEL_VERSION,
      embedDimensions: titan.DIMENSIONS,
      textModel: text.createBedrockTextModel(),
      readArtifact: () => (existsSync(artifactPath) ? readFileSync(artifactPath, 'utf8') : null),
    }
  }

  const { markdown } = await runCompare({
    tors,
    readJd: (file) => readFileSync(join(SAMPLES, file), 'utf8'),
    demoProfiles: await loadDemoProfiles(),
    fixtures: loadHardCases(),
    reader: createSupabaseReader({ url, anonKey }),
    models: args.models,
    confirmLive: args.confirmLive,
    live,
    settings,
    now,
    baselineMarkdown: existsSync(baselineFile) ? readFileSync(baselineFile, 'utf8') : undefined,
    print: (line) => console.log(line),
    warn: (line) => console.error(`WARN: ${line}`),
  })

  console.log(markdown)
  mkdirSync(INTERNAL, { recursive: true })
  const out = join(INTERNAL, `compare-${now.toISOString().replace(/[:.]/g, '-')}.md`)
  writeFileSync(out, markdown)
  console.log(`Wrote ${out}`)
}

main().catch((err) => {
  console.error(`FAIL: ${safeError(err)}`)
  process.exit(1)
})
