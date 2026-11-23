import { JD_MAX_CHARS } from '../../../../src/lib/matching/config'
import type { ExtractedRequirements, ExtractionContext } from '../../../../src/lib/matching/types'
import type { Settings } from '../core/types'
import type { Limits } from '../shared/limits'
import type { JobQueue, JobStore } from '../shared/store'
import { validateRankRequest } from '../shared/validate'
import type { RankRequest } from '../shared/validate'

export interface ApiRequest {
  method: string
  path: string
  headers: Record<string, string | undefined>
  body: string | null
}

export interface ApiResponse {
  status: number
  body: unknown
}

export interface ApiDeps {
  store: JobStore
  queue: JobQueue
  settings: Settings
  limits: Limits
  now(): number
  newId(): string
  /** Reads one job description into suggestions (the ingestion module). Optional
   *  so a deployment without model access still serves ranking. */
  extract?(jdText: string, ctx: ExtractionContext): Promise<ExtractedRequirements>
}

const WEEK_MS = 604800000

const err = (status: number, error: string, message: string): ApiResponse => ({
  status,
  body: { error, message },
})

const NOT_FOUND = err(404, 'not_found', 'No such route or job')

async function persistAndSend(jobId: string, value: RankRequest, deps: ApiDeps): Promise<void> {
  const now = deps.now()
  const inputKey = `inputs/${jobId}.json`
  await deps.store.putObject(inputKey, JSON.stringify(value))
  await deps.store.createJob({
    jobId,
    state: 'QUEUED',
    createdAt: now,
    inputKey,
    settings: deps.settings,
    progress: { done: 0, total: value.poolIds.length },
    fallbacks: [],
    record: [],
    expiresAt: now + WEEK_MS,
  })
  await deps.queue.send(jobId)
}

// Replay of a key that already has an owner. Repairs an owner whose creation
// failed part way: a missing job is recreated, an untouched QUEUED job is
// sent again (the worker lease makes duplicate sends harmless).
async function replay(ownerId: string, value: RankRequest, deps: ApiDeps): Promise<ApiResponse> {
  const job = await deps.store.getJob(ownerId)
  if (!job) {
    await persistAndSend(ownerId, value, deps)
    return { status: 202, body: { jobId: ownerId, state: 'QUEUED' } }
  }
  if (job.state === 'QUEUED' && job.startedAt === undefined) await deps.queue.send(ownerId)
  return { status: 202, body: { jobId: ownerId, state: job.state } }
}

async function createJob(req: ApiRequest, deps: ApiDeps): Promise<ApiResponse> {
  const { store, limits } = deps
  const v = validateRankRequest(req.body, limits)
  if (!v.ok) {
    return err(v.status, v.error, v.status === 413 ? 'Request body is too large' : 'Request body is not valid')
  }
  const key = req.headers['idempotency-key']
  if (!key) return err(400, 'missing_idempotency_key', 'The idempotency-key header is required')
  if (key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    return err(400, 'invalid_idempotency_key', 'The idempotency-key header must be at most 128 characters of A-Z a-z 0-9 . _ : -')
  }

  const existing = await store.findIdempotent(key)
  if (existing) return replay(existing, v.value, deps)

  const now = deps.now()
  const day = new Date(now).toISOString().slice(0, 10)
  if (!(await store.incrementDaily(day, limits.dailyJobCap))) {
    return err(429, 'daily_cap', 'The daily job limit has been reached')
  }

  const jobId = deps.newId()
  const owner = await store.claimIdempotency(key, jobId, now + WEEK_MS)
  if (owner !== jobId) return replay(owner, v.value, deps)

  await persistAndSend(jobId, v.value, deps)
  return { status: 202, body: { jobId, state: 'QUEUED' } }
}

async function getJob(jobId: string, deps: ApiDeps): Promise<ApiResponse> {
  const job = await deps.store.getJob(jobId)
  if (!job) return NOT_FOUND
  const finished = job.state === 'DONE' || job.state === 'PARTIAL'
  const resultUrl = finished && job.resultKey ? await deps.store.objectUrl(job.resultKey) : undefined
  return {
    status: 200,
    body: {
      jobId: job.jobId,
      state: job.state,
      progress: job.progress,
      fallbackCount: job.fallbacks.length,
      errorCode: job.errorCode,
      endToEndMs: job.endToEndMs,
      resultUrl,
    },
  }
}

function isExtractionContext(v: unknown): v is ExtractionContext {
  if (typeof v !== 'object' || v === null) return false
  const c = v as Record<string, unknown>
  const tax = c.taxonomy as Record<string, unknown> | undefined
  return (
    !!tax &&
    Array.isArray(tax.categories) &&
    Array.isArray(tax.items) &&
    Array.isArray(c.locationOptions) &&
    Array.isArray(c.languageOptions)
  )
}

// Synchronous extraction: the manager pastes a job description and expects
// suggestion chips at once, so this returns the result in one response rather
// than queuing a job. The job description is read once, here.
async function extractJd(req: ApiRequest, deps: ApiDeps): Promise<ApiResponse> {
  if (!deps.extract) return err(501, 'extraction_unavailable', 'Extraction is not configured on this engine')
  if (req.body === null) return err(400, 'empty_body', 'Request body is required')
  if (Buffer.byteLength(req.body, 'utf8') > deps.limits.maxBodyBytes) {
    return err(413, 'too_large', 'Request body is too large')
  }
  let payload: unknown
  try {
    payload = JSON.parse(req.body)
  } catch {
    return err(400, 'invalid_json', 'Request body is not valid JSON')
  }
  const p = payload as { jdText?: unknown; ctx?: unknown }
  if (typeof p.jdText !== 'string' || p.jdText.trim() === '') {
    return err(400, 'missing_jd', 'jdText is required')
  }
  if (p.jdText.length > JD_MAX_CHARS) {
    return err(413, 'jd_too_long', `jdText must be at most ${JD_MAX_CHARS} characters`)
  }
  if (!isExtractionContext(p.ctx)) {
    return err(400, 'invalid_ctx', 'ctx must include taxonomy, locationOptions and languageOptions')
  }
  const extracted = await deps.extract(p.jdText, p.ctx)
  return { status: 200, body: { extracted } }
}

export async function handleApi(req: ApiRequest, deps: ApiDeps): Promise<ApiResponse> {
  const path = req.path.length > 1 && req.path.endsWith('/') ? req.path.slice(0, -1) : req.path
  if (req.method === 'POST' && path === '/jobs') {
    const headers: Record<string, string | undefined> = {}
    for (const [k, val] of Object.entries(req.headers)) headers[k.toLowerCase()] = val
    return createJob({ ...req, headers }, deps)
  }
  if (req.method === 'POST' && path === '/extract') return extractJd(req, deps)
  const m = /^\/jobs\/([^/]+)$/.exec(path)
  if (req.method === 'GET' && m) return getJob(m[1], deps)
  return NOT_FOUND
}
