// Chooses the engine from the environment. ENGINE=stub (the default) is today's stub. ENGINE=semantic is
// the semantic engine with stage 2. A missing variable throws a TerminalError whose code names the variable
// (never its value), so the worker records a FAILED job with that code instead of retrying five times.
// The model and count settings that the calls use come with each job (read by the API function), not from
// this environment. Here only the engine choice, the index, Supabase and the fake switch are read.

import { loadSettings } from '../core/settings'
import { TerminalError } from '../core/errors'
import type { Engine, EngineContext, RankJob } from '../core/types'
import type { SupabaseConfig, SupabaseReader } from '../data/supabase'
import type { TextModel } from '../models/text-model'
import { loadIndexArtifact } from '../search/artifact'
import type { IndexArtifact } from '../search/artifact'
import type { EmbedText } from '../search/cosine'
import {
  createFakeEmbed, createFakeTextModel, fakeExtraction, fakeJobText, fakeReferenceLists, fakeScoringData,
} from './local-fakes'
import { createSemanticEngine } from './semantic'
import { createStubEngine, stubOptionsFromEnv } from './stub'

type Env = Record<string, string | undefined>

export interface EngineDeps {
  /** Reads a key from the jobs bucket. Null when the object does not exist. */
  readObject(key: string): Promise<string | null>
  readFile(path: string): string
  createReader(cfg: SupabaseConfig): SupabaseReader
  createTextModel(): TextModel
  embed: EmbedText
  /** The model id that embed really calls. The index artifact must have been built with it. */
  embedModelId: string
  /** Reads a secret string from Secrets Manager by id. Only used when the Supabase pair is not in the env. */
  readSecret(secretId: string): Promise<string>
}

export interface EngineFactoryOptions {
  /** Honour LOCAL_FAKE_MODELS. Only the local run passes true; anywhere else the setting fails the job. */
  allowFake?: boolean
}

export interface EngineSetup {
  engine: Engine
  /** Finds a job description's text when the request had none. Only the semantic engine needs it. */
  jobText?: (jobDescriptionId: string) => Promise<string | null>
}

export const FAKE_INDEX_PATH = 'samples/sample-index.json'

const set = (v: string | undefined): v is string => typeof v === 'string' && v !== ''
const missing = (name: string): TerminalError => new TerminalError(`missing_env_${name}`)

const SECRET_KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'] as const

/** The Supabase values: the two plain variables when both are set (local runs), otherwise the secret named
 *  by SUPABASE_SECRET_ID. Errors carry codes and error names only, never the secret string or its values. */
async function readSupabaseConfig(env: Env, deps: EngineDeps): Promise<SupabaseConfig> {
  if (set(env.SUPABASE_URL) && set(env.SUPABASE_ANON_KEY)) return { url: env.SUPABASE_URL, anonKey: env.SUPABASE_ANON_KEY }
  if (!set(env.SUPABASE_SECRET_ID)) throw missing('SUPABASE_SECRET_ID')
  let raw: string
  try {
    raw = await deps.readSecret(env.SUPABASE_SECRET_ID)
  } catch (e) {
    // The SDK message can quote the request, so only the error name is kept. Retryable, like an S3 error.
    const name = e instanceof Error && e.name ? e.name : 'Error'
    throw new Error(`supabase_secret_read_failed: ${name}`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new TerminalError('supabase_secret_invalid')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new TerminalError('supabase_secret_invalid')
  const values = parsed as Record<string, unknown>
  for (const key of SECRET_KEYS) {
    if (typeof values[key] !== 'string' || values[key] === '') throw new TerminalError('supabase_secret_invalid')
  }
  return { url: values.SUPABASE_URL as string, anonKey: values.SUPABASE_ANON_KEY as string }
}

async function readArtifact(env: Env, deps: EngineDeps, fake: boolean): Promise<IndexArtifact> {
  let raw: string | null
  if (set(env.INDEX_ARTIFACT_PATH) || fake) {
    const path = set(env.INDEX_ARTIFACT_PATH) ? env.INDEX_ARTIFACT_PATH : FAKE_INDEX_PATH
    try {
      raw = deps.readFile(path)
    } catch {
      throw new TerminalError('index_artifact_missing')
    }
  } else if (set(env.INDEX_ARTIFACT_S3_KEY)) {
    if (!set(env.JOBS_BUCKET)) throw missing('JOBS_BUCKET')
    raw = await deps.readObject(env.INDEX_ARTIFACT_S3_KEY)
  } else {
    throw missing('INDEX_ARTIFACT_PATH_or_INDEX_ARTIFACT_S3_KEY')
  }
  if (raw === null) throw new TerminalError('index_artifact_missing')
  try {
    return loadIndexArtifact(raw)
  } catch {
    // The parse or validation message can quote the file, so only the code is kept.
    throw new TerminalError('index_artifact_invalid')
  }
}

export async function createEngineFromEnv(env: Env, deps: EngineDeps, options: EngineFactoryOptions = {}): Promise<EngineSetup> {
  const which = env.ENGINE || 'stub'
  if (which === 'stub') return { engine: createStubEngine(stubOptionsFromEnv(env)) }
  if (which !== 'semantic') throw new TerminalError('invalid_engine_setting')

  // Fakes would give rankings that look real, so a deployed worker refuses the setting outright.
  if (set(env.LOCAL_FAKE_MODELS) && !options.allowFake) throw new TerminalError('fake_models_not_allowed')
  const fake = env.LOCAL_FAKE_MODELS === 'true'
  // Only the ids reported before the first job. Each job's own settings drive the calls.
  const settings = loadSettings(env)
  // Checked before any read, so the first missing variable is the one reported.
  if (!set(env.INDEX_ARTIFACT_PATH) && !set(env.INDEX_ARTIFACT_S3_KEY) && !fake) {
    throw missing('INDEX_ARTIFACT_PATH_or_INDEX_ARTIFACT_S3_KEY')
  }
  if (!fake && !(set(env.SUPABASE_URL) && set(env.SUPABASE_ANON_KEY)) && !set(env.SUPABASE_SECRET_ID)) {
    throw missing('SUPABASE_SECRET_ID')
  }
  const artifact = await readArtifact(env, deps, fake)

  if (fake) {
    // Offline run: every model call and every Supabase read is a fake. Never for a deployed worker.
    const lists = await fakeReferenceLists()
    return {
      engine: createSemanticEngine({
        artifact,
        exclude: { orgNames: lists.organizations, languages: lists.languages },
        embed: createFakeEmbed(artifact.dimensions),
        textModel: createFakeTextModel(),
        scoringData: fakeScoringData,
        extraction: fakeExtraction,
        fitModelId: settings.fitModel,
        textModelId: settings.textModel,
      }),
      jobText: fakeJobText,
    }
  }

  const reader = deps.createReader(await readSupabaseConfig(env, deps))
  // The canonical organization names and aliases and the language names, read once per build like the
  // artifact, so they never reach the query that is embedded and sent to Fit. Places stay per job.
  const lists = await reader.getReferenceLists()
  return {
    engine: createSemanticEngine({
      artifact,
      exclude: { orgNames: lists.organizations, languages: lists.languages },
      embed: deps.embed,
      textModel: deps.createTextModel(),
      scoringData: (ids) => reader.getScoringData(ids),
      extraction: (id) => reader.getExtraction(id),
      embedModelId: deps.embedModelId,
      fitModelId: settings.fitModel,
      textModelId: settings.textModel,
    }),
    jobText: (id) => reader.getJobDescriptionText(id),
  }
}

/** An engine and a jobText that build the real one on first use. The worker calls both inside its
 *  error handling, so a TerminalError from the build becomes a FAILED job with that code. A failed
 *  build is not cached, so a transient error (S3, for example) is retried on the next delivery.
 *  The ids the engine reports are read after rank, once the build has finished. */
export function createLazyEngine(build: () => Promise<EngineSetup>): {
  engine: Engine
  jobText: (jobDescriptionId: string) => Promise<string | null>
} {
  let pending: Promise<EngineSetup> | null = null
  let ready: EngineSetup | null = null
  const ensure = (): Promise<EngineSetup> => {
    if (!pending) {
      pending = build().then(
        (s) => { ready = s; return s },
        (e) => { pending = null; throw e },
      )
    }
    return pending
  }
  const engine: Engine = {
    get modelIds() { return ready?.engine.modelIds ?? {} },
    get promptVersion() { return ready?.engine.promptVersion ?? '' },
    async rank(job: RankJob, ctx: EngineContext) {
      await (await ensure()).engine.rank(job, ctx)
    },
  }
  return { engine, jobText: async (id) => (await ensure()).jobText?.(id) ?? null }
}
