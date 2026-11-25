// Manual against AI comparison. Ranks every case with two rankers over the
// same pool and the same requirements, and reports one comparable measure:
//
// 1. Manual: the app's placeholder scorePool (src/lib/matching/score.ts),
//    exactly as the "fixed requirements" run of scripts/ranking-baseline.ts:
//    the same JD text, the same extraction (extractRequirements over the JD),
//    the expectations.json rows, Required rows applied first by applyMustHaves.
// 2. AI: the variant A semantic engine through runEngine, in memory, with the
//    scoring data taken from the same in-memory candidates and the same
//    extraction as the manual side (as the app passes the stored one).
//
// Two sets, ranked in separate runs. The customer ToR set ranks the listed demo
// seed profiles only, the baseline harness's pool. The Loop8 hard set ranks
// each ToR that has a hard case again, over the demo profiles plus every
// fixture, and each hard case is measured on that run.
//
// Output holds handles, ranks and scores only. No profile, fragment or JD text
// is ever printed or written.

import type { ExpertiseIndex } from '../../../../src/lib/expertise'
import { deriveOptions } from '../../../../src/lib/filters'
import { isListed } from '../../../../src/lib/listing'
import { extractRequirements } from '../../../../src/lib/matching/extract'
import type { CandidateInput } from '../../../../src/lib/matching/fit'
import { scorePool } from '../../../../src/lib/matching/score'
import type { ExtractedRequirements, ExtractionContext, Requirement } from '../../../../src/lib/matching/types'
import { normalizeOrgName } from '../../../../src/lib/organizations'
import type { OrgIndex } from '../../../../src/lib/organizations'
import { EMPTY_SEARCH } from '../../../../src/lib/requirements/model'
import { applyMustHaves } from '../../../../src/lib/requirements/mustHaves'
import type { AvailabilityTrack, PortfolioItem, TaxonomyCategory, TaxonomyItem } from '../../../../src/types/db'
import { runEngine } from '../core/run'
import { componentsCountOf } from '../core/settings'
import type { Engine, PhaseRecord, Settings } from '../core/types'
import type { ReferenceLists, ScoringData } from '../data/supabase'
import { createFakeEmbed, createFakeTextModel, FAKE_MODEL_VERSION, fakeVector } from '../engine/local-fakes'
import { createSemanticEngine } from '../engine/semantic'
import type { SemanticEngineOptions } from '../engine/semantic'
import { toFragments } from '../index/fragments'
import { demoKey, fromDemoSeed } from '../index/source'
import type { FragmentSource } from '../index/types'
import type { TextModel } from '../models/text-model'
import { loadIndexArtifact } from '../search/artifact'
import type { IndexArtifact, IndexFragment } from '../search/artifact'
import type { EmbedText } from '../search/cosine'
import type { QueryExclusions } from '../search/query'
import { demoUuid, toCandidateInput } from './hard-cases'
import type { HardFixture, HardProfile } from './hard-cases'

// ---- arguments ----------------------------------------------------------------

export type ModelsMode = 'fake' | 'live'

export interface CompareArgs {
  models: ModelsMode
  confirmLive: boolean
}

export function parseCompareArgs(argv: string[]): CompareArgs {
  const args: CompareArgs = { models: 'fake', confirmLive: false }
  for (const a of argv) {
    if (a === '--confirm-live') args.confirmLive = true
    else if (a.startsWith('--models=')) {
      const v = a.slice('--models='.length)
      if (v !== 'fake' && v !== 'live') throw new Error('invalid_models_value')
      args.models = v
    } else throw new Error('unknown_argument')
  }
  return args
}

// ---- inputs ---------------------------------------------------------------------

/** One ToR of docs/samples/expectations.json, the fields read here. */
export interface TorSpec {
  id: string
  file: string
  requirements: Requirement[]
  expected_top: { handle: string }[]
  checks: { type: string; handle: string; expect: string }[]
}

/** A demo seed profile as written in scripts/demo-seed/profiles/*.mjs. */
export type RawDemoProfile = Record<string, any>

const DAY = 86_400_000

/** The one date every profile date in the pool is taken from, so the placeholder's tie order
 *  (after total and Fit: availability_updated_at, then id) does not change with the day of the
 *  run. Demo profiles are dated `updated` days before it, as scripts/demo-seed/build.ts dates them
 *  before its own run date; every fixture is dated on it. It is the run date of
 *  docs/samples/ranking-baseline.md. */
export const REFERENCE_DATE = new Date('2026-11-18T00:00:00.000Z')

/** The availability the seed build stores, as availability() in scripts/demo-seed/build.ts. */
function availability(t: unknown, now: Date): AvailabilityTrack {
  if (!Array.isArray(t)) return t as AvailabilityTrack
  const [status, a, b] = t as [string, number?, number?]
  const date = (n: number) => new Date(now.getTime() + n * DAY).toISOString().slice(0, 10)
  if (status === 'off') return { status: 'unavailable', from: null, until: null }
  if (status === 'now') return { status: 'available_now', from: null, until: a == null ? null : date(a) }
  return { status: 'available_from', from: date(a as number), until: b == null ? null : date(b) }
}

const slugify = (s: string) => normalizeOrgName(s).replace(/ /g, '-').slice(0, 40)

/** A demo seed profile in the object shape toCandidateInput reads: the handle and id
 *  the seed build gives it, and its tuple entries expanded field by field as
 *  scripts/demo-seed/build.ts lines 113 to 192 do. */
export function normalizeDemoProfile(p: RawDemoProfile, now: Date): HardProfile {
  const handle: string = p.handle ?? `demo-${p.slug}`
  const id: string = p.id ?? demoUuid(handle)
  const tuple = Array.isArray
  return {
    ...p,
    handle,
    id,
    pt: availability(p.pt, now),
    ft: availability(p.ft, now),
    updatedAt: p.updatedAt ?? new Date(now.getTime() - p.updated * DAY).toISOString(),
    history: (p.history ?? []).map((h: any) =>
      tuple(h)
        ? { id: demoUuid(`${handle}:work:${h[0]}:${h[1]}:${h[2]}`), organization: h[0], role: h[1], start_year: h[2], end_year: h[3], logo_url: null, description: h[4] }
        : h,
    ),
    education: (p.education ?? []).map((e: any) =>
      tuple(e)
        ? { id: demoUuid(`${handle}:edu:${e[0]}:${e[1]}`), institution: e[0], degree_or_course: e[1], start_year: e[2], end_year: e[3], logo_url: null }
        : e,
    ),
    accreditations: (p.accreditations ?? []).map((a: any) =>
      tuple(a)
        ? { id: demoUuid(`${handle}:cert:${a[0]}:${a[1]}`), name: a[0], issuing_organization: a[1], year: a[2], credential_id_or_url: a[3] ?? null }
        : a,
    ),
    additional: (p.additional ?? []).map((a: any) =>
      tuple(a) ? { organization: a[0], role: a[1], start_year: a[2], end_year: a[3], description: a[4] } : a,
    ),
    portfolio: (p.portfolio ?? []).map((it: any) => ({
      ...it,
      images: (it.images ?? []).map((im: any, k: number) =>
        typeof im === 'string' ? { url: `https://picsum.photos/seed/${handle}-${slugify(it.name)}-${k + 1}/900/600`, caption: im } : im,
      ),
      links: (it.links ?? []).map((l: any) => (tuple(l) ? { label: l[0], url: l[1] } : l)),
    })),
    tiers: p.tiers ?? {},
    languages: p.languages ?? [],
  } as HardProfile
}

/** The taxonomy rows that build the given index again (buildExpertiseIndex reads
 *  only these fields), so the extraction can run on what the reader returns. */
export function taxonomyFromIndex(index: ExpertiseIndex): { categories: TaxonomyCategory[]; items: TaxonomyItem[] } {
  const categories: TaxonomyCategory[] = index.groups.map((g, i) => ({ id: g.label, type: 'expertise', name: g.label, sort_order: i + 1 }))
  const items: TaxonomyItem[] = index.items.map((it, i) => ({
    id: `${it.group}#${it.name}`,
    category_id: it.group,
    name: it.name,
    sort_order: i + 1,
    kind: it.kind,
    aliases: it.aliases,
    legacy_names: it.legacyNames,
  }))
  return { categories, items }
}

// ---- pool -----------------------------------------------------------------------

export interface PoolEntry {
  handle: string
  candidate: CandidateInput
  source: FragmentSource
  /** The key the prebuilt index artifact uses for a demo profile (its id, or its slug). */
  artifactKey: string | null
  fixture: boolean
}

export interface Pool {
  entries: PoolEntry[]
  demoCount: number
  fixtureCount: number
}

/** The listed demo profiles (the app's listing rule, as the baseline harness) plus every fixture,
 *  all dated from `ref`. Callers that rank the customer ToR set take the demo entries only. */
export function buildPool(demo: RawDemoProfile[], fixtures: HardFixture[], ref: Date = REFERENCE_DATE): Pool {
  const demoEntries: PoolEntry[] = []
  for (const raw of demo) {
    const p = normalizeDemoProfile(raw, ref)
    const candidate = toCandidateInput(p)
    // Overrides the seed build never sets, kept so the listing rule sees them.
    for (const k of ['approval_status', 'subscription_status', 'consultant_type'] as const) {
      if (typeof raw[k] === 'string') (candidate.profile as any)[k] = raw[k]
    }
    if (!isListed(candidate.profile)) continue
    demoEntries.push({ handle: p.handle, candidate, source: fromDemoSeed(p), artifactKey: demoKey(raw), fixture: false })
  }
  const at = ref.toISOString()
  const fixtureEntries: PoolEntry[] = fixtures
    .filter((f) => isListed(f.candidate.profile))
    .map((f) => ({
      handle: f.hardCase.handle,
      // The fixture file's own date is replaced, so its tie order follows the reference date too.
      candidate: { ...f.candidate, profile: { ...f.candidate.profile, availability_updated_at: at, created_at: at, updated_at: at } },
      source: f.source,
      artifactKey: null,
      fixture: true,
    }))
  return { entries: [...demoEntries, ...fixtureEntries], demoCount: demoEntries.length, fixtureCount: fixtureEntries.length }
}

/** The pool of the customer ToR set: the demo profiles only. */
export function demoOnly(pool: Pool): Pool {
  return { entries: pool.entries.filter((e) => !e.fixture), demoCount: pool.demoCount, fixtureCount: 0 }
}

// ---- cases ----------------------------------------------------------------------

export type Role = 'expected' | 'decoy'

export interface CaseTarget {
  handle: string
  role: Role
}

export interface CompareCase {
  id: string
  tor: string
  kind: 'tor' | 'hard'
  targets: CaseTarget[]
  checkType?: string
}

/** A ToR case measures its expected_top handles and its not_top10 checks (the
 *  decoys); a hard case measures its fixture on its ToR's ranking. */
export function buildCases(tors: TorSpec[], fixtures: HardFixture[]): CompareCase[] {
  const known = new Set(tors.map((t) => t.id))
  const torCases: CompareCase[] = tors.map((t) => ({
    id: t.id,
    tor: t.id,
    kind: 'tor',
    targets: [
      ...t.expected_top.map((e) => ({ handle: e.handle, role: 'expected' as const })),
      ...t.checks.filter((c) => c.expect === 'not_top10').map((c) => ({ handle: c.handle, role: 'decoy' as const })),
    ],
  }))
  const hardCases: CompareCase[] = fixtures.map(({ hardCase: h }) => {
    if (!known.has(h.tor)) throw new Error(`hard_case_unknown_tor: ${h.id}`)
    return {
      id: h.id,
      tor: h.tor,
      kind: 'hard',
      checkType: h.checkType,
      targets: [{ handle: h.handle, role: h.expect === 'top10' ? 'expected' : 'decoy' }],
    }
  })
  return [...torCases, ...hardCases]
}

// ---- metrics --------------------------------------------------------------------

export interface RankedRow {
  profile_id: string
  rank: number
  total_score: number
  fit_score: number
}

/** What happened to a target in one ranker's run. Only `ranked` can be a hit. */
export type TargetStatus = 'ranked' | 'filtered' | 'fallback' | 'not_in_pool'

export interface TargetMeasure extends CaseTarget {
  status: TargetStatus
  /** Null unless the status is ranked. */
  rank: number | null
  total: number | null
  fit: number | null
  top5: boolean
  top10: boolean
  /** Expected: ranked in the top 10. Decoy: ranked outside the top 10, or filtered by a Required
   *  row. A fallback or a handle not in the pool never passes. */
  passed: boolean
}

/** One ranker's output for one ToR, with the pool it was given. */
export interface RunSide {
  output: RankOutput
  /** Ids that passed the Required rows (the ranker's input). */
  survivorIds: ReadonlySet<string>
}

export function measureTargets(
  side: RunSide,
  idOf: (handle: string) => string | undefined,
  targets: CaseTarget[],
): TargetMeasure[] {
  const byId = new Map(side.output.rows.map((r) => [r.profile_id, r]))
  return targets.map((t) => {
    const id = idOf(t.handle)
    const r = id === undefined ? undefined : byId.get(id)
    // A survivor with no result row is unscored, whether or not the ranker reported it as a fallback.
    const status: TargetStatus =
      id === undefined ? 'not_in_pool' : r ? 'ranked' : !side.survivorIds.has(id) ? 'filtered' : 'fallback'
    const rank = r ? r.rank : null
    const top5 = rank !== null && rank <= 5
    const top10 = rank !== null && rank <= 10
    return {
      ...t,
      status,
      rank,
      total: r ? r.total_score : null,
      fit: r ? r.fit_score : null,
      top5,
      top10,
      passed: t.role === 'expected' ? top10 : (status === 'ranked' && !top10) || status === 'filtered',
    }
  })
}

/** Mean of 1/rank, with 0 for a handle that was not ranked. */
export function meanReciprocalRank(ranks: (number | null)[]): number {
  if (ranks.length === 0) return 0
  return ranks.reduce<number>((s, r) => s + (r === null ? 0 : 1 / r), 0) / ranks.length
}

/** Tied adjacent pairs (same total) in the top 10, counted as the baseline harness's tieStats does.
 *  Rows are in rank order. */
export function tiedPairsTop10(rows: RankedRow[]): number {
  let pairs = 0
  for (let i = 1; i < Math.min(10, rows.length); i++) if (rows[i].total_score === rows[i - 1].total_score) pairs++
  return pairs
}

// ---- rankers --------------------------------------------------------------------

export interface RankInput {
  torId: string
  rawText: string
  extracted: ExtractedRequirements | null
  requirements: Requirement[]
  /** The pool after the Required rows; identical for both rankers. */
  survivors: CandidateInput[]
  expertise: ExpertiseIndex
  orgs: OrgIndex
}

export interface RankOutput {
  rows: RankedRow[]
  /** Profile ids the ranker could not score (the engine's fallbacks). */
  fallbackIds: string[]
  /** The engine's fit phase record. Absent on the manual side and when the engine made no Fit call. */
  fit?: PhaseRecord
  /** The engine's components phase record. Absent on the manual side and when the engine made no components call. */
  components?: PhaseRecord
}

export type Ranker = (input: RankInput) => Promise<RankOutput>

const rowOf = (r: RankedRow): RankedRow => ({ profile_id: r.profile_id, rank: r.rank, total_score: r.total_score, fit_score: r.fit_score })

/** The placeholder engine, as the baseline harness scores the fixed requirements run. */
export function manualRanker(): Ranker {
  return async ({ rawText, extracted, requirements, survivors, expertise, orgs }) => ({
    rows: scorePool({ rawText, extracted, requirements, candidates: survivors, expertise, orgs }).map(rowOf),
    fallbackIds: [],
  })
}

export interface AiRankerOptions {
  artifact: IndexArtifact
  embed: EmbedText
  textModel: TextModel
  settings: Settings
  exclude: QueryExclusions
  embedModelId?: string
  /** Builds the engine; tests wrap it to observe the options. */
  createEngine?: (opts: SemanticEngineOptions) => Engine
}

/** The variant A semantic engine in memory. Scoring data comes from the same
 *  candidates as the manual side, and the extraction is the one the manual side
 *  uses for this ToR, so its location and language values reach the query
 *  exclusions as the stored extraction does in the app. Nothing is read from
 *  Supabase per job. */
export function aiRanker(o: AiRankerOptions): Ranker {
  const create = o.createEngine ?? createSemanticEngine
  return async ({ torId, rawText, extracted, requirements, survivors, expertise, orgs }) => {
    const byId = new Map(survivors.map((c) => [c.profile.id, c]))
    const scoringData = async (ids: string[]): Promise<ScoringData> => ({
      candidates: ids.flatMap((id) => (byId.has(id) ? [byId.get(id) as CandidateInput] : [])),
      expertise,
      orgs,
      missing: ids.filter((id) => !byId.has(id)),
    })
    const engine = create({
      artifact: o.artifact,
      embed: o.embed,
      exclude: o.exclude,
      textModel: o.textModel,
      scoringData,
      extraction: async () => ({ extracted, hiringOrganization: null }),
      embedModelId: o.embedModelId,
      fitModelId: o.settings.fitModel,
      textModelId: o.settings.textModel,
    })
    const out = await runEngine(
      { jobId: `compare-${torId}`, jobDescriptionId: `compare-${torId}`, requirements, poolIds: [...byId.keys()], jdText: rawText },
      engine,
      { settings: o.settings, existing: [], saveCheckpoint: async () => {}, saveFallback: async () => {} },
    )
    // A phase record is kept only when the engine made at least one call in that phase.
    const made = (phase: CallPhase) => {
      const r = out.record.find((x) => x.phase === phase)
      return r && (r.calls ?? 0) > 0 ? { [phase]: r } : {}
    }
    return {
      rows: out.results.map(rowOf),
      fallbackIds: [...new Set(out.fallbacks.map((f) => f.profileId))],
      ...made('fit'),
      ...made('components'),
    }
  }
}

export interface RankingContext {
  expertise: ExpertiseIndex
  orgs: OrgIndex
  extractionContext: ExtractionContext
}

export interface TorRun {
  /** The set this run belongs to: the customer ToR set (demo profiles only) or the hard set (plus the fixtures). */
  set: CompareCase['kind']
  tor: string
  /** Pool size after the Required rows. */
  pool: number
  survivorIds: ReadonlySet<string>
  manual: RankOutput
  ai: RankOutput
}

/** Each ToR once per ranker over the given pool. Must haves are applied once, so both rankers get
 *  the same survivors and the same extraction. */
export async function runRankings(
  tors: { tor: TorSpec; rawText: string }[],
  pool: Pool,
  ctx: RankingContext,
  rankers: { manual: Ranker; ai: Ranker },
  set: CompareCase['kind'] = 'tor',
): Promise<TorRun[]> {
  const profiles = pool.entries.map((e) => e.candidate.profile)
  const portfolioBy = new Map<string, PortfolioItem[]>(pool.entries.map((e) => [e.candidate.profile.id, e.candidate.portfolio]))
  const byId = new Map(pool.entries.map((e) => [e.candidate.profile.id, e.candidate]))
  const runs: TorRun[] = []
  for (const { tor, rawText } of tors) {
    // As the baseline harness: Fit reads the JD through the extraction.
    const extracted = await extractRequirements(rawText, ctx.extractionContext)
    const kept = applyMustHaves(profiles, portfolioBy, tor.requirements, EMPTY_SEARCH, ctx.expertise, ctx.orgs)
    const survivors = kept.map((p) => byId.get(p.id) as CandidateInput)
    const input: RankInput = {
      torId: tor.id, rawText, extracted, requirements: tor.requirements, survivors, expertise: ctx.expertise, orgs: ctx.orgs,
    }
    const manual = await rankers.manual(input)
    const ai = await rankers.ai({ ...input, survivors: [...survivors] })
    runs.push({ set, tor: tor.id, pool: survivors.length, survivorIds: new Set(survivors.map((c) => c.profile.id)), manual, ai })
  }
  return runs
}

// ---- the command ------------------------------------------------------------------

export interface LiveDeps {
  embed: EmbedText
  embedModelId: string
  /** The vector length the embedder returns. */
  embedDimensions: number
  textModel: TextModel
  /** The prebuilt artifact for the demo profiles, or null when it does not exist. */
  readArtifact(): string | null
}

export interface CompareInputs {
  tors: TorSpec[]
  /** The JD text of a ToR file. Never printed. */
  readJd(file: string): string
  demoProfiles: RawDemoProfile[]
  fixtures: HardFixture[]
  /** Read only: taxonomy and organizations (getScoringData with no ids reads no profile row) and the
   *  reference lists for the query exclusions. */
  reader: { getScoringData(ids: string[]): Promise<ScoringData>; getReferenceLists(): Promise<ReferenceLists> }
  models: ModelsMode
  confirmLive: boolean
  live?: () => Promise<LiveDeps>
  settings: Settings
  now: Date
  /** The text of docs/samples/ranking-baseline.md, when it could be read. Only its summary counts are read. */
  baselineMarkdown?: string
  print(line: string): void
  /** Warnings (stderr in the runner). Handles only. */
  warn(line: string): void
}

export interface RankerSummary {
  hits5: number
  hits10: number
  expectedTotal: number
  decoysPassed: number
  decoysTotal: number
  mrr: number
  /** Targets that were not ranked, by status. */
  notRanked: Record<Exclude<TargetStatus, 'ranked'>, number>
}

export interface CaseResult {
  case: CompareCase
  manual: TargetMeasure[]
  ai: TargetMeasure[]
}

/** The placeholder's result on a hard case. Only a ranked fixture can pass or fail; otherwise its status. */
export type PlaceholderResult = 'fails' | 'passes' | Exclude<TargetStatus, 'ranked'>

export interface HardResult {
  id: string
  tor: string
  handle: string
  checkType: string
  role: Role
  manual: TargetMeasure
  ai: TargetMeasure
  placeholder: PlaceholderResult
}

/** One set's summary per ranker. The two sets are never combined. */
export interface SetSummary {
  manual: RankerSummary
  ai: RankerSummary
}

export interface CompareReport {
  models: ModelsMode
  /** REFERENCE_DATE, the date every profile date in the pool is taken from. */
  referenceDate: string
  /** Whether the manual side reproduces ranking-baseline.md's fixed requirements counts. */
  baselineCheck: string
  modelIds: Record<string, string>
  poolDemo: number
  poolFixtures: number
  runs: TorRun[]
  cases: CaseResult[]
  hard: HardResult[]
  /** tor: the customer's ToR set (primary). hard: the Loop8 hard set. */
  summary: { tor: SetSummary; hard: SetSummary }
  /** The AI side's fit and components phase records summed per set; null when no run of the set has one. */
  fitCalls: { tor: PhaseTotals | null; hard: PhaseTotals | null }
  componentsCalls: { tor: PhaseTotals | null; hard: PhaseTotals | null }
}

/** The engine phases whose call records the report sums. */
export type CallPhase = 'fit' | 'components'

/** One set's records of one phase, summed. Counts only, never model text. */
export interface PhaseTotals {
  /** Runs of the set that carry a record of the phase. */
  runs: number
  calls: number
  tokensIn: number
  tokensOut: number
  fallbacks: number
  skipped: number
  componentsMissing: number
  componentMismatch: number
}

const FAKE_DIMENSIONS = 1024

function fakeArtifact(pool: Pool): IndexArtifact {
  const fragments: IndexFragment[] = pool.entries.flatMap((e) =>
    toFragments(e.source).map((f) => ({
      fragmentId: f.fragmentId, profileId: f.profileId, type: f.type, text: f.text, vector: fakeVector(f.text, FAKE_DIMENSIONS),
    })),
  )
  return { modelVersion: FAKE_MODEL_VERSION, indexVersion: 'compare-fake', dimensions: FAKE_DIMENSIONS, fragments }
}

/** Loads the prebuilt artifact and checks it against the embedder, before any call is made. */
function loadLiveBase(raw: string, deps: LiveDeps): IndexArtifact {
  let base: IndexArtifact
  try {
    base = loadIndexArtifact(raw)
  } catch {
    // The validation message can quote the file, so only the code is kept.
    throw new Error('index_artifact_invalid')
  }
  if (base.modelVersion !== deps.embedModelId) throw new Error('embedding_model_mismatch')
  if (base.dimensions !== deps.embedDimensions) throw new Error('embedding_dimension_mismatch')
  return base
}

/** The prebuilt artifact with its demo profile keys mapped to the pool ids, plus the fixtures embedded now. */
async function liveArtifact(base: IndexArtifact, pool: Pool, embed: EmbedText): Promise<IndexArtifact> {
  const idOfKey = new Map(pool.entries.flatMap((e) => (e.artifactKey ? [[e.artifactKey, e.candidate.profile.id] as const] : [])))
  const demo = base.fragments.flatMap((f) => {
    const id = idOfKey.get(f.profileId)
    return id ? [{ ...f, profileId: id }] : []
  })
  const fixtures: IndexFragment[] = []
  for (const e of pool.entries.filter((x) => x.fixture)) {
    for (const f of toFragments(e.source)) {
      const vector = await embed(f.text)
      if (vector.length !== base.dimensions) throw new Error('embedding_dimension_mismatch')
      fixtures.push({ fragmentId: f.fragmentId, profileId: f.profileId, type: f.type, text: f.text, vector })
    }
  }
  return { ...base, fragments: [...demo, ...fixtures] }
}

export function summarize(measures: TargetMeasure[]): RankerSummary {
  const expected = measures.filter((m) => m.role === 'expected')
  const decoys = measures.filter((m) => m.role === 'decoy')
  const count = (s: TargetStatus) => measures.filter((m) => m.status === s).length
  return {
    hits5: expected.filter((m) => m.top5).length,
    hits10: expected.filter((m) => m.top10).length,
    expectedTotal: expected.length,
    decoysPassed: decoys.filter((m) => m.passed).length,
    decoysTotal: decoys.length,
    mrr: meanReciprocalRank(expected.map((m) => m.rank)),
    notRanked: { filtered: count('filtered'), fallback: count('fallback'), not_in_pool: count('not_in_pool') },
  }
}

function setSummary(cases: CaseResult[], kind: CompareCase['kind']): SetSummary {
  const of = cases.filter((c) => c.case.kind === kind)
  return { manual: summarize(of.flatMap((c) => c.manual)), ai: summarize(of.flatMap((c) => c.ai)) }
}

/** The records of one phase over one set's AI runs summed, or null when none of them has one. */
export function phaseTotals(runs: TorRun[], set: CompareCase['kind'], phase: CallPhase): PhaseTotals | null {
  const recs = runs.filter((r) => r.set === set).flatMap((r) => {
    const x = r.ai[phase]
    return x ? [x] : []
  })
  if (recs.length === 0) return null
  const sum = (k: Exclude<keyof PhaseTotals, 'runs'>) => recs.reduce((n, f) => n + (f[k] ?? 0), 0)
  return {
    runs: recs.length,
    calls: sum('calls'),
    tokensIn: sum('tokensIn'),
    tokensOut: sum('tokensOut'),
    fallbacks: sum('fallbacks'),
    skipped: sum('skipped'),
    componentsMissing: sum('componentsMissing'),
    componentMismatch: sum('componentMismatch'),
  }
}

// ---- the baseline check ---------------------------------------------------------------

export interface Count {
  hits: number
  total: number
}

/** The fixed requirements top 5 and top 10 counts from the summary line of
 *  docs/samples/ranking-baseline.md, or null when the line is not there. */
export function parseBaselineFixed(markdown: string): { top5: Count; top10: Count } | null {
  const m = markdown.match(/\*\*Fixed requirements:\*\* (\d+)\/(\d+) expected in top 10, (\d+)\/(\d+) in top 5/)
  if (!m) return null
  const n = m.slice(1).map(Number)
  return { top5: { hits: n[2], total: n[3] }, top10: { hits: n[0], total: n[1] } }
}

/** One line: whether the manual side's customer ToR counts equal the baseline's fixed requirements counts. */
export function baselineCheckLine(manual: RankerSummary, baselineMarkdown: string | undefined): string {
  const head = 'Manual side against ranking-baseline.md fixed requirements'
  const parsed = baselineMarkdown === undefined ? null : parseBaselineFixed(baselineMarkdown)
  if (!parsed) return `${head}: not checked (the baseline summary line could not be read)`
  const ours = `top 5 ${manual.hits5}/${manual.expectedTotal}, top 10 ${manual.hits10}/${manual.expectedTotal}`
  const theirs = `top 5 ${parsed.top5.hits}/${parsed.top5.total}, top 10 ${parsed.top10.hits}/${parsed.top10.total}`
  const same =
    manual.hits5 === parsed.top5.hits && manual.hits10 === parsed.top10.hits &&
    manual.expectedTotal === parsed.top5.total && manual.expectedTotal === parsed.top10.total
  return `${head}: ${ours} here, ${theirs} in the baseline: ${same ? 'match' : 'mismatch'}`
}

// ---- the live plan ----------------------------------------------------------------------

/** The ToRs ranked again for the hard set: those that have a hard case, in ToR order. */
function hardTorsOf<T>(tors: T[], idOf: (t: T) => string, cases: CompareCase[]): T[] {
  const ids = new Set(cases.filter((c) => c.kind === 'hard').map((c) => c.tor))
  return tors.filter((t) => ids.has(idOf(t)))
}

interface PlanCounts {
  fixtureFragments: number
  queries: number
  embeds: number
  textCalls: number
  componentsCalls: number
}

/** Planned live calls, counted from the inputs alone. The text call count is an upper bound and
 *  excludes throttling retries. */
function livePlanCounts(pool: Pool, torCount: number, hardTorCount: number, settings: Settings): PlanCounts {
  const fixtureFragments = pool.entries.filter((e) => e.fixture).reduce((n, e) => n + toFragments(e.source).length, 0)
  const queries = torCount + hardTorCount
  const judged = { tor: Math.min(settings.fitCap, pool.demoCount), hard: Math.min(settings.fitCap, pool.entries.length) }
  // The components call goes only to judged candidates, up to COMPONENTS_COUNT in each run.
  const perRun = componentsCountOf(settings.componentsCount)
  const componentsCalls = torCount * Math.min(perRun, judged.tor) + hardTorCount * Math.min(perRun, judged.hard)
  const textCalls =
    torCount * (judged.tor + settings.summaryCount) + hardTorCount * (judged.hard + settings.summaryCount) + componentsCalls
  return { fixtureFragments, queries, embeds: fixtureFragments + queries, textCalls, componentsCalls }
}

function planText(c: PlanCounts, torCount: number, hardTorCount: number, settings: Settings): string {
  return (
    `${c.embeds} embed calls (${c.fixtureFragments} fixture fragments, ${c.queries} queries), ` +
    `at most ${c.textCalls} text model calls before retries, ${c.componentsCalls} of them components calls ` +
    `(${torCount} customer ToR runs and ${hardTorCount} hard set runs, ` +
    `up to ${settings.fitCap} Fit, ${componentsCountOf(settings.componentsCount)} components and ${settings.summaryCount} summaries each; throttling retries are not counted)`
  )
}

/** Live mode without --confirm-live: prints the planned call counts and nothing else. Reads no
 *  database, artifact or model and builds no client. */
export function printLivePlan(inputs: Pick<CompareInputs, 'tors' | 'demoProfiles' | 'fixtures' | 'settings' | 'print'>): void {
  const pool = buildPool(inputs.demoProfiles, inputs.fixtures)
  const hardTors = hardTorsOf(inputs.tors, (t) => t.id, buildCases(inputs.tors, inputs.fixtures))
  const counts = livePlanCounts(pool, inputs.tors.length, hardTors.length, inputs.settings)
  inputs.print(
    `Live mode plan, no call made: ${planText(counts, inputs.tors.length, hardTors.length, inputs.settings)}. ` +
      'Run again with --confirm-live to make these calls, which the customer pays for.',
  )
}

export async function runCompare(inputs: CompareInputs): Promise<{ markdown: string; report: CompareReport }> {
  const { settings, print } = inputs
  const live = inputs.models === 'live'
  // Refused before any read, so a live run never starts by accident (the runner prints the plan instead).
  if (live && !inputs.confirmLive) throw new Error('live_requires_confirm')
  if (live && !inputs.live) throw new Error('live_deps_missing')

  const [scoring, lists] = await Promise.all([inputs.reader.getScoringData([]), inputs.reader.getReferenceLists()])
  const { expertise, orgs } = scoring
  // Dated from REFERENCE_DATE, not inputs.now, so tie order is the same on every day.
  const pool = buildPool(inputs.demoProfiles, inputs.fixtures)
  const torPool = demoOnly(pool)
  // Extraction options from the demo profiles only, so the extraction is the one the baseline harness
  // computes over the directory (the fixtures add no location or language option).
  const options = deriveOptions(torPool.entries.map((e) => e.candidate.profile))
  const extractionContext: ExtractionContext = {
    taxonomy: taxonomyFromIndex(expertise),
    locationOptions: options.locations.flatMap((g) => [g.label, ...g.items]),
    languageOptions: options.languages,
  }
  const exclude: QueryExclusions = { orgNames: lists.organizations, languages: lists.languages }
  const cases = buildCases(inputs.tors, inputs.fixtures)
  const tors = inputs.tors.map((tor) => ({ tor, rawText: inputs.readJd(tor.file) }))
  const hardTors = hardTorsOf(tors, (t) => t.tor.id, cases)
  // Each set looks handles up in its own pool, so a ToR case can never find a fixture.
  const idsOf = (p: Pool) => new Map(p.entries.map((e) => [e.handle, e.candidate.profile.id]))
  const idByHandle = { tor: idsOf(torPool), hard: idsOf(pool) }
  // As the harness: a handle the cases name but its set's pool lacks is reported, not silently missed.
  const missing = [...new Set(cases.flatMap((c) => c.targets.filter((t) => !idByHandle[c.kind].has(t.handle)).map((t) => t.handle)))]
  for (const h of missing) inputs.warn(`Handle not in the pool: ${h}`)

  let ai: Ranker
  let modelIds: Record<string, string>
  if (!live) {
    ai = aiRanker({ artifact: fakeArtifact(pool), embed: createFakeEmbed(FAKE_DIMENSIONS), textModel: createFakeTextModel(), settings, exclude })
    modelIds = { embed: FAKE_MODEL_VERSION, fit: 'fake', text: 'fake' }
  } else {
    const deps = await (inputs.live as () => Promise<LiveDeps>)()
    const raw = deps.readArtifact()
    if (raw === null) throw new Error('index_artifact_missing')
    // Checked before the plan and before any paid call.
    const base = loadLiveBase(raw, deps)
    const counts = livePlanCounts(pool, tors.length, hardTors.length, settings)
    print(
      `Live mode, planned before any call: ${planText(counts, tors.length, hardTors.length, settings)}, ` +
        `fit model ${settings.fitModel}, text model ${settings.textModel}, embed model ${deps.embedModelId}.`,
    )
    const artifact = await liveArtifact(base, pool, deps.embed)
    ai = aiRanker({ artifact, embed: deps.embed, textModel: deps.textModel, settings, exclude, embedModelId: deps.embedModelId })
    modelIds = { embed: deps.embedModelId, fit: settings.fitModel, text: settings.textModel }
  }

  // Two separate runs: the customer ToR set over the demo profiles only, then the ToRs with a hard
  // case over the demo profiles plus the fixtures. One artifact serves both, as the engine searches
  // only the pool ids it is given.
  const ctx: RankingContext = { expertise, orgs, extractionContext }
  const rankers = { manual: manualRanker(), ai }
  const runs = [
    ...(await runRankings(tors, torPool, ctx, rankers, 'tor')),
    ...(await runRankings(hardTors, pool, ctx, rankers, 'hard')),
  ]
  const runOf = new Map(runs.map((r) => [`${r.set}:${r.tor}`, r]))
  const results: CaseResult[] = cases.map((c) => {
    const run = runOf.get(`${c.kind}:${c.tor}`) as TorRun
    const idOf = (h: string) => idByHandle[c.kind].get(h)
    return {
      case: c,
      manual: measureTargets({ output: run.manual, survivorIds: run.survivorIds }, idOf, c.targets),
      ai: measureTargets({ output: run.ai, survivorIds: run.survivorIds }, idOf, c.targets),
    }
  })
  const hard: HardResult[] = results
    .filter((r) => r.case.kind === 'hard')
    .map((r) => {
      const m = r.manual[0]
      return {
        id: r.case.id,
        tor: r.case.tor,
        handle: r.case.targets[0].handle,
        checkType: r.case.checkType ?? '',
        role: r.case.targets[0].role,
        manual: m,
        ai: r.ai[0],
        placeholder: m.status === 'ranked' ? (m.passed ? 'passes' : 'fails') : m.status,
      }
    })
  const summary = { tor: setSummary(results, 'tor'), hard: setSummary(results, 'hard') }
  const baselineCheck = baselineCheckLine(summary.tor.manual, inputs.baselineMarkdown)
  print(baselineCheck)
  const report: CompareReport = {
    models: inputs.models,
    referenceDate: REFERENCE_DATE.toISOString(),
    baselineCheck,
    modelIds,
    poolDemo: pool.demoCount,
    poolFixtures: pool.fixtureCount,
    runs,
    cases: results,
    hard,
    summary,
    fitCalls: { tor: phaseTotals(runs, 'tor', 'fit'), hard: phaseTotals(runs, 'hard', 'fit') },
    componentsCalls: { tor: phaseTotals(runs, 'tor', 'components'), hard: phaseTotals(runs, 'hard', 'components') },
  }
  return { markdown: renderMarkdown(report, inputs.now), report }
}

// ---- output -----------------------------------------------------------------------

const yes = (b: boolean) => (b ? 'yes' : 'no')

/** The rank, or the status when the target was not ranked. */
const at = (m: TargetMeasure) => (m.status === 'ranked' ? `#${m.rank}` : m.status)
const scores = (m: TargetMeasure) => (m.status === 'ranked' ? `${m.total}/${m.fit}` : '')

function summaryTable(s: SetSummary, models: ModelsMode): string[] {
  const { manual: m, ai: a } = s
  const nr = (x: RankerSummary) => `${x.notRanked.filtered} filtered, ${x.notRanked.fallback} fallback, ${x.notRanked.not_in_pool} not in pool`
  return [
    `| Measure | Manual (placeholder) | AI (variant A, ${models}) |`,
    '|---|---|---|',
    `| Expected handles in top 5 | ${m.hits5}/${m.expectedTotal} | ${a.hits5}/${a.expectedTotal} |`,
    `| Expected handles in top 10 | ${m.hits10}/${m.expectedTotal} | ${a.hits10}/${a.expectedTotal} |`,
    `| Decoys outside top 10 (ranked lower, or filtered) | ${m.decoysPassed}/${m.decoysTotal} | ${a.decoysPassed}/${a.decoysTotal} |`,
    `| Mean reciprocal rank (expected) | ${m.mrr.toFixed(3)} | ${a.mrr.toFixed(3)} |`,
    `| Targets not ranked | ${nr(m)} | ${nr(a)} |`,
  ]
}

/** Handles, ranks and scores only. */
export function renderMarkdown(r: CompareReport, now: Date): string {
  const out: string[] = [
    '# Manual against AI ranking comparison',
    '',
    `Run ${now.toISOString()}. Models: ${r.models}` +
      (r.models === 'fake'
        ? ' (deterministic fakes: the AI column proves the plumbing only and says nothing about ranking quality).'
        : ` (embed ${r.modelIds.embed}, fit ${r.modelIds.fit}, text ${r.modelIds.text}).`),
    `Pools: the customer ToR set ranks the ${r.poolDemo} listed demo profiles only; the hard set ranks its ToRs again in a separate run ` +
      `over those profiles plus the ${r.poolFixtures} hard-case fixtures. Profile dates are fixed at ${r.referenceDate.slice(0, 10)}. ` +
      'Manual is the placeholder scorePool as the baseline fixed requirements run; AI is the variant A semantic engine, given the same extraction.',
    'Only a ranked result counts as a hit. A decoy passes when it is ranked outside the top 10 or filtered by a Required row; ' +
      'a fallback or a handle not in the pool never passes. The two sets below are reported separately.',
    '',
    '## Primary measure: customer ToR set',
    '',
    'The five ToRs of docs/samples/expectations.json: their expected handles and their decoy checks.',
    '',
    ...summaryTable(r.summary.tor, r.models),
    '',
    `${r.baselineCheck}`,
    '',
    '## Loop8 hard set',
    '',
    'The Loop8 fixtures in samples/hard-cases, built to defeat keyword matching. Not a customer measure.',
    '',
    ...summaryTable(r.summary.hard, r.models),
    '',
    '| Case | ToR | Handle | Check | Expect | Manual | Placeholder | AI | AI passes |',
    '|---|---|---|---|---|---|---|---|---|',
    ...r.hard.map((h) =>
      `| ${h.id} | ${h.tor} | ${h.handle} | ${h.checkType} | ${h.role === 'expected' ? 'top10' : 'not_top10'} | ${at(h.manual)} | ${h.placeholder} | ${at(h.ai)} | ${yes(h.ai.passed)} |`,
    ),
    '',
    '## Runs',
    '',
    'Ties: tied adjacent pairs (same total) in the top 10, counted as the baseline harness does.',
    '',
    '| Set | ToR | Pool after Required | Manual ranked | AI ranked | AI fallbacks | Manual ties in top 10 | AI ties in top 10 |',
    '|---|---|---|---|---|---|---|---|',
    ...r.runs.map(
      (x) =>
        `| ${x.set} | ${x.tor} | ${x.pool} | ${x.manual.rows.length} | ${x.ai.rows.length} | ${x.ai.fallbackIds.length} | ` +
        `${tiedPairsTop10(x.manual.rows)} | ${tiedPairsTop10(x.ai.rows)} |`,
    ),
    '',
    '## Per case',
    '',
    '| Case | Handle | Role | Manual | Manual total/fit | AI | AI total/fit | Manual passes | AI passes |',
    '|---|---|---|---|---|---|---|---|---|',
  ]
  for (const c of r.cases) {
    c.case.targets.forEach((t, i) => {
      const mm = c.manual[i]
      const aa = c.ai[i]
      out.push(`| ${c.case.id} | ${t.handle} | ${t.role} | ${at(mm)} | ${scores(mm)} | ${at(aa)} | ${scores(aa)} | ${yes(mm.passed)} | ${yes(aa.passed)} |`)
    })
  }
  out.push('', ...callSections(r))
  return out.join('\n')
}

/** The Fit calls and Components calls sections. Hidden in fake mode, where the fake model reports no
 *  tokens, so its rows would read like measurements; a section is left out when no set has its record. */
function callSections(r: CompareReport): string[] {
  if (r.models === 'fake') return []
  const perCall = (n: number, calls: number) => Math.round(n / calls)
  const head = '| Set | Runs | Calls | Tokens in | Tokens out | Tokens in per call | Tokens out per call | Fallbacks |'
  const base = (k: string, t: PhaseTotals) =>
    `| ${k} | ${t.runs} | ${t.calls} | ${t.tokensIn} | ${t.tokensOut} | ${perCall(t.tokensIn, t.calls)} | ${perCall(t.tokensOut, t.calls)} | ${t.fallbacks} |`
  const section = (
    totals: CompareReport['fitCalls'], title: string, text: string, extraHead: string, extra: (t: PhaseTotals) => string,
  ): string[] => {
    const sets = (['tor', 'hard'] as const).flatMap((k) => {
      const t = totals[k]
      return t ? [{ k, t }] : []
    })
    if (sets.length === 0) return []
    return [
      `## ${title}`,
      '',
      text,
      '',
      `${head}${extraHead}`,
      `|---|---|---|---|---|---|---|---|${'---|'.repeat(extraHead.split('|').length - 1)}`,
      ...sets.map(({ k, t }) => `${base(k, t)}${extra(t)}`),
      '',
    ]
  }
  return [
    ...section(r.fitCalls, 'Fit calls', 'The fit phase record of the engine, summed over the AI runs of each set. Tokens are as the model reported them.', '', () => ''),
    ...section(
      r.componentsCalls,
      'Components calls',
      'The components phase record of the engine, summed over the AI runs of each set. Skipped: candidates not judged because the run was out of time. Compare runs have no deadline, so Skipped is always 0 here.',
      ' Skipped | Components missing | Component mismatches |',
      (t) => ` ${t.skipped} | ${t.componentsMissing} | ${t.componentMismatch} |`,
    ),
  ]
}

/** An error code safe to print: our own codes only, never a message that could quote a URL or a key. */
export function safeError(err: unknown): string {
  const message = (err as { message?: unknown } | null)?.message
  if (typeof message === 'string' && /^[a-z_]+(: [A-Za-z0-9_ .-]{0,80})?$/.test(message)) return message
  const name = (err as { name?: unknown } | null)?.name
  return typeof name === 'string' && /^[A-Za-z_]{1,64}$/.test(name) ? name : 'unknown_error'
}
