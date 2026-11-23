export interface Limits {
  maxBodyBytes: number
  maxPoolIds: number
  maxDeepScored: number
  maxRequirements: number
  dailyJobCap: number
  extractDailyCap: number
  leaseMs: number
  maxAttempts: number
  retryDelaySeconds: number
}

export const DEFAULT_LIMITS: Limits = {
  maxBodyBytes: 524288,
  maxPoolIds: 5000,
  maxDeepScored: 200,
  maxRequirements: 100,
  dailyJobCap: 100,
  // Extractions of the route POST /extract in a day, counted under their own key. Estimate, adjust after the first runs.
  extractDailyCap: 300,
  // Timing rule: worker Lambda timeout (180000) < leaseMs < SQS visibility timeout (1080000).
  // A lease shorter than the Lambda timeout lets a second worker start while the first still runs.
  // A visibility timeout shorter than the lease redelivers the message before the lease can expire.
  leaseMs: 200000,
  maxAttempts: 5,
  // After a caught retryable error the worker releases its lease and makes the message visible again
  // after this delay, instead of the full visibility timeout. Each retry still counts as a receive.
  retryDelaySeconds: 10,
}
