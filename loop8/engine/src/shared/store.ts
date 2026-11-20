import type { Fallback, JdMatchResult, JobState, PhaseRecord, Settings } from '../core/types'

export interface JobItem {
  jobId: string
  state: JobState
  createdAt: number
  startedAt?: number
  finishedAt?: number
  leaseOwner?: string
  leaseUntil?: number
  inputKey: string
  resultKey?: string
  settings: Settings
  modelIds?: Record<string, string>
  promptVersion?: string
  progress: { done: number; total: number }
  fallbacks: Fallback[]
  record: PhaseRecord[]
  errorCode?: string
  endToEndMs?: number
  expiresAt: number
}

export interface FinishUpdate {
  state: 'DONE' | 'PARTIAL' | 'FAILED'
  finishedAt: number
  resultKey?: string
  errorCode?: string
  record?: PhaseRecord[]
  fallbacks?: Fallback[]
  modelIds?: Record<string, string>
  promptVersion?: string
  endToEndMs?: number
}

export interface JobStore {
  findIdempotent(key: string): Promise<string | null>
  claimIdempotency(key: string, jobId: string, expiresAt: number): Promise<string> // the job id that owns the key
  incrementDaily(day: string, cap: number): Promise<boolean> // false when the cap is reached
  createJob(job: JobItem): Promise<void>
  getJob(jobId: string): Promise<JobItem | null>
  acquireLease(jobId: string, owner: string, now: number, leaseMs: number): Promise<boolean>
  releaseLease(jobId: string, owner: string): Promise<boolean> // false unless owner holds a RUNNING lease
  saveCheckpoint(jobId: string, result: JdMatchResult): Promise<void>
  listCheckpoints(jobId: string): Promise<JdMatchResult[]>
  setProgress(jobId: string, done: number): Promise<void>
  finishJob(jobId: string, update: FinishUpdate): Promise<boolean> // false if already terminal
  putObject(key: string, body: string): Promise<void>
  getObject(key: string): Promise<string | null>
  objectUrl(key: string): Promise<string>
}

export interface JobQueue {
  send(jobId: string): Promise<void>
}

export const TERMINAL: ReadonlySet<JobState> = new Set<JobState>(['DONE', 'PARTIAL', 'FAILED'])
