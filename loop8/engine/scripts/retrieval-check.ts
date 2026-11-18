// Retrieval sanity check (issue #20, acceptance criterion 5). Proves the index
// is useful: for each of the five sample ToRs it embeds the ToR text with the
// SAME shared helper, ranks profiles by their best fragment (cosine), and shows
// whether the expected top profiles surface. At least one vocabulary-mismatch
// ToR should rank an expected profile that the keyword placeholder misses.
//
// Needs the artifact from build-index.ts, so it is gated on the same AWS
// prerequisite. Run from the repo root, with the Titan profile and the bundle
// inside the engine dir so @aws-sdk resolves from loop8/engine/node_modules:
//   node_modules/.bin/esbuild loop8/engine/scripts/retrieval-check.ts --bundle \
//     --platform=node --format=esm --packages=external \
//     --outfile=loop8/engine/.local-dist/retrieval-check.mjs \
//     && AWS_PROFILE=mavenscout-titan node loop8/engine/.local-dist/retrieval-check.mjs

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { embedText } from '../src/bedrock/titan'
import { demoHandle, demoKey, type DemoProfile } from '../src/index/source'
import type { IndexArtifact } from '../src/index/types'

const ROOT = process.cwd()
const SAMPLES = join(ROOT, 'docs', 'samples')
const ARTIFACT = join(ROOT, 'loop8', 'internal', 'index-artifact.json')
const TOP_N = 10

interface Tor {
  id: string
  title: string
  file: string
  expected_top: { handle: string }[]
}

/** Normalized vectors (Titan normalize=true), so cosine is the dot product. */
function dot(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

async function handlesById(): Promise<Map<string, string>> {
  const dir = join(ROOT, 'scripts', 'demo-seed', 'profiles')
  const map = new Map<string, string>()
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs'))) {
    const mod = (await import(pathToFileURL(join(dir, f)).href)) as { default: DemoProfile[] }
    for (const p of mod.default) map.set(demoKey(p), demoHandle(p))
  }
  return map
}

async function main(): Promise<void> {
  if (!existsSync(ARTIFACT)) {
    throw new Error(`no artifact at ${ARTIFACT}; run build.ts first`)
  }
  const artifact = JSON.parse(readFileSync(ARTIFACT, 'utf8')) as IndexArtifact
  const byId = await handlesById()
  const { tors } = JSON.parse(readFileSync(join(SAMPLES, 'expectations.json'), 'utf8')) as { tors: Tor[] }

  console.log(`Index ${artifact.indexVersion} (${artifact.modelVersion}, ${artifact.fragments.length} fragments)\n`)

  let hitTotal = 0
  let expectedTotal = 0

  for (const tor of tors) {
    const query = readFileSync(join(SAMPLES, tor.file), 'utf8')
    const qVec = await embedText(query)

    // Best fragment score per profile.
    const best = new Map<string, number>()
    for (const f of artifact.fragments) {
      const score = dot(qVec, f.vector)
      const prev = best.get(f.profileId)
      if (prev === undefined || score > prev) best.set(f.profileId, score)
    }

    const ranked = [...best.entries()]
      .map(([id, score]) => ({ handle: byId.get(id) ?? id, score }))
      .sort((a, b) => b.score - a.score)
    const topHandles = new Set(ranked.slice(0, TOP_N).map((r) => r.handle))

    const expected = tor.expected_top.map((e) => e.handle)
    const hits = expected.filter((h) => topHandles.has(h))
    hitTotal += hits.length
    expectedTotal += expected.length

    console.log(`${tor.id} ${tor.title}`)
    console.log(`  expected in top ${TOP_N}: ${hits.length}/${expected.length} (${hits.join(', ') || 'none'})`)
    console.log(`  top ${TOP_N}: ${ranked.slice(0, TOP_N).map((r) => `${r.handle} ${r.score.toFixed(3)}`).join(', ')}\n`)
  }

  console.log(`Expected profiles surfaced in top ${TOP_N}: ${hitTotal}/${expectedTotal}`)
}

main().catch((err) => {
  console.error('FAIL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
