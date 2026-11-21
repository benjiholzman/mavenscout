// Hard ranking cases (cases 1 to 5 of loop8/docs/planning/test-cases-draft.md).
// The fixtures are fictional consultants kept in memory, never in the customer
// demo seed. These tests check the fixtures themselves: they load in both the
// app shape and the engine shape, they avoid the vocabulary of their target
// items, the decoy carries its keywords, and their ids stay clear of the demo
// seed. Whether each case fails on the placeholder is checked by the run of the
// hard cases command, not here. No fixture text is ever printed.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { evidenceText } from '../../../src/lib/matching/fit'
import { toFragments } from '../src/index/fragments'
import { orgTerms } from '../src/search/org-check'
import { phraseRegex } from '../src/search/query'
import { demoUuid, fixtureStrings, loadHardCases, containsTerm } from '../src/eval/hard-cases'

const REPO_ROOT = resolve(process.cwd(), '..', '..')
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** name, aliases and absorbed old names of every item on the unified list (011). */
function expertiseList(): Map<string, string[]> {
  const sql = readFileSync(join(REPO_ROOT, 'supabase', '011_unified_expertise.sql'), 'utf8')
  const arr = (s: string) => [...s.matchAll(/\$\$([^$]+)\$\$/g)].map((m) => m[1])
  const re = /\(\$\$[^$]+\$\$, \$\$([^$]+)\$\$, \d+, \$\$\w+\$\$, (ARRAY\[[^\]]*\]|'\{\}'::text\[\]), (ARRAY\[[^\]]*\]|'\{\}'::text\[\])\)/g
  return new Map([...sql.matchAll(re)].map((m) => [m[1], [m[1], ...arr(m[2]), ...arr(m[3])]]))
}

function torRequirementItems(tor: string): string[] {
  const exp = JSON.parse(readFileSync(join(REPO_ROOT, 'docs', 'samples', 'expectations.json'), 'utf8')) as {
    tors: { id: string; requirements: { kind: string; value: { name?: string } }[] }[]
  }
  const t = exp.tors.find((x) => x.id === tor)
  assert.ok(t, `unknown ToR ${tor}`)
  return t.requirements.filter((r) => r.kind === 'expertise').map((r) => r.value.name!)
}

/** Canonical organization names and aliases (009), parsed as scripts/demo-seed/build.ts does. */
function canonicalOrgs(): { names: string[]; aliases: string[] } {
  const sql = readFileSync(join(REPO_ROOT, 'supabase', '009_organizations.sql'), 'utf8')
  const arr = (s: string) => [...s.matchAll(/\$\$([^$]+)\$\$/g)].map((m) => m[1])
  const re = /\(\$\$([^$]+)\$\$, (ARRAY\[[^\]]*\]|'\{\}'::text\[\]), (ARRAY\[[^\]]*\]|'\{\}'::text\[\]), '(\w+)'\)/g
  const rows = [...sql.matchAll(re)]
  return { names: rows.map((m) => m[1]), aliases: rows.flatMap((m) => arr(m[2])) }
}

const fixtures = loadHardCases()

test('no fixture names a canonical organization or alias, in any field', () => {
  const { names, aliases } = canonicalOrgs()
  assert.ok(names.length > 50, 'organizations list parsed')
  const terms = orgTerms(names, aliases)
  for (const { hardCase, demo } of fixtures) {
    const strings = fixtureStrings(demo)
    for (const t of terms) {
      const re = phraseRegex(t.term, t.caseSensitive)
      const hit = strings.some((s) => {
        re.lastIndex = 0
        return re.test(s)
      })
      // Only the handle and the organization term are reported.
      assert.equal(hit, false, `${hardCase.handle} names the canonical organization "${t.term}"`)
    }
  }
})

test('every organization in a fixture is marked as invented', () => {
  for (const { hardCase, demo } of fixtures) {
    const orgs = [
      ...demo.history.map((h) => h.organization),
      ...demo.education.map((e) => e.institution),
      ...demo.portfolio.map((p) => p.org),
      ...demo.additional.map((a) => a.organization),
    ].filter((o) => o !== 'Self-employed')
    for (const o of orgs) assert.match(o, /\(fictional\)$/, `${hardCase.handle} organization is not marked fictional`)
  }
})

test('there are the five cases of the draft, four vocabulary mismatches and one decoy', () => {
  assert.equal(fixtures.length, 5)
  const mismatch = fixtures.filter((f) => f.hardCase.checkType === 'vocabulary_mismatch')
  const decoy = fixtures.filter((f) => f.hardCase.checkType === 'decoy')
  assert.equal(mismatch.length, 4)
  assert.equal(decoy.length, 1)
  for (const f of mismatch) assert.equal(f.hardCase.expect, 'top10', f.hardCase.handle)
  for (const f of decoy) assert.equal(f.hardCase.expect, 'not_top10', f.hardCase.handle)
  const tors = new Map(fixtures.map((f) => [f.hardCase.id, f.hardCase.tor]))
  assert.deepEqual(Object.fromEntries(tors), {
    'hard-1': 'tor-01',
    'hard-2': 'tor-01',
    'hard-3': 'tor-03',
    'hard-4': 'tor-05',
    'hard-5': 'tor-01',
  })
})

test('every fixture loads as the app scoring input and as the engine fragment source', () => {
  for (const f of fixtures) {
    const { hardCase, demo, candidate, source } = f
    assert.equal(candidate.profile.id, demo.id)
    assert.equal(candidate.profile.handle, hardCase.handle)
    assert.equal(candidate.profile.is_demo, true)
    // Compared with ok, not equal, so a failure never prints the bio.
    assert.ok(candidate.profile.detailed_bio === demo.bio.trim(), `${hardCase.handle} bio`)
    assert.equal(candidate.portfolio.length, demo.portfolio.length)
    assert.ok(candidate.portfolio.length >= 2, `${hardCase.handle} needs portfolio depth`)
    for (const p of candidate.portfolio) {
      assert.equal(p.profile_id, demo.id)
      assert.match(p.id, UUID_RE)
    }
    assert.deepEqual(
      candidate.profile.tiered_expertise.map((t) => t.name),
      [...(demo.tiers.core ?? []), ...(demo.tiers.strong ?? []), ...(demo.tiers.working ?? [])],
    )
    assert.ok(evidenceText(candidate).length > 0)

    assert.equal(source.profileId, demo.id)
    assert.ok(source.bio === demo.bio, `${hardCase.handle} source bio`)
    assert.equal(source.portfolio.length, demo.portfolio.length)
    assert.ok(toFragments(source).length > 3, `${hardCase.handle} yields fragments`)
  }
})

test('every fixture is marked as fictional test data and uses a hard- handle and a fixed UUID', () => {
  for (const { hardCase, demo } of fixtures) {
    assert.match(demo.handle, /^hard-/)
    assert.equal(demo.handle, hardCase.handle)
    assert.match(demo.id, UUID_RE)
    assert.match(demo.note, /fictional test data/i)
  }
})

test('cases.json records every name and alias of each target item as forbidden', () => {
  const list = expertiseList()
  assert.ok(list.size > 100, 'expertise list parsed')
  for (const { hardCase } of fixtures) {
    const forbidden = new Set(hardCase.forbiddenTerms.map((t) => t.toLowerCase()))
    if (hardCase.checkType === 'decoy') continue
    assert.ok(hardCase.targetItems.length > 0, hardCase.handle)
    for (const item of hardCase.targetItems) {
      const names = list.get(item)
      assert.ok(names, `${item} is on the expertise list`)
      for (const n of names) assert.ok(forbidden.has(n.toLowerCase()), `${hardCase.handle} forbids ${n}`)
    }
  }
})

test('no vocabulary mismatch fixture contains a forbidden word or alias (whole word, any case)', () => {
  for (const { hardCase, demo } of fixtures) {
    if (hardCase.checkType === 'decoy') continue
    const strings = fixtureStrings(demo)
    for (const term of hardCase.forbiddenTerms) {
      // Only the handle and the term are reported, never the fixture text.
      const hit = strings.some((s) => containsTerm(s, term))
      assert.equal(hit, false, `${hardCase.handle} uses the forbidden term "${term}"`)
    }
  }
})

test('the decoy contains every keyword it stuffs', () => {
  const decoys = fixtures.filter((f) => f.hardCase.checkType === 'decoy')
  for (const { hardCase, demo } of decoys) {
    assert.ok(hardCase.requiredTerms.length >= 4)
    const text = [demo.headline, demo.bio].join(' ')
    for (const term of hardCase.requiredTerms) assert.ok(containsTerm(text, term), `${hardCase.handle} stuffs "${term}"`)
  }
})

test('the decoy tags every item it stuffs, at the Working knowledge tier', () => {
  const decoys = fixtures.filter((f) => f.hardCase.checkType === 'decoy')
  assert.equal(decoys.length, 1)
  for (const { hardCase, candidate } of decoys) {
    assert.ok(hardCase.targetItems.length >= 4)
    for (const item of hardCase.targetItems) {
      const tag = candidate.profile.tiered_expertise.find((t) => t.name === item)
      assert.equal(tag?.tier, 'working', `${hardCase.handle} tags ${item} as working`)
    }
  }
})

test('the decoy has no related work: no stuffed keyword outside its headline, bio and tags', () => {
  for (const { hardCase, demo } of fixtures.filter((f) => f.hardCase.checkType === 'decoy')) {
    const work = fixtureStrings([demo.history, demo.portfolio, demo.additional, demo.accreditations])
    for (const term of hardCase.requiredTerms) {
      assert.equal(work.some((s) => containsTerm(s, term)), false, `${hardCase.handle} work mentions "${term}"`)
    }
  }
})

test('tags name only items on the list; vocabulary cases never tag a target item or an expertise row of the ToR', () => {
  const list = expertiseList()
  for (const { hardCase, candidate } of fixtures) {
    // The decoy tags its stuffed items on purpose (ledger ruling I1); the draft's
    // tag rule is for the vocabulary mismatch cases.
    const avoid = new Set(
      hardCase.checkType === 'decoy' ? [] : [...hardCase.targetItems, ...torRequirementItems(hardCase.tor)],
    )
    for (const t of candidate.profile.tiered_expertise) {
      assert.ok(list.has(t.name), `${hardCase.handle} tag ${t.name} is on the list`)
      assert.ok(!avoid.has(t.name), `${hardCase.handle} must not tag ${t.name}`)
    }
  }
})

test('handles and UUIDs are unique and do not collide with the demo seed', async () => {
  const handles = fixtures.map((f) => f.hardCase.handle)
  const ids = fixtures.flatMap((f) => [f.demo.id, ...f.candidate.portfolio.map((p) => p.id)])
  assert.equal(new Set(handles).size, handles.length)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(new Set(fixtures.map((f) => f.hardCase.id)).size, fixtures.length)

  const dir = join(REPO_ROOT, 'scripts', 'demo-seed', 'profiles')
  const seedHandles = new Set<string>()
  const seedIds = new Set<string>()
  for (const file of readdirSync(dir).filter((x) => x.endsWith('.mjs'))) {
    const mod = (await import(pathToFileURL(join(dir, file)).href)) as {
      default: { id?: string; handle?: string; slug?: string; portfolio?: { id?: string; name: string }[] }[]
    }
    for (const p of mod.default) {
      const handle = p.handle ?? `demo-${p.slug}`
      seedHandles.add(handle)
      seedIds.add(p.id ?? demoUuid(handle))
      for (const it of p.portfolio ?? []) seedIds.add(it.id ?? demoUuid(`${handle}:portfolio:${it.name}`))
    }
  }
  assert.ok(seedHandles.size > 50, 'demo seed loaded')
  for (const h of handles) assert.ok(!seedHandles.has(h), `${h} collides with the demo seed`)
  for (const id of ids) assert.ok(!seedIds.has(id), `${id} collides with the demo seed`)
})

test('containsTerm matches whole words in any case only', () => {
  assert.equal(containsTerm('Led the Survey Design work', 'survey design'), true)
  assert.equal(containsTerm('malnutrition rates', 'nutrition'), false)
  assert.equal(containsTerm('M&E plans', 'M&E'), true)
  assert.equal(containsTerm('ran e-procurement', 'procurement'), true)
  assert.equal(containsTerm('procurements', 'procurement'), false)
})
