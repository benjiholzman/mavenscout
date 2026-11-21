import { randomUUID } from 'node:crypto'
import { handleApi } from './api/app'
import { loadSettings } from './core/settings'
import type { JdMatchResult, JobState, PhaseRecord, Settings } from './core/types'
import { createEngineFromEnv } from './engine/factory'
import { realEngineDeps } from './engine/real-deps'
import { DEFAULT_LIMITS } from './shared/limits'
import { createMemoryQueue, createMemoryStore } from './shared/memory-store'
import type { RankRequest } from './shared/validate'
import { processJob } from './worker/app'

export interface LocalRun {
  jobId: string
  state: JobState
  results: JdMatchResult[]
  endToEndMs: number
  settings: Settings
  record: PhaseRecord[]
}

/** Runs the real API and worker code in memory. The engine comes from ENGINE: the stub by default. */
export async function runLocal(job: RankRequest, env: Record<string, string | undefined>): Promise<LocalRun> {
  const store = createMemoryStore()
  const queue = createMemoryQueue()
  const settings = loadSettings(env)
  // Local runs read the index from INDEX_ARTIFACT_PATH only. There is no bucket here. This is the only
  // caller that allows LOCAL_FAKE_MODELS.
  const setup = await createEngineFromEnv(env, realEngineDeps(async () => null), { allowFake: true })
  const api = { store, queue, settings, limits: DEFAULT_LIMITS, now: Date.now, newId: () => randomUUID() }

  // The pipeline logs one JSON line per event. Hide them unless asked for.
  const originalLog = console.log
  if (env.LOCAL_VERBOSE !== 'true') console.log = () => {}
  try {
    const post = await handleApi(
      { method: 'POST', path: '/jobs', headers: { 'idempotency-key': 'local-run' }, body: JSON.stringify(job) },
      api,
    )
    if (post.status !== 202) throw new Error(`Job rejected: ${JSON.stringify(post.body)}`)
    const jobId = (post.body as { jobId: string }).jobId

    const worker = {
      store,
      engine: setup.engine,
      jobText: setup.jobText,
      limits: DEFAULT_LIMITS,
      now: Date.now,
      workerId: 'local',
    }
    for (const sent of [...queue.sent]) await processJob(sent, 1, worker)

    const item = await store.getJob(jobId)
    if (!item) throw new Error('Job record missing')
    const raw = await store.getObject(`results/${jobId}.json`)
    const results = raw === null ? [] : (JSON.parse(raw).results as JdMatchResult[])
    return { jobId, state: item.state, results, endToEndMs: item.endToEndMs ?? 0, settings: item.settings, record: item.record }
  } finally {
    console.log = originalLog
  }
}
