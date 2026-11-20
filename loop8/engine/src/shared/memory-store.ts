import type { JdMatchResult } from '../core/types'
import { TERMINAL } from './store'
import type { JobItem, JobQueue, JobStore } from './store'

// In-memory JobStore. Mirrors the conditional-write behavior of the real store
// and keeps copies so callers cannot mutate stored state by accident.
export function createMemoryStore(): JobStore & { objects: Map<string, string> } {
  const jobs = new Map<string, JobItem>()
  const idem = new Map<string, { jobId: string; expiresAt: number }>()
  const daily = new Map<string, number>()
  const checkpoints = new Map<string, Map<string, JdMatchResult>>()
  const objects = new Map<string, string>()

  return {
    objects,
    async findIdempotent(key) {
      return idem.get(key)?.jobId ?? null
    },
    async claimIdempotency(key, jobId, expiresAt) {
      const existing = idem.get(key)
      if (existing) return existing.jobId
      idem.set(key, { jobId, expiresAt })
      return jobId
    },
    async incrementDaily(day, cap) {
      const count = daily.get(day) ?? 0
      if (count >= cap) return false
      daily.set(day, count + 1)
      return true
    },
    async createJob(job) {
      if (jobs.has(job.jobId)) throw new Error(`job ${job.jobId} already exists`)
      jobs.set(job.jobId, structuredClone(job))
    },
    async getJob(jobId) {
      const j = jobs.get(jobId)
      return j ? structuredClone(j) : null
    },
    async acquireLease(jobId, owner, now, leaseMs) {
      const j = jobs.get(jobId)
      if (!j || TERMINAL.has(j.state)) return false
      const free = j.state === 'QUEUED' || (j.state === 'RUNNING' && (j.leaseUntil ?? 0) < now)
      if (!free) return false
      j.state = 'RUNNING'
      j.leaseOwner = owner
      j.leaseUntil = now + leaseMs
      if (j.startedAt === undefined) j.startedAt = now
      return true
    },
    async releaseLease(jobId, owner) {
      const j = jobs.get(jobId)
      if (!j || j.state !== 'RUNNING' || j.leaseOwner !== owner) return false
      j.leaseUntil = 0
      return true
    },
    async saveCheckpoint(jobId, result) {
      let m = checkpoints.get(jobId)
      if (!m) {
        m = new Map()
        checkpoints.set(jobId, m)
      }
      m.set(result.profile_id, structuredClone(result))
    },
    async listCheckpoints(jobId) {
      const m = checkpoints.get(jobId)
      return m ? [...m.values()].map((r) => structuredClone(r)) : []
    },
    async setProgress(jobId, done) {
      const j = jobs.get(jobId)
      if (j) j.progress.done = done
    },
    async finishJob(jobId, update) {
      const j = jobs.get(jobId)
      if (!j || TERMINAL.has(j.state)) return false
      const copy = structuredClone(update) as unknown as Record<string, unknown>
      for (const [k, v] of Object.entries(copy)) {
        if (v !== undefined) (j as unknown as Record<string, unknown>)[k] = v
      }
      return true
    },
    async putObject(key, body) {
      objects.set(key, body)
    },
    async getObject(key) {
      return objects.get(key) ?? null
    },
    async objectUrl(key) {
      return `memory://${key}`
    },
  }
}

export function createMemoryQueue(): JobQueue & { sent: string[] } {
  const sent: string[] = []
  return {
    sent,
    async send(jobId) {
      sent.push(jobId)
    },
  }
}
