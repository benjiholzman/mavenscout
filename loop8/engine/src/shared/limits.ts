export interface Limits {
  maxBodyBytes: number
  maxPoolIds: number
  maxDeepScored: number
  maxRequirements: number
  dailyJobCap: number
  leaseMs: number
  maxAttempts: number
}

export const DEFAULT_LIMITS: Limits = {
  maxBodyBytes: 524288,
  maxPoolIds: 5000,
  maxDeepScored: 200,
  maxRequirements: 100,
  dailyJobCap: 100,
  leaseMs: 200000,
  maxAttempts: 5,
}
