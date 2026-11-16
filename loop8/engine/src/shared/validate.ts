import type { Requirement } from '../core/types'
import type { Limits } from './limits'

export interface RankRequest {
  jobDescriptionId: string
  requirements: Requirement[]
  poolIds: string[]
  managerId?: string
}

type Invalid = { ok: false; status: 400 | 413; error: string }

const invalid: Invalid = { ok: false, status: 400, error: 'invalid_input' }

export function validateRankRequest(
  raw: string | null,
  limits: Limits,
): { ok: true; value: RankRequest } | Invalid {
  if (raw === null) return invalid
  if (Buffer.byteLength(raw, 'utf8') > limits.maxBodyBytes) {
    return { ok: false, status: 413, error: 'body_too_large' }
  }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return invalid
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return invalid
  const o = data as Record<string, unknown>
  if (typeof o.jobDescriptionId !== 'string' || o.jobDescriptionId === '') return invalid
  if (!Array.isArray(o.requirements) || o.requirements.length > limits.maxRequirements) return invalid
  if (!Array.isArray(o.poolIds)) return invalid
  if (!o.poolIds.every((id) => typeof id === 'string' && id !== '')) return invalid
  if (o.managerId !== undefined && typeof o.managerId !== 'string') return invalid
  const poolIds = [...new Set(o.poolIds as string[])].sort()
  if (poolIds.length > limits.maxPoolIds) return invalid
  const value: RankRequest = {
    jobDescriptionId: o.jobDescriptionId,
    requirements: o.requirements as Requirement[],
    poolIds,
  }
  if (o.managerId !== undefined) value.managerId = o.managerId as string
  return { ok: true, value }
}
