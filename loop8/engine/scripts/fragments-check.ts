// Standalone assertion script for fragmentation (issue #20, acceptance
// criterion 6). No test runner exists in this repo (loop8 CLAUDE section 6),
// so this is bundled and run directly:
//
// Run from the repo root so the demo profiles resolve:
//   npx esbuild loop8/engine/scripts/fragments-check.ts --bundle --platform=node \
//     --format=esm --packages=external --outfile=node_modules/.cache/frag-check.mjs \
//     && node node_modules/.cache/frag-check.mjs
//
// It loads the local demo profiles, fragments them, and checks the contract:
// only capability fragment types, metadata-only fields never become fragments,
// no empty fragments, unique and stable ids, deterministic hashes, and no
// employer org name in the embedded text (it rides in metadata instead).

import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { toFragments } from '../src/index/fragments'
import { demoKey, fromDemoSeed, type DemoProfile } from '../src/index/source'
import type { FragmentMetadata, FragmentSource, FragmentType } from '../src/index/types'

const ALLOWED_TYPES: readonly FragmentType[] = [
  'tagline',
  'bio',
  'portfolio',
  'work_history',
  'education',
  'additional_experience',
  'credential',
  'expertise_tags',
]

const employerTypes = new Set<FragmentType>(['portfolio', 'work_history', 'additional_experience'])

/** A string that appears in no other field, so if it shows up in any fragment
 *  text the structured join must have embedded the organization. */
const SENTINEL_ORG = 'Zzqx Sentinel Employer'

/** Prove our own construction: the org is never in the embedded text, and each
 *  employer fragment keeps it in metadata. A synthetic input avoids the false
 *  positives a scan over real author prose would hit (short acronyms, bios that
 *  legitimately name employers). */
function assertSentinelOrgExcluded(): void {
  const base: FragmentMetadata = {
    location: null,
    languages: [],
    expertiseTags: [],
    careerLevel: null,
    availability: null,
  }
  const source: FragmentSource = {
    profileId: 'sentinel',
    tagline: null,
    bio: null,
    portfolio: [
      { id: 'p1', projectName: 'Alpha Platform', role: 'Lead Engineer', description: 'Shipped it', results: 'Adopted widely', organization: SENTINEL_ORG },
    ],
    workHistory: [{ id: 'w1', role: 'Senior Engineer', organization: SENTINEL_ORG, description: 'Built services' }],
    education: [],
    additionalExperience: [{ id: 'a1', role: 'Technical Advisor', organization: SENTINEL_ORG, description: 'Advised teams' }],
    credentials: [],
    expertiseTags: [],
    metadata: base,
  }
  const fragments = toFragments(source)
  const employer = fragments.filter((f) => employerTypes.has(f.type))
  assert.equal(employer.length, 3, 'sentinel source should yield three employer fragments')
  for (const f of fragments) {
    assert.ok(!f.text.includes(SENTINEL_ORG), `sentinel org leaked into text of ${f.fragmentId}: ${f.text}`)
  }
  for (const f of employer) {
    assert.equal(f.metadata.organization, SENTINEL_ORG, `employer fragment ${f.fragmentId} lost its org in metadata`)
  }
}

async function loadDemoProfiles(): Promise<DemoProfile[]> {
  const dir = join(process.cwd(), 'scripts', 'demo-seed', 'profiles')
  const files = readdirSync(dir).filter((f) => f.endsWith('.mjs'))
  const all: DemoProfile[] = []
  for (const f of files) {
    const mod = (await import(pathToFileURL(join(dir, f)).href)) as { default: DemoProfile[] }
    all.push(...mod.default)
  }
  return all
}

function run(profiles: DemoProfile[]): void {
  assert.ok(profiles.length > 0, 'no demo profiles loaded')

  let totalFragments = 0
  let orgInMetadata = 0
  const metadataSignals = ['availability', 'career', 'speaks', 'located in', 'based in']

  for (const demo of profiles) {
    const source = fromDemoSeed(demo)
    const fragments = toFragments(source)

    // Stable and deterministic: a second run matches id for id and hash for hash.
    const again = toFragments(fromDemoSeed(demo))
    assert.deepEqual(
      fragments.map((f) => [f.fragmentId, f.textHash]),
      again.map((f) => [f.fragmentId, f.textHash]),
      `fragmentation not deterministic for ${demoKey(demo)}`,
    )

    const ids = new Set<string>()
    for (const f of fragments) {
      assert.ok(ALLOWED_TYPES.includes(f.type), `unexpected fragment type ${f.type}`)
      assert.ok(f.text.trim() !== '', `empty fragment ${f.fragmentId}`)
      assert.ok(!ids.has(f.fragmentId), `duplicate fragment id ${f.fragmentId}`)
      ids.add(f.fragmentId)
      // profileId must be a real, non-empty id. A loose demo shape (the ToR-05
      // individuals carry a slug, not an id) must still yield a usable key, not
      // an undefined that only the loader would reject.
      assert.ok(
        typeof f.profileId === 'string' && f.profileId.trim() !== '',
        `fragment ${f.fragmentId} has an empty profileId`,
      )
      assert.equal(f.profileId, demoKey(demo), 'fragment carries the wrong profile id')
      assert.ok(f.metadata, `fragment ${f.fragmentId} has no metadata`)
    }

    // Metadata-only fields never leak into fragment text as their own fragment.
    // Expertise tags are allowed as text; location, language and availability
    // are metadata only, so no non-tag fragment should read like them.
    for (const f of fragments) {
      if (f.type === 'expertise_tags') continue
      const low = f.text.toLowerCase()
      for (const signal of metadataSignals) {
        assert.ok(!low.startsWith(signal), `fragment ${f.fragmentId} looks like metadata: ${f.text}`)
      }
    }

    // Over real data we only count that employer orgs are preserved in metadata.
    // We cannot assert the org string is absent from the text here: an author's
    // own prose legitimately names employers (a bio about WHO), and short
    // acronyms are substrings of ordinary words. The structured join is tested
    // deterministically below with a sentinel org instead.
    orgInMetadata += fragments.filter(
      (f) => typeof f.metadata.organization === 'string' && f.metadata.organization !== '',
    ).length

    totalFragments += fragments.length
  }

  // The org is dropped from text but preserved in metadata, so it must appear
  // there across the synthetic pool.
  assert.ok(orgInMetadata > 0, 'no fragment preserved an organization in metadata')

  // The structured join never embeds the org. A sentinel org that appears in no
  // other field must be absent from every fragment's text, yet present in the
  // metadata of each employer fragment. This proves our construction, free of
  // the false positives a scan over real prose would hit.
  assertSentinelOrgExcluded()

  const n = profiles.length
  console.log(
    `OK: ${n} demo profiles, ${totalFragments} fragments ` +
      `(avg ${(totalFragments / n).toFixed(1)}/profile), ${orgInMetadata} carry an org in metadata`,
  )
}

loadDemoProfiles()
  .then(run)
  .catch((err) => {
    console.error('FAIL:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
