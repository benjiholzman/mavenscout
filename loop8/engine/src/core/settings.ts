import type { Settings } from './types'

export const DEFAULT_FIT_CAP = 200

function int(env: Record<string, string | undefined>, key: string, fallback: number): number {
  const raw = env[key]
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) throw new Error(`Invalid setting ${key}`)
  return n
}

function threshold(env: Record<string, string | undefined>): number | null {
  const raw = env.THRESHOLD
  if (raw === undefined || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error('Invalid setting THRESHOLD')
  return n
}

export function loadSettings(env: Record<string, string | undefined>): Settings {
  const str = (key: string, fallback: string) => env[key] || fallback
  return {
    variant: str('ENGINE_VARIANT', 'A'),
    fitModel: str('FIT_MODEL', 'us.openai.gpt-6-luna'),
    textModel: str('TEXT_MODEL', 'us.openai.gpt-6-luna'),
    embedModel: str('EMBED_MODEL', 'amazon.titan-embed-text-v2:0'),
    summaryCount: int(env, 'SUMMARY_COUNT', 5),
    parallelCalls: int(env, 'PARALLEL_CALLS', 16),
    threshold: threshold(env),
    promptVersion: str('PROMPT_VERSION', 'v0'),
    fitCap: int(env, 'FIT_CAP', DEFAULT_FIT_CAP),
  }
}
