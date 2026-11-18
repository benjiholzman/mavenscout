import type {
  Engine, EngineContext, Fallback, JdMatchResult, PhaseRecord, RankJob, Settings,
} from './types'

export interface RunIO {
  settings: Settings
  existing: JdMatchResult[]
  saveCheckpoint(r: JdMatchResult): Promise<void>
  saveFallback(f: Fallback): Promise<void>
}

export interface RunOutcome {
  state: 'DONE' | 'PARTIAL'
  results: JdMatchResult[]
  fallbacks: Fallback[]
  record: PhaseRecord[]
}

/** Order by total desc, then Fit desc, then profile id asc, and number ranks from 1. Does not mutate the input. */
export function rankResults(results: JdMatchResult[]): JdMatchResult[] {
  return [...results]
    .sort((x, y) =>
      y.total_score - x.total_score ||
      y.fit_score - x.fit_score ||
      (x.profile_id < y.profile_id ? -1 : x.profile_id > y.profile_id ? 1 : 0))
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

export async function runEngine(job: RankJob, engine: Engine, io: RunIO): Promise<RunOutcome> {
  const results = new Map<string, JdMatchResult>()
  const existingIds = new Set(io.existing.map((r) => r.profile_id))
  for (const r of io.existing) results.set(r.profile_id, r)
  const fallbacks: Fallback[] = []
  const record: PhaseRecord[] = []

  const ctx: EngineContext = {
    settings: io.settings,
    isDone: (id) => existingIds.has(id) || results.has(id),
    async checkpoint(result) {
      results.set(result.profile_id, result)
      await io.saveCheckpoint(result)
    },
    async fallback(profileId, reason) {
      const f: Fallback = { profileId, reason }
      fallbacks.push(f)
      await io.saveFallback(f)
    },
    record(phase, usage) {
      record.push({ phase, ...usage })
    },
  }

  await engine.rank(job, ctx)
  return {
    state: fallbacks.length > 0 ? 'PARTIAL' : 'DONE',
    results: rankResults([...results.values()]),
    fallbacks,
    record,
  }
}
