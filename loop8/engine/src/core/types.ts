import type { JdMatchResult, Requirement } from '../../../../src/lib/matching/types'

export type { JdMatchResult, Requirement }

export type JobState = 'QUEUED' | 'RUNNING' | 'DONE' | 'PARTIAL' | 'FAILED'

export interface Settings {
  variant: string
  fitModel: string
  textModel: string
  extractModel: string
  embedModel: string
  summaryCount: number
  parallelCalls: number
  threshold: number | null
  promptVersion: string
  /** How many shortlisted candidates get the Fit call; the rest keep the similarity estimate. */
  fitCap: number
}

export interface RankJob {
  jobId: string
  jobDescriptionId: string
  requirements: Requirement[]
  poolIds: string[]
  managerId?: string
  jdText?: string
}

export interface Usage {
  durationMs: number
  tokensIn?: number
  tokensOut?: number
  throttles?: number
  retries?: number
  estimatedCostUsd?: number
  /** Model calls made in the phase, and how many of them fell back. */
  calls?: number
  fallbacks?: number
  /** On a fit_cap_hit record: shortlisted candidates beyond the Fit cap. Not a call count. */
  beyondCap?: number
  /** On the fit record: candidates not judged because the run was out of time. Not a call count. */
  skipped?: number
}

export interface PhaseRecord extends Usage {
  phase: string
}

export interface Fallback {
  profileId: string
  reason: string
}

export interface EngineContext {
  settings: Settings
  /** When the Lambda times out, as epoch milliseconds. Absent for local runs and tests, which have no deadline. */
  deadlineAt?: number
  isDone(profileId: string): boolean
  checkpoint(result: JdMatchResult): Promise<void>
  fallback(profileId: string, reason: string): Promise<void>
  record(phase: string, usage: Usage): void
}

export interface Engine {
  modelIds: Record<string, string>
  promptVersion: string
  rank(job: RankJob, ctx: EngineContext): Promise<void>
}
