import { bandFor } from '../../../../src/lib/matching/config'
import type { Engine, EngineContext, JdMatchResult, RankJob } from '../core/types'

export interface StubOptions {
  delayMs?: number
  failureRate?: number
  crash?: boolean
  random?: () => number
}

/** Reads STUB_DELAY_MS, STUB_FAILURE_RATE and STUB_CRASH. Unset values mean off. */
export function stubOptionsFromEnv(env: Record<string, string | undefined>): StubOptions {
  return {
    delayMs: Number(env.STUB_DELAY_MS) || 0,
    failureRate: Number(env.STUB_FAILURE_RATE) || 0,
    crash: env.STUB_CRASH === 'true',
  }
}

/** FNV-1a 32-bit hash, so a stub Fit is stable for a given JD and profile. */
function fnv1a(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function createStubEngine(opts: StubOptions = {}): Engine {
  const { delayMs = 0, failureRate = 0, crash = false, random = Math.random } = opts
  return {
    modelIds: { fit: 'stub', text: 'stub' },
    promptVersion: 'stub-1',
    async rank(job: RankJob, ctx: EngineContext): Promise<void> {
      const started = Date.now()
      if (crash) throw new Error('stub crash')
      for (const profileId of job.poolIds) {
        if (ctx.isDone(profileId)) continue
        if (delayMs > 0) await sleep(delayMs)
        if (failureRate > 0 && random() < failureRate) {
          await ctx.fallback(profileId, 'stub failure')
          continue
        }
        const fit = fnv1a(`${job.jobDescriptionId}:${profileId}`) % 101
        const result: JdMatchResult = {
          profile_id: profileId,
          rank: 0,
          fit_score: fit,
          total_score: fit,
          band: bandFor(fit),
          adjustments: [],
          scoring: { weight: 0, earned: 0, possible: 0 },
          must_haves_passed: [],
          narrative: `Stub result: Fit ${fit} for this profile. No real scoring was done.`,
        }
        await ctx.checkpoint(result)
      }
      ctx.record('stub', { durationMs: Date.now() - started })
    },
  }
}
