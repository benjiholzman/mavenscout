import type { Settings } from './types'

export const DEFAULT_FIT_CAP = 200
/** How many of the top judged candidates get the components call. 0 turns it off. */
export const DEFAULT_COMPONENTS_COUNT = 20

/** The components count of saved settings. A job saved before componentsCount existed carries none,
 *  and a value that is not a non-negative integer is ignored: the default applies in both cases. */
export const componentsCountOf = (value: unknown): number =>
  (Number.isInteger(value) && (value as number) >= 0 ? (value as number) : DEFAULT_COMPONENTS_COUNT)

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
    // Extraction (the ingestion module) runs on Sol, the Sonnet class role (D-06).
    // Kept separate from textModel, which defaults to Luna for summaries.
    extractModel: str('EXTRACT_MODEL', 'us.openai.gpt-6-sol'),
    embedModel: str('EMBED_MODEL', 'amazon.titan-embed-text-v2:0'),
    summaryCount: int(env, 'SUMMARY_COUNT', 5),
    parallelCalls: int(env, 'PARALLEL_CALLS', 16),
    threshold: threshold(env),
    promptVersion: str('PROMPT_VERSION', 'v0'),
    fitCap: int(env, 'FIT_CAP', DEFAULT_FIT_CAP),
    componentsCount: int(env, 'COMPONENTS_COUNT', DEFAULT_COMPONENTS_COUNT),
  }
}
