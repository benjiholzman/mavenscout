import test from 'node:test'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { createEngineFromEnv, createLazyEngine } from '../src/engine/factory'
import type { EngineDeps } from '../src/engine/factory'
import { buildSampleIndex, FAKE_JD_TEXT, FAKE_MODEL_VERSION, fakeReferenceLists } from '../src/engine/local-fakes'
import { createStubEngine } from '../src/engine/stub'
import { TerminalError } from '../src/core/errors'
import { processJob } from '../src/worker/app'
import { DEFAULT_LIMITS } from '../src/shared/limits'
import { createMemoryStore } from '../src/shared/memory-store'
import { loadSettings } from '../src/core/settings'
import { runEngine } from '../src/core/run'
import type { RunIO } from '../src/core/run'
import type { SupabaseConfig, SupabaseReader } from '../src/data/supabase'

test.beforeEach(() => { console.log = () => {} })

const ARTIFACT = JSON.stringify({
  modelVersion: 'amazon.titan-embed-text-v2:0',
  indexVersion: 'idx-t',
  dimensions: 2,
  fragments: [{ fragmentId: 'a#x#0', profileId: 'a', type: 'skill', text: 'T', vector: [1, 0] }],
})

const ANON = 'ANON-KEY-VALUE'
const URL_VALUE = 'https://example.invalid'
const SECRET_URL = 'https://from-secret.invalid'
const SECRET_ANON = 'SECRET-ANON-VALUE'
const SECRET_JSON = JSON.stringify({ SUPABASE_URL: SECRET_URL, SUPABASE_ANON_KEY: SECRET_ANON })

interface Calls { secrets: string[]; read: string[]; readFile: string[]; reader: SupabaseConfig[]; textModel: number; jobText: string[]; lists: number; embedded: string[] }

function makeDeps(over: Partial<EngineDeps> = {}): { deps: EngineDeps; calls: Calls } {
  const calls: Calls = { secrets: [], read: [], readFile: [], reader: [], textModel: 0, jobText: [], lists: 0, embedded: [] }
  const reader: SupabaseReader = {
    async getJobDescriptionText(id) { calls.jobText.push(id); return 'JD FROM READER' },
    async getReferenceLists() {
      calls.lists++
      return { organizations: ['USAID', 'World Bank', 'WB'], organizationTerms: { names: ['USAID', 'World Bank'], aliases: ['WB'] }, languages: ['French'] }
    },
    async getScoringData() { return { candidates: [], expertise: {} as never, orgs: {} as never, missing: [] } },
    async getExtraction() { return { extracted: null, hiringOrganization: null } },
  }
  const deps: EngineDeps = {
    readObject: async (key) => { calls.read.push(key); return ARTIFACT },
    readFile: (path) => { calls.readFile.push(path); return ARTIFACT },
    createReader: (cfg) => { calls.reader.push(cfg); return reader },
    createTextModel: () => { calls.textModel++; return async () => ({ text: '', inputTokens: 0, outputTokens: 0 }) },
    embed: async (text) => { calls.embedded.push(text); return [1, 0] },
    embedModelId: 'amazon.titan-embed-text-v2:0',
    readSecret: async (id) => { calls.secrets.push(id); return SECRET_JSON },
    ...over,
  }
  return { deps, calls }
}

const base = { SUPABASE_URL: URL_VALUE, SUPABASE_ANON_KEY: ANON }

const io = (): RunIO => ({ settings: loadSettings({}), existing: [], saveCheckpoint: async () => {}, saveFallback: async () => {} })

async function queuedJob(store: ReturnType<typeof createMemoryStore>): Promise<void> {
  await store.putObject('in.json', JSON.stringify({ jobDescriptionId: 'jd', requirements: [], poolIds: ['p1'] }))
  await store.createJob({
    jobId: 'j1', state: 'QUEUED', createdAt: 1, inputKey: 'in.json', settings: loadSettings({}),
    progress: { done: 0, total: 1 }, fallbacks: [], record: [], expiresAt: 1e9,
  })
}

test('no ENGINE and ENGINE=stub give the stub engine and no job text lookup', async () => {
  for (const env of [{}, { ENGINE: 'stub' }, { ENGINE: '' }]) {
    const { deps } = makeDeps()
    const setup = await createEngineFromEnv(env, deps)
    assert.equal(setup.engine.promptVersion, createStubEngine().promptVersion)
    assert.deepEqual(setup.engine.modelIds, createStubEngine().modelIds)
    assert.equal(setup.jobText, undefined)
  }
})

test('stub options still come from the env', async () => {
  const { deps } = makeDeps()
  const setup = await createEngineFromEnv({ STUB_CRASH: 'true' }, deps)
  const job = { jobId: 'j', jobDescriptionId: 'd', requirements: [], poolIds: [] }
  await assert.rejects(setup.engine.rank(job, {} as never), /stub crash/)
})

test('an unknown ENGINE value throws invalid_engine_setting', async () => {
  const { deps } = makeDeps()
  await assert.rejects(createEngineFromEnv({ ENGINE: 'Semantic ' }, deps), /invalid_engine_setting/)
  await assert.rejects(createEngineFromEnv({ ENGINE: 'bogus' }, deps), (e) => e instanceof TerminalError && e.code === 'invalid_engine_setting')
})

test('semantic: each missing variable fails with a code naming it, never a value', async () => {
  const cases: [Record<string, string>, string][] = [
    [{ ...base }, 'INDEX_ARTIFACT_PATH'],
    [{ INDEX_ARTIFACT_PATH: 'pathvalue', SUPABASE_ANON_KEY: ANON }, 'SUPABASE_SECRET_ID'],
    [{ INDEX_ARTIFACT_PATH: 'pathvalue', SUPABASE_URL: URL_VALUE }, 'SUPABASE_SECRET_ID'],
    [{ INDEX_ARTIFACT_PATH: 'pathvalue' }, 'SUPABASE_SECRET_ID'],
    [{ INDEX_ARTIFACT_S3_KEY: 'keyvalue', ...base }, 'JOBS_BUCKET'],
  ]
  for (const [env, name] of cases) {
    const { deps } = makeDeps()
    await assert.rejects(createEngineFromEnv({ ENGINE: 'semantic', ...env }, deps), (e: unknown) => {
      assert.ok(e instanceof TerminalError)
      assert.ok(e.code.startsWith('missing_env_'), e.code)
      assert.ok(e.code.includes(name), e.code)
      for (const secret of [ANON, URL_VALUE, 'pathvalue', 'keyvalue']) assert.ok(!e.message.includes(secret))
      return true
    })
  }
})

test('semantic with a file path wires the artifact, reader, text model and settings', async () => {
  const { deps, calls } = makeDeps()
  const env = { ENGINE: 'semantic', INDEX_ARTIFACT_PATH: 'idx.json', FIT_MODEL: 'fit-x', TEXT_MODEL: 'text-x', ...base }
  const setup = await createEngineFromEnv(env, deps)
  assert.deepEqual(calls.readFile, ['idx.json'])
  assert.deepEqual(calls.read, [])
  assert.deepEqual(calls.reader, [{ url: URL_VALUE, anonKey: ANON }])
  assert.equal(calls.textModel, 1)
  assert.deepEqual(setup.engine.modelIds, { embed: 'amazon.titan-embed-text-v2:0', fit: 'fit-x', text: 'text-x', index: 'idx-t' })
  assert.match(setup.engine.promptVersion, /\+/)
  assert.equal(await setup.jobText?.('jd-1'), 'JD FROM READER')
  assert.deepEqual(calls.jobText, ['jd-1'])
})

test('semantic reads the artifact from the jobs bucket by key', async () => {
  const { deps, calls } = makeDeps()
  const setup = await createEngineFromEnv({ ENGINE: 'semantic', INDEX_ARTIFACT_S3_KEY: 'index/a.json', JOBS_BUCKET: 'b', ...base }, deps)
  assert.deepEqual(calls.read, ['index/a.json'])
  assert.equal(setup.engine.modelIds.index, 'idx-t')
})

test('semantic: a missing object is index_artifact_missing and a bad one index_artifact_invalid', async () => {
  const env = { ENGINE: 'semantic', INDEX_ARTIFACT_S3_KEY: 'k', JOBS_BUCKET: 'b', ...base }
  await assert.rejects(createEngineFromEnv(env, makeDeps({ readObject: async () => null }).deps), (e) => e instanceof TerminalError && e.code === 'index_artifact_missing')
  await assert.rejects(createEngineFromEnv(env, makeDeps({ readObject: async () => '{"x":1}' }).deps), (e) => e instanceof TerminalError && e.code === 'index_artifact_invalid')
  const fileEnv = { ENGINE: 'semantic', INDEX_ARTIFACT_PATH: 'p', ...base }
  const missing = makeDeps({ readFile: () => { throw new Error('ENOENT') } }).deps
  await assert.rejects(createEngineFromEnv(fileEnv, missing), (e) => e instanceof TerminalError && e.code === 'index_artifact_missing')
})

test('a transient artifact read error is not terminal', async () => {
  const env = { ENGINE: 'semantic', INDEX_ARTIFACT_S3_KEY: 'k', JOBS_BUCKET: 'b', ...base }
  const deps = makeDeps({ readObject: async () => { throw new Error('S3 down') } }).deps
  await assert.rejects(createEngineFromEnv(env, deps), (e) => !(e instanceof TerminalError) && /S3 down/.test((e as Error).message))
})

test('the artifact is checked against the embedding model the embedder calls, not EMBED_MODEL', async () => {
  const job = { jobId: 'j', jobDescriptionId: 'd', requirements: [], poolIds: ['a'], jdText: 'x' }
  const env = { ENGINE: 'semantic', INDEX_ARTIFACT_PATH: 'p', ...base }
  const other = await createEngineFromEnv(env, makeDeps({ embedModelId: 'other-model' }).deps)
  await assert.rejects(runEngine(job, other.engine, io()), /embedding_model_mismatch/)
  // EMBED_MODEL on the worker plays no part in the check.
  const same = await createEngineFromEnv({ ...env, EMBED_MODEL: 'other-model' }, makeDeps().deps)
  const out = await runEngine(job, same.engine, io())
  // The check passed and the job ran: the test reader has no profile data, so the one candidate falls back.
  assert.deepEqual(out.fallbacks, [{ profileId: 'a', reason: 'profile_missing' }])
})

test('fake models: the sample file is read, no reader, model or embedder from deps is used', async () => {
  const { deps, calls } = makeDeps({ embed: async () => { throw new Error('real embed') } })
  deps.readFile = (p) => { calls.readFile.push(p); return JSON.stringify(buildSampleIndex(['a', 'b'])) }
  const setup = await createEngineFromEnv({ ENGINE: 'semantic', LOCAL_FAKE_MODELS: 'true' }, deps, { allowFake: true })
  assert.deepEqual(calls.readFile, ['samples/sample-index.json'])
  assert.equal(calls.lists, 0)
  assert.deepEqual(calls.reader, [])
  assert.equal(calls.textModel, 0)
  assert.equal(setup.engine.modelIds.embed, FAKE_MODEL_VERSION)
  assert.equal(await setup.jobText?.('anything'), FAKE_JD_TEXT)
})

test('lazy engine builds on first use, once, and the stub path works through it', async () => {
  let built = 0
  const lazy = createLazyEngine(async () => { built++; return { engine: createStubEngine() } })
  assert.equal(built, 0)
  const store = createMemoryStore()
  await queuedJob(store)
  const deps = { store, engine: lazy.engine, jobText: lazy.jobText, limits: DEFAULT_LIMITS, now: () => 5, workerId: 'w' }
  assert.equal(await processJob('j1', 1, deps), 'done')
  assert.equal(built, 1)
  await lazy.jobText('x')
  assert.equal(built, 1)
  assert.deepEqual(lazy.engine.modelIds, createStubEngine().modelIds)
})

test('lazy engine: a config error fails the job with its code instead of retrying', async () => {
  const lazy = createLazyEngine(() => createEngineFromEnv({ ENGINE: 'semantic', ...base }, makeDeps().deps))
  const store = createMemoryStore()
  await queuedJob(store)
  const deps = { store, engine: lazy.engine, jobText: lazy.jobText, limits: DEFAULT_LIMITS, now: () => 5, workerId: 'w' }
  assert.equal(await processJob('j1', 1, deps), 'failed')
  const job = await store.getJob('j1')
  assert.equal(job?.state, 'FAILED')
  assert.equal(job?.errorCode, 'missing_env_INDEX_ARTIFACT_PATH_or_INDEX_ARTIFACT_S3_KEY')
})

test('lazy engine does not cache a failed build', async () => {
  let n = 0
  const lazy = createLazyEngine(async () => {
    if (++n === 1) throw new Error('transient')
    return { engine: createStubEngine() }
  })
  await assert.rejects(lazy.jobText('x'), /transient/)
  assert.equal(await lazy.jobText('x'), null)
  assert.equal(n, 2)
})

test('a job reports the fit and text models in its settings, even when the worker env names others', async () => {
  const store = createMemoryStore()
  await store.putObject('in.json', JSON.stringify({ jobDescriptionId: 'jd', requirements: [], poolIds: ['a'] }))
  await store.createJob({
    jobId: 'j1', state: 'QUEUED', createdAt: 1, inputKey: 'in.json',
    settings: loadSettings({ FIT_MODEL: 'job-fit', TEXT_MODEL: 'job-text' }),
    progress: { done: 0, total: 1 }, fallbacks: [], record: [], expiresAt: 1e9,
  })
  const env = { ENGINE: 'semantic', INDEX_ARTIFACT_PATH: 'p', FIT_MODEL: 'worker-fit', TEXT_MODEL: 'worker-text', ...base }
  const lazy = createLazyEngine(() => createEngineFromEnv(env, makeDeps().deps))
  const deps = { store, engine: lazy.engine, jobText: lazy.jobText, limits: DEFAULT_LIMITS, now: () => 5, workerId: 'w' }
  assert.equal(await processJob('j1', 1, deps), 'done')
  const job = await store.getJob('j1')
  assert.equal(job?.modelIds?.fit, 'job-fit')
  assert.equal(job?.modelIds?.text, 'job-text')
  const result = JSON.parse((await store.getObject('results/j1.json')) as string)
  assert.deepEqual(result.modelIds, { embed: 'amazon.titan-embed-text-v2:0', fit: 'job-fit', text: 'job-text', index: 'idx-t' })
})

test('the canonical organization and language lists are read once at build and kept out of the query', async () => {
  const { deps, calls } = makeDeps()
  const setup = await createEngineFromEnv({ ENGINE: 'semantic', INDEX_ARTIFACT_PATH: 'p', ...base }, deps)
  assert.equal(calls.lists, 1)
  const job = { jobId: 'j', jobDescriptionId: 'd', requirements: [], poolIds: ['a'], jdText: 'Evaluation for USAID and the WB, report in French' }
  await runEngine(job, setup.engine, io())
  await runEngine({ ...job, jobId: 'j2' }, setup.engine, io())
  assert.equal(calls.lists, 1)
  assert.deepEqual(calls.embedded, ['Evaluation for and the , report in', 'Evaluation for and the , report in'])
})

test('a failed reference list read fails the build and is not terminal', async () => {
  const { deps } = makeDeps()
  const reader = deps.createReader({ url: URL_VALUE, anonKey: ANON })
  deps.createReader = () => ({ ...reader, getReferenceLists: async () => { throw new Error('supabase down') } })
  await assert.rejects(
    createEngineFromEnv({ ENGINE: 'semantic', INDEX_ARTIFACT_PATH: 'p', ...base }, deps),
    (e) => !(e instanceof TerminalError) && /supabase down/.test((e as Error).message),
  )
})

test('fake models use the fake reference lists for the query exclusions', async () => {
  const { deps } = makeDeps()
  deps.readFile = () => readFileSync('samples/sample-index.json', 'utf8')
  const setup = await createEngineFromEnv({ ENGINE: 'semantic', LOCAL_FAKE_MODELS: 'true' }, deps, { allowFake: true })
  const lists = await fakeReferenceLists()
  assert.ok(lists.organizations.length > 0 && lists.languages.length > 0)
  const poolIds = JSON.parse(readFileSync('samples/sample-job.json', 'utf8')).poolIds as string[]
  const job = { jobId: 'j', jobDescriptionId: 'd', requirements: [], poolIds, jdText: FAKE_JD_TEXT }
  const plain = await runEngine(job, setup.engine, io())
  const named = await runEngine({ ...job, jdText: `${FAKE_JD_TEXT} ${lists.organizations[0]} ${lists.languages[0]}` }, setup.engine, io())
  assert.deepEqual(named.results, plain.results)
  // Without the exclusions the extra words change the query, so the comparison above has teeth.
  const words = await runEngine({ ...job, jdText: `${FAKE_JD_TEXT} unrelated extra words` }, setup.engine, io())
  assert.notDeepEqual(words.results, plain.results)
})

test('LOCAL_FAKE_MODELS is refused unless the caller allows fakes', async () => {
  for (const value of ['true', '1']) {
    const { deps, calls } = makeDeps()
    await assert.rejects(
      createEngineFromEnv({ ENGINE: 'semantic', LOCAL_FAKE_MODELS: value, INDEX_ARTIFACT_PATH: 'p', ...base }, deps),
      (e) => e instanceof TerminalError && e.code === 'fake_models_not_allowed',
    )
    assert.deepEqual(calls.readFile, [])
  }
  // The stub ignores it, as before.
  const stub = await createEngineFromEnv({ LOCAL_FAKE_MODELS: 'true' }, makeDeps().deps)
  assert.deepEqual(stub.engine.modelIds, createStubEngine().modelIds)
})

test('the worker fails a job at once when LOCAL_FAKE_MODELS is set', async () => {
  const lazy = createLazyEngine(() => createEngineFromEnv({ ENGINE: 'semantic', LOCAL_FAKE_MODELS: 'true' }, makeDeps().deps))
  const store = createMemoryStore()
  await queuedJob(store)
  const deps = { store, engine: lazy.engine, jobText: lazy.jobText, limits: DEFAULT_LIMITS, now: () => 5, workerId: 'w' }
  assert.equal(await processJob('j1', 1, deps), 'failed')
  assert.equal((await store.getJob('j1'))?.errorCode, 'fake_models_not_allowed')
})

const secretEnv = { ENGINE: 'semantic', INDEX_ARTIFACT_PATH: 'p', SUPABASE_SECRET_ID: 'mavenscout/supabase' }

test('supabase: the env pair wins over the secret id and the secret is not read', async () => {
  const { deps, calls } = makeDeps()
  await createEngineFromEnv({ ...secretEnv, ...base }, deps)
  assert.deepEqual(calls.secrets, [])
  assert.deepEqual(calls.reader, [{ url: URL_VALUE, anonKey: ANON }])
})

test('supabase: the secret id is used when the pair is missing or partial', async () => {
  for (const partial of [{}, { SUPABASE_URL: URL_VALUE }, { SUPABASE_ANON_KEY: ANON }]) {
    const { deps, calls } = makeDeps()
    await createEngineFromEnv({ ...secretEnv, ...partial }, deps)
    assert.deepEqual(calls.secrets, ['mavenscout/supabase'])
    assert.deepEqual(calls.reader, [{ url: SECRET_URL, anonKey: SECRET_ANON }])
  }
})

test('supabase: no pair and no secret id is missing_env_SUPABASE_SECRET_ID', async () => {
  const { deps, calls } = makeDeps()
  await assert.rejects(
    createEngineFromEnv({ ENGINE: 'semantic', INDEX_ARTIFACT_PATH: 'p' }, deps),
    (e) => e instanceof TerminalError && e.code === 'missing_env_SUPABASE_SECRET_ID',
  )
  assert.deepEqual(calls.secrets, [])
})

test('supabase: an invalid secret is terminal supabase_secret_invalid and shows no value', async () => {
  const bad = [
    'not json {',
    '[]',
    'null',
    '"text"',
    JSON.stringify({ SUPABASE_ANON_KEY: SECRET_ANON }),
    JSON.stringify({ SUPABASE_URL: SECRET_URL }),
    JSON.stringify({ SUPABASE_URL: '', SUPABASE_ANON_KEY: SECRET_ANON }),
    JSON.stringify({ SUPABASE_URL: SECRET_URL, SUPABASE_ANON_KEY: 5 }),
  ]
  for (const raw of bad) {
    const { deps, calls } = makeDeps({ readSecret: async () => raw })
    await assert.rejects(createEngineFromEnv(secretEnv, deps), (e: unknown) => {
      assert.ok(e instanceof TerminalError)
      assert.equal(e.code, 'supabase_secret_invalid')
      for (const v of [SECRET_URL, SECRET_ANON, raw]) assert.ok(!e.message.includes(v) && !String(e.stack).includes(v))
      return true
    })
    assert.deepEqual(calls.reader, [])
  }
})

test('supabase: a secret read failure is retryable, carries only the error name, and the build is retried', async () => {
  let n = 0
  const { deps, calls } = makeDeps({
    readSecret: async () => {
      if (++n === 1) {
        const err = new Error(`denied for ${SECRET_URL} ${SECRET_ANON}`)
        err.name = 'AccessDeniedException'
        throw err
      }
      return SECRET_JSON
    },
  })
  await assert.rejects(createEngineFromEnv(secretEnv, deps), (e: unknown) => {
    assert.ok(e instanceof Error && !(e instanceof TerminalError))
    assert.match(e.message, /AccessDeniedException/)
    for (const v of [SECRET_URL, SECRET_ANON]) assert.ok(!e.message.includes(v))
    return true
  })
  assert.deepEqual(calls.reader, [])

  n = 0
  const lazy = createLazyEngine(() => createEngineFromEnv(secretEnv, deps))
  await assert.rejects(lazy.jobText('x'), (e) => !(e instanceof TerminalError))
  assert.equal(await lazy.jobText('x'), 'JD FROM READER')
  assert.equal(n, 2)
})

test('supabase: fake models never read the secret', async () => {
  const { deps, calls } = makeDeps()
  deps.readFile = () => readFileSync('samples/sample-index.json', 'utf8')
  await createEngineFromEnv({ ENGINE: 'semantic', LOCAL_FAKE_MODELS: 'true', SUPABASE_SECRET_ID: 'x' }, deps, { allowFake: true })
  assert.deepEqual(calls.secrets, [])
})
