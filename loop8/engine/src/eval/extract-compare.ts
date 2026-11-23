// Pure parts of the extraction comparison (scripts/extract-compare.ts): the arguments, the plan of live calls and the
// score of one extraction against the expected terms of a sample ToR. Nothing here reads a file or calls a model.

import type { ExtractedRequirements } from '../../../../src/lib/matching/types'

export interface ExtractCompareArgs {
  /** Model ids, for example us.amazon.nova-pro-v1:0. */
  models: string[]
  /** Sample ToR ids to run, or null for all of them. */
  torIds: string[] | null
  confirmLive: boolean
  /** The number of live calls the project lead approved. */
  maxCalls: number | null
}

export function parseExtractCompareArgs(argv: string[]): ExtractCompareArgs {
  const args: ExtractCompareArgs = { models: [], torIds: null, confirmLive: false, maxCalls: null }
  for (const a of argv) {
    if (a === '--confirm-live') args.confirmLive = true
    else if (a.startsWith('--models=')) args.models = a.slice('--models='.length).split(',').map((m) => m.trim()).filter(Boolean)
    else if (a.startsWith('--tors=')) args.torIds = a.slice('--tors='.length).split(',').map((m) => m.trim()).filter(Boolean)
    else if (a.startsWith('--max-calls=')) {
      const n = Number(a.slice('--max-calls='.length))
      if (!Number.isInteger(n) || n < 0) throw new Error('--max-calls must be a whole number')
      args.maxCalls = n
    } else throw new Error(`Unknown argument ${a}`)
  }
  if (args.models.length === 0) throw new Error('Name at least one model with --models=<id>[,<id>]')
  return args
}

/** One model call for each ToR and each model. The retry inside a call is not counted here. */
export function plannedCalls(args: ExtractCompareArgs, torCount: number): number {
  return args.models.length * torCount
}

export function livePlanText(args: ExtractCompareArgs, torCount: number): string {
  const n = plannedCalls(args, torCount)
  return [
    `Planned live calls: ${n} (${torCount} ToRs x ${args.models.length} models: ${args.models.join(', ')}).`,
    'Each call is paid by the customer. No database read and no model call was made.',
    `To run them, add --confirm-live --max-calls=${n}`,
  ].join('\n')
}

/** A live run needs the exact number of calls that was approved. Throws when it is missing or too small. */
export function checkLiveApproval(args: ExtractCompareArgs, torCount: number): void {
  const n = plannedCalls(args, torCount)
  if (args.maxCalls === null) throw new Error(`--confirm-live needs --max-calls=${n}, the number of calls that was approved`)
  if (args.maxCalls < n) throw new Error(`The plan needs ${n} calls and --max-calls allows ${args.maxCalls}. Nothing was called`)
}

export interface ExpectedTerms {
  expertise: string[]
  locations: string[]
  languages: string[]
}

export interface Score {
  hit: number
  total: number
  /** Expected terms that were not suggested, as "kind: term". */
  missed: string[]
  /** Suggested terms that were not expected, as "kind: term". */
  unexpected: string[]
}

export function scoreExtraction(got: ExtractedRequirements, want: ExpectedTerms): Score {
  const found = {
    expertise: got.expertise.map((t) => t.name),
    locations: got.locations.map((l) => l.value),
    languages: got.languages.map((l) => l.value),
  }
  const score: Score = { hit: 0, total: 0, missed: [], unexpected: [] }
  for (const kind of ['expertise', 'locations', 'languages'] as const) {
    const have = new Set(found[kind])
    for (const w of want[kind]) {
      score.total++
      if (have.has(w)) score.hit++
      else score.missed.push(`${kind}: ${w}`)
    }
    for (const f of found[kind]) if (!want[kind].includes(f)) score.unexpected.push(`${kind}: ${f}`)
  }
  return score
}
