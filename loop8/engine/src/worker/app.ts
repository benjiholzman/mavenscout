import { runEngine } from '../core/run'
import type { Engine, Fallback, JdMatchResult, RankJob } from '../core/types'
import type { Limits } from '../shared/limits'
import { log } from '../shared/log'
import type { JobStore } from '../shared/store'
import { TERMINAL } from '../shared/store'
import type { RankRequest } from '../shared/validate'

export interface WorkerDeps {
  store: JobStore
  engine: Engine
  limits: Limits
  now(): number
  workerId: string
}

export type ProcessResult = 'done' | 'skipped' | 'failed'

export async function processJob(jobId: string, attempt: number, deps: WorkerDeps): Promise<ProcessResult> {
  const { store, engine, limits } = deps
  const job = await store.getJob(jobId)
  if (!job || TERMINAL.has(job.state)) return 'skipped'
  if (!(await store.acquireLease(jobId, deps.workerId, deps.now(), limits.leaseMs))) return 'skipped'
  log('job_started', { jobId, attempt })

  const fail = async (errorCode: string): Promise<void> => {
    const finishedAt = deps.now()
    await store.finishJob(jobId, { state: 'FAILED', finishedAt, errorCode, endToEndMs: finishedAt - job.createdAt })
    log('job_failed', { jobId, errorCode })
  }

  const raw = await store.getObject(job.inputKey)
  if (raw === null) {
    await fail('input_missing')
    return 'failed'
  }
  const request = JSON.parse(raw) as RankRequest
  const rankJob: RankJob = { jobId, ...request }

  const existing = await store.listCheckpoints(jobId)
  const checkpointed = new Set(existing.map((r) => r.profile_id))
  const fallbacks: Fallback[] = []

  let outcome
  try {
    outcome = await runEngine(rankJob, engine, {
      settings: job.settings,
      existing,
      async saveCheckpoint(r: JdMatchResult) {
        await store.saveCheckpoint(jobId, r)
        checkpointed.add(r.profile_id)
        await store.setProgress(jobId, checkpointed.size)
      },
      async saveFallback(f: Fallback) {
        fallbacks.push(f)
      },
    })
  } catch (e) {
    if (attempt >= limits.maxAttempts) await fail('engine_error')
    throw e
  }

  const resultKey = `results/${jobId}.json`
  await store.putObject(
    resultKey,
    JSON.stringify({
      jobId,
      state: outcome.state,
      settings: job.settings,
      modelIds: engine.modelIds,
      promptVersion: engine.promptVersion,
      threshold: job.settings.threshold,
      results: outcome.results,
      fallbacks: outcome.fallbacks,
    }),
  )
  await store.setProgress(jobId, outcome.results.length)
  const finishedAt = deps.now()
  const endToEndMs = finishedAt - job.createdAt
  await store.finishJob(jobId, {
    state: outcome.state,
    finishedAt,
    resultKey,
    record: outcome.record,
    fallbacks: outcome.fallbacks,
    modelIds: engine.modelIds,
    promptVersion: engine.promptVersion,
    endToEndMs,
  })
  log('job_finished', { jobId, state: outcome.state, endToEndMs, fallbackCount: outcome.fallbacks.length })
  return 'done'
}
