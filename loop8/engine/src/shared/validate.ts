import type { Requirement } from '../core/types'
import { JD_MAX_CHARS } from '../../../../src/lib/matching/config'
import type { Limits } from './limits'

export interface RankRequest {
  jobDescriptionId: string
  requirements: Requirement[]
  poolIds: string[]
  managerId?: string
  jdText?: string
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
  if (o.jdText !== undefined) {
    if (typeof o.jdText !== 'string' || o.jdText.trim() === '' || o.jdText.length > JD_MAX_CHARS) return invalid
  }
  const poolIds = [...new Set(o.poolIds as string[])].sort()
  if (poolIds.length > limits.maxPoolIds) return invalid
  const value: RankRequest = {
    jobDescriptionId: o.jobDescriptionId,
    requirements: o.requirements as Requirement[],
    poolIds,
  }
  if (o.managerId !== undefined) value.managerId = o.managerId as string
  if (o.jdText !== undefined) value.jdText = o.jdText as string
  return { ok: true, value }
}
