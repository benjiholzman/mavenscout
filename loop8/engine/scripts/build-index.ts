// Stage 1 index builder (issue #20, Part A). Hand-run script, like the ranking
// baseline. It loads the local demo profiles, fragments them, embeds each
// fragment with the shared Titan helper (re-embedding only changed fragments by
// text hash), and writes a loadable artifact that rankPool reads for the
// in-memory cosine search in Variant A.
//
// Run from the repo root (process.cwd paths), with the Titan profile. The bundle
// goes inside the engine dir so Node resolves @aws-sdk from loop8/engine/node_modules:
//   node_modules/.bin/esbuild loop8/engine/scripts/build-index.ts --bundle \
//     --platform=node --format=esm --packages=external \
//     --outfile=loop8/engine/.local-dist/build-index.mjs \
//     && AWS_PROFILE=mavenscout-titan node loop8/engine/.local-dist/build-index.mjs
//
// Output: loop8/internal/index-artifact.json (gitignored). No client database
// access and no OpenSearch; those are Part B.

import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DIMENSIONS, embedText, getEmbedStats, METRIC, MODEL_VERSION, resetEmbedStats } from '../src/bedrock/titan'
import { toFragments } from '../src/index/fragments'
import { fromDemoSeed, type DemoProfile } from '../src/index/source'
import type { EmbeddedFragment, Fragment, IndexArtifact } from '../src/index/types'

const ROOT = process.cwd()
const PROFILES_DIR = join(ROOT, 'scripts', 'demo-seed', 'profiles')
const OUT_DIR = join(ROOT, 'loop8', 'internal')
const OUT_FILE = join(OUT_DIR, 'index-artifact.json')
const CONCURRENCY = 8

async function loadDemoProfiles(): Promise<DemoProfile[]> {
  const files = readdirSync(PROFILES_DIR).filter((f) => f.endsWith('.mjs'))
  const all: DemoProfile[] = []
  for (const f of files) {
    const mod = (await import(pathToFileURL(join(PROFILES_DIR, f)).href)) as { default: DemoProfile[] }
    all.push(...mod.default)
  }
  return all
}

/** Prior vectors by text hash, so unchanged fragments are not re-embedded.
 *  Only vectors from the same model are reused, never mixed across models. */
function priorVectors(): Map<string, number[]> {
  const map = new Map<string, number[]>()
  if (!existsSync(OUT_FILE)) return map
  const prior = JSON.parse(readFileSync(OUT_FILE, 'utf8')) as IndexArtifact
  if (prior.modelVersion !== MODEL_VERSION) return map
  for (const f of prior.fragments) map.set(f.textHash, f.vector)
  return map
}

/** Deterministic index version from the model and the fragment set, so a run
 *  records exactly which index it used. */
function indexVersion(fragments: Fragment[]): string {
  const h = createHash('sha256').update(MODEL_VERSION)
  for (const f of [...fragments].sort((a, b) => a.fragmentId.localeCompare(b.fragmentId))) {
    h.update(f.fragmentId).update(f.textHash)
  }
  return h.digest('hex').slice(0, 16)
}

/** Embed a list with a small concurrency pool, reusing prior vectors by hash. */
async function embedAll(
  fragments: Fragment[],
  prior: Map<string, number[]>,
): Promise<{ embedded: EmbeddedFragment[]; reused: number; called: number }> {
  const embedded: EmbeddedFragment[] = new Array(fragments.length)
  let reused = 0
  let called = 0
  let next = 0
  // Once one worker fails, the others stop pulling new work, so a failed run does
  // not keep billing Titan calls while main() unwinds (customer-paid POC).
  let aborted = false

  async function worker(): Promise<void> {
    while (next < fragments.length && !aborted) {
      const i = next++
      const f = fragments[i]
      const cached = prior.get(f.textHash)
      if (cached) {
        reused++
        embedded[i] = { ...f, vector: cached }
      } else {
        try {
          const vector = await embedText(f.text)
          called++
          embedded[i] = { ...f, vector }
        } catch (err) {
          aborted = true
          throw err
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return { embedded, reused, called }
}

async function main(): Promise<void> {
  resetEmbedStats()
  const profiles = await loadDemoProfiles()
  const fragments = profiles.flatMap((p) => toFragments(fromDemoSeed(p)))
  console.log(`Loaded ${profiles.length} demo profiles, ${fragments.length} fragments.`)

  const prior = priorVectors()
  const { embedded, reused, called } = await embedAll(fragments, prior)
  console.log(`Embedded: ${called} new, ${reused} reused from the prior artifact.`)

  const artifact: IndexArtifact = {
    modelVersion: MODEL_VERSION,
    indexVersion: indexVersion(fragments),
    dimensions: DIMENSIONS,
    metric: METRIC,
    builtAt: new Date().toISOString(),
    fragments: embedded,
  }

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT_FILE, JSON.stringify(artifact))
  console.log(`Wrote ${OUT_FILE} (index ${artifact.indexVersion}, ${embedded.length} vectors).`)

  // Measured Titan usage for this run, so the one-time indexing cost is a real
  // number (CLAUDE section 4.3). Only newly embedded fragments cost tokens;
  // reused vectors are free.
  const stats = getEmbedStats()
  console.log(`Titan usage this run: ${stats.calls} calls, ${stats.inputTokens} input tokens.`)
}

main().catch((err) => {
  console.error('FAIL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
