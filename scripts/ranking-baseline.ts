// Ranking baseline for Loop8 (docs/samples/ranking-baseline.md).
//
//   npm run baseline
//
// Scores the five sample ToRs in docs/samples/ against the live directory pool
// with the app's own placeholder engine, and rewrites
// docs/samples/ranking-baseline.md with the results.
//
// READ-ONLY: it only SELECTs (profiles, portfolio, taxonomy, plus row counts of
// job_descriptions / match_results to prove nothing was written) and scores in
// memory with scorePool. It never calls rankPool or anything in persist.ts, so
// no ranking runs are stored.
//
// Three checks per ToR:
//   1. Fixed requirements (primary baseline): exactly the rows in
//      docs/samples/expectations.json; Required rows pre-filter the pool through
//      applyMustHaves, as in the app. No extraction rows, no Add all.
//   2. End to end: extractRequirements → "Add all" (every suggestion at Nice to
//      have, via the requirements reducer) → scorePool.
//   3. Extraction: suggestions vs. the terms a good extractor should find.
// In both runs Fit reads the JD through the extraction (that is how rankPool
// receives a stored JD); only the grid rows differ.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildExpertiseIndex, expertiseTags, TIERS } from '../src/lib/expertise'
import { deriveOptions, locationCountry } from '../src/lib/filters'
import { spokenLanguages } from '../src/lib/languages'
import { isListed } from '../src/lib/listing'
import { extractRequirements } from '../src/lib/matching/extract'
import type { CandidateInput } from '../src/lib/matching/fit'
import { bandFor } from '../src/lib/matching/config'
import { scorePool } from '../src/lib/matching/score'
import type { ExtractedRequirements, JdMatchResult as MatchResult, Requirement } from '../src/lib/matching/types'
import { buildOrgIndex, EMPTY_ORG_INDEX } from '../src/lib/organizations'
import { orgHistoryOutcome } from '../src/lib/requirements/match'
import { EMPTY_SEARCH, suggestionsFrom } from '../src/lib/requirements/model'
import { applyMustHaves } from '../src/lib/requirements/mustHaves'
import { requirementsReducer } from '../src/lib/requirements/store'
import type { Organization, PortfolioItem, Profile, TaxonomyCategory, TaxonomyItem } from '../src/types/db'

const root = process.cwd()
const samples = join(root, 'docs', 'samples')

// ---- inputs -------------------------------------------------------------------

interface Check {
  type: string
  handle: string
  other?: string
  org?: string
  /** tier_order: the expertise item whose tier varies. */
  item?: string
  /** fluent_only: the Required language set to Working in the variant. */
  language?: string
  expect: string
  why: string
}
interface Tor {
  id: string
  title: string
  file: string
  requirements: Requirement[]
  expected_top: { handle: string; why: string }[]
  expected_extraction: { expertise: string[]; locations: string[]; languages: string[] }
  checks: Check[]
  ablate?: { row: string; label: string; watch: string }[]
}
const { tors } = JSON.parse(readFileSync(join(samples, 'expectations.json'), 'utf8')) as { tors: Tor[] }
/** Checks reported once per ToR rather than per ranking run. */
const ONCE_PER_TOR = ['current_vs_former', 'tier_order', 'fluent_only']

function readEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return env
}
const env = readEnv()
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function select<T>(table: string, build?: (q: any) => any): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    let q = db.from(table).select('*')
    if (build) q = build(q)
    const { data, error } = await q.range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data as T[]))
    if (!data || data.length < 1000) return rows
  }
}
async function rowCount(table: string): Promise<number> {
  const { count, error } = await db.from(table).select('id', { count: 'exact', head: true })
  if (error) throw new Error(`${table}: ${error.message}`)
  return count ?? 0
}

// ---- scoring --------------------------------------------------------------------

interface Ranked {
  results: MatchResult[]
  pool: number
  rankOf: Map<string, MatchResult>
}

function main() {
  return run().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

async function run() {
  const writesBefore = { jd: await rowCount('job_descriptions'), mr: await rowCount('match_results') }
  const [listed, portfolio, categories, items, orgRows] = await Promise.all([
    select<Profile>('profiles', (q) => q.eq('approval_status', 'approved').eq('subscription_status', 'active')),
    select<PortfolioItem>('portfolio_items', (q) => q.order('sort_order')),
    select<TaxonomyCategory>('taxonomy_categories'),
    select<TaxonomyItem>('taxonomy_items'),
    // The canonical organizations list (009); without it, Org History falls
    // back to name matching, as in the app.
    select<Organization>('organizations').catch(() => null),
  ])
  // The directory's pool (lib/listing): individuals only while firms are hidden.
  const profiles = listed.filter(isListed)
  const orgs = orgRows ? buildOrgIndex(orgRows) : EMPTY_ORG_INDEX
  const byHandle = new Map(profiles.map((p) => [p.handle, p]))
  const byId = new Map(profiles.map((p) => [p.id, p]))
  const portfolioBy = new Map<string, PortfolioItem[]>()
  for (const it of portfolio) portfolioBy.set(it.profile_id, [...(portfolioBy.get(it.profile_id) ?? []), it])
  const expertise = buildExpertiseIndex(categories, items)
  const options = deriveOptions(profiles)
  const ctx = {
    taxonomy: { categories, items },
    locationOptions: options.locations.flatMap((g) => [g.label, ...g.items]),
    languageOptions: options.languages,
  }
  // Fit reads the profile and portfolio only; transcripts never feed ranking (§11).
  const candidate = (p: Profile): CandidateInput => ({ profile: p, portfolio: portfolioBy.get(p.id) ?? [] })

  function rank(rawText: string, extracted: ExtractedRequirements, requirements: Requirement[]): Ranked {
    const survivors = applyMustHaves(profiles, portfolioBy, requirements, EMPTY_SEARCH, expertise, orgs)
    const results = scorePool({ rawText, extracted, requirements, candidates: survivors.map(candidate), expertise, orgs })
    return { results, pool: survivors.length, rankOf: new Map(results.map((r) => [byId.get(r.profile_id)!.handle, r])) }
  }

  const out: string[] = []
  const summary = {
    fixed: { top5: 0, top10: 0, checks: 0, passed: 0 },
    e2e: { top5: 0, top10: 0, checks: 0, passed: 0 },
    expected: 0,
    recallFound: 0,
    recallTotal: 0,
    orgChecks: 0,
    orgPassed: 0,
    variantChecks: 0,
    variantPassed: 0,
    topTies: { fixed: 0, e2e: 0 },
    singleNiceMax: 0,
    ablations: [] as string[],
  }
  // Totals by role, across ToRs, for calibrating the band thresholds.
  type Role = 'expected' | 'related' | 'decoy' | 'rest'
  const dist: Record<'fixed' | 'e2e', Record<Role, number[]> & { filtered: Record<Role, number> }> = {
    fixed: { expected: [], related: [], decoy: [], rest: [], filtered: { expected: 0, related: 0, decoy: 0, rest: 0 } },
    e2e: { expected: [], related: [], decoy: [], rest: [], filtered: { expected: 0, related: 0, decoy: 0, rest: 0 } },
  }
  const missing = new Set<string>()

  for (const tor of tors) {
    const rawText = readFileSync(join(samples, tor.file), 'utf8')
    const extracted = await extractRequirements(rawText, ctx)
    const fixed = rank(rawText, extracted, tor.requirements)
    const added = requirementsReducer(
      { requirements: [], search: EMPTY_SEARCH },
      { type: 'addSuggestions', suggestions: suggestionsFrom(extracted).flatMap((g) => g.items) },
    ).requirements
    const e2e = rank(rawText, extracted, added)
    for (const h of [...tor.expected_top.map((e) => e.handle), ...tor.checks.flatMap((c) => [c.handle, c.other ?? ''])])
      if (h && !byHandle.has(h)) missing.add(h)

    out.push(`## ${tor.id}: ${tor.title}`, '', `JD: [\`${tor.file}\`](${tor.file})`, '')

    // Roles: expected top; related = profiles named by positive test cases
    // (wrong location, untagged evidence, generalists, former staff, tie
    // pairs); decoys = profiles that should NOT reach the top 10; rest = pool.
    const roleOf = new Map<string, Role>()
    for (const c of tor.checks) {
      const negative = c.type === 'decoy' || c.type === 'right_location_wrong_fit'
      for (const h of [c.handle, c.other].filter(Boolean) as string[]) roleOf.set(h, negative ? 'decoy' : 'related')
    }
    for (const e of tor.expected_top) roleOf.set(e.handle, 'expected')

    for (const [label, key, r] of [
      ['Fixed requirements (primary baseline)', 'fixed', fixed],
      ['End to end (extraction → Add all)', 'e2e', e2e],
    ] as const) {
      const s = summary[key]
      out.push(`### ${label}`, '')
      if (key === 'fixed') out.push(`Rows: ${tor.requirements.map(describeRow).join('; ')}.`, '')
      else out.push(`Rows added by Add all (${added.length}): ${added.map(describeRow).join('; ') || 'none'}.`, '')
      out.push(`Pool after Required rows: **${r.pool}** of ${profiles.length}.`, '')
      for (const p of profiles) {
        const role = roleOf.get(p.handle) ?? 'rest'
        const m = r.rankOf.get(p.handle)
        if (m) dist[key][role].push(m.total_score)
        else dist[key].filtered[role]++
      }
      const ties = tieStats(r.results)
      if (ties.atTop > 1) summary.topTies[key] += 1
      out.push(
        (ties.atTop > 1
          ? `Ties: **${ties.atTop}** candidates share the top total (${r.results[0].total_score}); `
          : `Ties: none at the top (${r.results[0]?.total_score ?? '–'}); `) +
          `${ties.pairsTop10} tied adjacent pair${ties.pairsTop10 === 1 ? '' : 's'} in the top 10. ` +
          `Bands (whole pool): ${bandCounts(r.results)}.`,
        '',
      )
      out.push('| Expected | Rank | Total | Fit | Top 5 | Top 10 |', '|---|---|---|---|---|---|')
      for (const e of tor.expected_top) {
        const m = r.rankOf.get(e.handle)
        const in5 = !!m && m.rank <= 5
        const in10 = !!m && m.rank <= 10
        s.top5 += in5 ? 1 : 0
        s.top10 += in10 ? 1 : 0
        out.push(`| ${nameOf(e.handle)} | ${m ? m.rank : 'filtered'} | ${m?.total_score ?? '–'} | ${m?.fit_score ?? '–'} | ${in5 ? '✓' : '✗'} | ${in10 ? '✓' : '✗'} |`)
      }
      out.push('')
      const checks = tor.checks.filter((c) => !ONCE_PER_TOR.includes(c.type))
      if (checks.length) {
        out.push('| Check | Profile(s) | Expect | Result | |', '|---|---|---|---|---|')
        for (const c of checks) {
          const { pass, detail } = judgeCheck(c, r)
          s.checks += 1
          s.passed += pass ? 1 : 0
          out.push(`| ${c.type.replace(/_/g, ' ')} | ${nameOf(c.handle)}${c.other ? ` vs ${nameOf(c.other)}` : ''} | ${c.expect.replace(/_/g, ' ')} | ${detail} | ${pass ? '✓' : '✗'} |`)
        }
        out.push('')
      }
      out.push('<details><summary>Top 10</summary>', '', '| # | Profile | Type | Location | Total | Fit | Band |', '|---|---|---|---|---|---|---|')
      for (const m of r.results.slice(0, 10)) {
        const p = byId.get(m.profile_id)!
        out.push(`| ${m.rank} | ${p.name} (\`${p.handle}\`) | ${p.consultant_type} | ${p.location ?? '–'} | ${m.total_score} | ${m.fit_score} | ${m.band} |`)
      }
      out.push('', '</details>', '')
    }

    // Current vs former staff: how the Org History scopes judge the pair.
    for (const c of tor.checks.filter((c) => c.type === 'current_vs_former')) {
      const a = byHandle.get(c.handle)
      const b = c.other ? byHandle.get(c.other) : undefined
      if (!a || !b || !c.org) continue
      const ev = (p: Profile, scope: 'current' | 'ever') => orgHistoryOutcome(p, { org: c.org!, scope, peers: [] }, orgs).outcome
      const res = { aEver: ev(a, 'ever'), bEver: ev(b, 'ever'), aCur: ev(a, 'current'), bCur: ev(b, 'current') }
      const pass = res.aEver === 'met' && res.bEver === 'met' && res.aCur === 'met' && res.bCur === 'not_met'
      summary.orgChecks += 1
      summary.orgPassed += pass ? 1 : 0
      out.push(
        `### Current vs former staff: ${c.org}`,
        '',
        '| Profile | Ever at | Currently at |',
        '|---|---|---|',
        `| ${a.name} (current) | ${res.aEver} | ${res.aCur} |`,
        `| ${b.name} (former) | ${res.bEver} | ${res.bCur} |`,
        '',
        `${pass ? '✓' : '✗'} ${c.why}`,
        '',
      )
    }

    // Variants of one profile, scored in memory next to the original (scoring
    // is per candidate, so the pool is unaffected).
    for (const c of tor.checks.filter((c) => c.type === 'tier_order' || c.type === 'fluent_only')) {
      const p = byHandle.get(c.handle)
      if (!p) continue
      const variant = (suffix: string, patch: Partial<Profile>): Profile => ({ ...p, ...patch, id: `${p.id}#${suffix}` })
      let pass = false
      let lines: string[] = []
      if (c.type === 'tier_order' && c.item) {
        const others = expertiseTags(p).filter((t) => t.name !== c.item)
        const variants = TIERS.map((tier) => variant(tier, { tiered_expertise: [...others, { name: c.item!, tier }] }))
        const results = scorePool({
          rawText,
          extracted,
          requirements: tor.requirements,
          candidates: variants.map((v) => ({ profile: v, portfolio: portfolioBy.get(p.id) ?? [] })),
          expertise,
          orgs,
        })
        const byTier = TIERS.map((tier) => results.find((r) => r.profile_id.endsWith(`#${tier}`))!)
        pass = byTier[0].total_score > byTier[1].total_score && byTier[1].total_score > byTier[2].total_score
        lines = [
          `### Tier order: ${p.name}, ${c.item}`,
          '',
          '| Tier | Total | Fit | Row |',
          '|---|---|---|---|',
          ...TIERS.map((tier, i) => {
            const adj = byTier[i].adjustments.find((a) => a.label === c.item)
            return `| ${tier} | ${byTier[i].total_score} | ${byTier[i].fit_score} | ${adj ? `${adj.outcome}, ${adj.points} pts (${adj.detail})` : '–'} |`
          }),
        ]
      }
      if (c.type === 'fluent_only' && c.language) {
        const working = variant('working', {
          spoken_languages: spokenLanguages(p).map((l) => (l.name === c.language ? { ...l, proficiency: 'working' as const } : l)),
        })
        const row = tor.requirements.find(
          (r) => r.kind === 'language' && r.level === 'must' && r.value.values.includes(c.language!),
        )
        const admitted = (min: 'working' | 'fluent') =>
          row
            ? applyMustHaves([p, working], portfolioBy, [{ ...row, value: { ...row.value, min } } as Requirement], EMPTY_SEARCH, expertise, orgs).map((x) => x.id)
            : []
        const fluentOnly = admitted('fluent')
        const workingUp = admitted('working')
        pass = fluentOnly.includes(p.id) && !fluentOnly.includes(working.id) && workingUp.includes(working.id)
        lines = [
          `### Fluent only: ${p.name}, ${c.language}`,
          '',
          '| Required row | Original (Fluent) | Variant (Working) |',
          '|---|---|---|',
          `| ${c.language}, Fluent only | ${fluentOnly.includes(p.id) ? 'admitted' : 'excluded'} | ${fluentOnly.includes(working.id) ? 'admitted' : 'excluded'} |`,
          `| ${c.language}, Working or above | ${workingUp.includes(p.id) ? 'admitted' : 'excluded'} | ${workingUp.includes(working.id) ? 'admitted' : 'excluded'} |`,
        ]
      }
      summary.variantChecks += 1
      summary.variantPassed += pass ? 1 : 0
      out.push(...lines, '', `${pass ? '✓' : '✗'} ${c.why}`, '')
    }

    // What-if: drop a row and compare the top 10.
    for (const a of tor.ablate ?? []) {
      const without = rank(rawText, extracted, tor.requirements.filter((r) => r.id !== a.row))
      const top = (x: Ranked) => x.results.slice(0, 10).map((m) => byId.get(m.profile_id)!.handle)
      const withTop = top(fixed)
      const withoutTop = top(without)
      const moved = withTop.filter((h, i) => withoutTop[i] !== h).length
      const w = fixed.rankOf.get(a.watch)
      const wo = without.rankOf.get(a.watch)
      const verdict = moved === 0 && w?.rank === wo?.rank ? 'no effect on the top 10' : `${moved} of 10 positions change`
      summary.ablations.push(`${tor.id} ${a.label}: ${verdict}`)
      out.push(
        `### What-if: without ${a.label}`,
        '',
        `${verdict}. ${nameOf(a.watch)}: #${w?.rank ?? '–'} with the row, #${wo?.rank ?? '–'} without.`,
        '',
        '| # | With the row | Total | Without the row | Total |',
        '|---|---|---|---|---|',
        ...withTop.map((h, i) => {
          const m1 = fixed.rankOf.get(h)!
          const h2 = withoutTop[i]
          const m2 = h2 ? without.rankOf.get(h2) : undefined
          return `| ${i + 1} | ${byHandle.get(h)!.name} | ${m1.total_score} | ${h2 ? byHandle.get(h2)!.name : '–'} | ${m2?.total_score ?? '–'} |`
        }),
        '',
      )
    }

    // A single Nice to have row: how far can it move any candidate's total?
    // Base = the fixed rows minus every preference (Required rows kept, so
    // the pool is the same); then each preference row alone, at Nice to have.
    {
      const base = tor.requirements.filter((r) => r.level === 'must')
      const baseRun = rank(rawText, extracted, base)
      let worst = { delta: 0, row: '', handle: '' }
      for (const row of tor.requirements.filter((r) => r.level !== 'must')) {
        const one = rank(rawText, extracted, [...base, { ...row, level: 'slight' } as Requirement])
        for (const [h, m] of one.rankOf) {
          const d = Math.abs(m.total_score - baseRun.rankOf.get(h)!.total_score)
          if (d > worst.delta) worst = { delta: d, row: describeRow({ ...row, level: 'slight' } as Requirement), handle: h }
        }
      }
      summary.singleNiceMax = Math.max(summary.singleNiceMax, worst.delta)
      out.push(
        '### One Nice to have row',
        '',
        `Largest change to any candidate's total from a single Nice to have row: **${worst.delta}** point${worst.delta === 1 ? '' : 's'}` +
          (worst.row ? ` (${worst.row}, ${nameOf(worst.handle)})` : '') +
          `. ${worst.delta <= 3 ? '✓' : '✗'} expected at most about 3.`,
        '',
      )
    }

    // Extraction recall.
    const got = {
      expertise: extracted.expertise.map((t) => t.name),
      locations: extracted.locations.map((l) => l.value),
      languages: extracted.languages.map((l) => l.value),
    }
    out.push('### Extraction', '', '| Kind | Found / expected | Missed | Unexpected suggestions |', '|---|---|---|---|')
    for (const kind of ['expertise', 'locations', 'languages'] as const) {
      const want = tor.expected_extraction[kind]
      const hit = (w: string) =>
        kind === 'locations' ? got.locations.some((v) => v === w || locationCountry(v) === w) : got[kind].includes(w)
      const found = want.filter(hit)
      const missed = want.filter((w) => !hit(w))
      const unexpected =
        kind === 'locations'
          ? got.locations.filter((v) => !want.includes(v) && !want.includes(locationCountry(v)))
          : got[kind].filter((g) => !want.includes(g))
      summary.recallFound += found.length
      summary.recallTotal += want.length
      out.push(`| ${kind} | ${found.length} / ${want.length} | ${missed.join(', ') || '–'} | ${unexpected.join(', ') || '–'} |`)
    }
    out.push('')
  }

  const writesAfter = { jd: await rowCount('job_descriptions'), mr: await rowCount('match_results') }
  const readOnly = writesBefore.jd === writesAfter.jd && writesBefore.mr === writesAfter.mr
  summary.expected = tors.reduce((n, t) => n + t.expected_top.length, 0)
  const pct = (a: number, b: number) => `${Math.round((100 * a) / Math.max(1, b))}%`
  const summaryLine =
    `**Fixed requirements:** ${summary.fixed.top10}/${summary.expected} expected in top 10, ${summary.fixed.top5}/${summary.expected} in top 5, ` +
    `checks ${summary.fixed.passed}/${summary.fixed.checks}. ` +
    `**End to end:** ${summary.e2e.top10}/${summary.expected} in top 10, ${summary.e2e.top5}/${summary.expected} in top 5, ` +
    `checks ${summary.e2e.passed}/${summary.e2e.checks}. ` +
    `**Extraction recall:** ${summary.recallFound}/${summary.recallTotal} (${pct(summary.recallFound, summary.recallTotal)}). ` +
    `**Org History scopes:** ${summary.orgPassed}/${summary.orgChecks}. ` +
    `**Profile variants (tiers, language level):** ${summary.variantPassed}/${summary.variantChecks}. ` +
    `**Ties at the top:** ${summary.topTies.fixed}/${tors.length} ToRs (fixed), ${summary.topTies.e2e}/${tors.length} (end to end). ` +
    `**One Nice to have row:** moves a total by at most ${summary.singleNiceMax} points. ` +
    `**What-ifs:** ${summary.ablations.join('; ') || 'none'}.`

  const header = [
    '# Ranking baseline: placeholder engine',
    '',
    '<!-- GENERATED by `npm run baseline` (scripts/ranking-baseline.ts). Edit docs/samples/expectations.json, not this file. -->',
    '',
    `First baseline for Loop8. Five sample ToRs (\`docs/samples/tor-0*.txt\`) are scored against the live directory pool (${profiles.length} approved + active profiles) by the placeholder engine in \`src/lib/matching/\`. Expected top profiles, fixed requirement rows, expected extraction and deliberate test cases live in [\`expectations.json\`](expectations.json).`,
    '',
    '- **Fixed requirements (primary):** the exact rows a sensible manager would set for the ToR. Required rows pre-filter through `applyMustHaves`; nothing from extraction is added to the grid.',
    '- **End to end (secondary):** `extractRequirements` → Add all (every suggestion at Nice to have) → `scorePool`, no Required rows.',
    '- **Extraction:** suggestions vs. the terms a good extractor should find (recall), plus suggestions nobody asked for.',
    '- **Profile variants:** one profile scored as Core / Strong / Working on an item (higher tier must score higher), and with a Required language at Working (excluded by Fluent only).',
    '- In both runs, Fit reads the JD through the extraction (as `rankPool` does for a stored JD); only the grid rows differ.',
    '- Read-only: the harness only SELECTs and scores in memory. ' +
      `\`job_descriptions\` ${writesBefore.jd} → ${writesAfter.jd}, \`match_results\` ${writesBefore.mr} → ${writesAfter.mr} rows during this run${readOnly ? '' : ' ⚠ CHANGED (something else wrote during the run)'}.`,
    '',
    '## Summary',
    '',
    summaryLine,
    '',
    `Run ${new Date().toISOString().slice(0, 10)}. Availability-based scores depend on the run date only through availability rows, which these requirements don't use.`,
    '',
  ]
  header.push(
    '## Score distribution by role',
    '',
    'Totals across all five ToRs, for calibrating the band thresholds (`BAND_THRESHOLDS` in `config.ts`). ' +
      '**Expected**: `expected_top`. **Related**: profiles named by positive test cases (wrong location, untagged evidence, ' +
      'generalists, former staff, tie pairs). **Decoys**: profiles that should not reach the top 10. **Rest**: everyone else ' +
      'scored. "Filtered" = excluded by a Required row (not scored).',
    '',
    '| Run | Role | n | Min | P10 | Median | P90 | Max | Filtered | Bands now (strong/good/partial/weak) |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...(['fixed', 'e2e'] as const).flatMap((run) =>
      (['expected', 'related', 'decoy', 'rest'] as const).map((role) => {
        const xs = [...dist[run][role]].sort((a, b) => a - b)
        const q = (f: number) => (xs.length ? xs[Math.min(xs.length - 1, Math.floor(f * (xs.length - 1) + 0.5))] : '–')
        const bands = { strong: 0, good: 0, partial: 0, weak: 0 }
        for (const x of xs) bands[bandFor(x)]++
        return `| ${run === 'fixed' ? 'Fixed' : 'End to end'} | ${role} | ${xs.length} | ${q(0)} | ${q(0.1)} | ${q(0.5)} | ${q(0.9)} | ${q(1)} | ${dist[run].filtered[role]} | ${bands.strong}/${bands.good}/${bands.partial}/${bands.weak} |`
      }),
    ),
    '',
    'All totals, sorted (fixed requirements):',
    '',
    ...(['expected', 'related', 'decoy'] as const).map((role) => `- ${role}: ${[...dist.fixed[role]].sort((a, b) => b - a).join(', ')}`),
    `- rest, top 20: ${[...dist.fixed.rest].sort((a, b) => b - a).slice(0, 20).join(', ')}`,
    '',
    'All totals, sorted (end to end):',
    '',
    ...(['expected', 'related', 'decoy'] as const).map((role) => `- ${role}: ${[...dist.e2e[role]].sort((a, b) => b - a).join(', ')}`),
    `- rest, top 20: ${[...dist.e2e.rest].sort((a, b) => b - a).slice(0, 20).join(', ')}`,
    '',
  )
  if (missing.size) header.push(`⚠ Handles in expectations.json not found in the pool: ${[...missing].join(', ')}`, '')
  writeFileSync(join(samples, 'ranking-baseline.md'), [...header, ...out].join('\n'))
  console.log(summaryLine.replace(/\*\*/g, ''))
  console.log(`read-only: job_descriptions ${writesBefore.jd}→${writesAfter.jd}, match_results ${writesBefore.mr}→${writesAfter.mr}`)
  console.log('wrote docs/samples/ranking-baseline.md')

  function nameOf(handle: string): string {
    const p = byHandle.get(handle)
    return p ? `${p.name} (\`${handle}\`)` : `\`${handle}\` (missing)`
  }

  function judgeCheck(c: Check, r: Ranked): { pass: boolean; detail: string } {
    const a = r.rankOf.get(c.handle)
    const at = (m: MatchResult | undefined) => (m ? `#${m.rank} (${m.total_score}/${m.fit_score})` : 'filtered')
    switch (c.expect) {
      case 'top10':
        return { pass: !!a && a.rank <= 10, detail: at(a) }
      case 'not_top10':
        return { pass: !a || a.rank > 10, detail: at(a) }
      case 'above': {
        const b = r.rankOf.get(c.other!)
        return { pass: !!a && (!b || a.rank < b.rank), detail: `${at(a)} vs ${at(b)}` }
      }
      case 'adjacent_fresher_first': {
        const b = r.rankOf.get(c.other!)
        if (!a || !b) return { pass: false, detail: `${at(a)} vs ${at(b)}` }
        const tied = a.total_score === b.total_score && a.fit_score === b.fit_score
        return {
          pass: b.rank - a.rank === 1,
          detail: `${at(a)} vs ${at(b)}${tied ? ', tied on total and Fit' : ', not tied'}`,
        }
      }
      default:
        return { pass: false, detail: `unknown expectation ${c.expect}` }
    }
  }
}

/** How many share the top total, and tied adjacent pairs in the top 10. */
function tieStats(results: MatchResult[]): { atTop: number; pairsTop10: number } {
  const top = results[0]?.total_score
  const atTop = results.filter((r) => r.total_score === top).length
  let pairsTop10 = 0
  for (let i = 1; i < Math.min(10, results.length); i++)
    if (results[i].total_score === results[i - 1].total_score) pairsTop10++
  return { atTop, pairsTop10 }
}

function bandCounts(results: MatchResult[]): string {
  const n = { strong: 0, good: 0, partial: 0, weak: 0 }
  for (const r of results) n[r.band]++
  return `${n.strong} strong, ${n.good} good, ${n.partial} partial, ${n.weak} weak`
}

function describeRow(r: Requirement): string {
  const lvl = { slight: 'Nice', strong: 'Important', must: 'Required' }[r.level]
  const v = r.value as any
  const what =
    'name' in v
      ? v.name
      : 'values' in v
        ? v.values.join('/') + (v.min === 'fluent' ? ', fluent only' : '')
        : 'org' in v
          ? `${v.scope} at ${v.org}${v.peers?.length ? ` (+${v.peers.join(', ')})` : ''}`
          : r.kind
  return `${r.kind} ${what} (${lvl})`
}

void main()
