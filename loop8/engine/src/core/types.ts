import type { FitComponents, JdMatchResult, Requirement } from '../../../../src/lib/matching/types'

export type { FitComponents, JdMatchResult, Requirement }

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
  /** How many of the top candidates by rank with a Fit call in the run get the components call; 0 turns
   *  it off. Optional because a job stored before the setting existed carries no value; the default applies. */
  componentsCount?: number
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
  /** On the fit record: candidates not judged because the run was out of time. On the components record:
   *  components calls not made because the run was out of time. Not a call count. */
  skipped?: number
  /** On the components record: components calls of this run that ended without components (failed or
   *  invalid). Not a call count. */
  componentsMissing?: number
  /** On the components record: candidates of this run whose Fit is more than COMPONENT_MISMATCH_POINTS
   *  (stage2/run-stage2.ts) above the highest or below the lowest non-null component. Not a call count. */
  componentMismatch?: number
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
