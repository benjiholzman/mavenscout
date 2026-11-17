# Plan: walking skeleton of the ranking engine

| | |
|---|---|
| Status | Draft plan, for review by the project lead. No code written yet. Checked against engine blueprint v4 on 2026-11-16 |
| Phase | P1 to P2 (blueprint step 7) |
| Task | Walking skeleton: the asynchronous job pipeline with a stub engine, built and tested locally |
| Owner | Krish Tomar. Coordinated with Shivang Kanaujia, who owns the Phase 2 engine tasks |
| Date | 2026-11-16 |
| Sources | Engine blueprint v4 (`loop8/docs/architecture/index.html` and the shared web page): sections 4 to 6, the decisions table, risks 16 to 18 and step 7; the call with the customer on 2026-11-16 (Fathom); the project lead's meeting summary of 2026-11-16; `loop8/docs/runbooks/poc-environment.md` Part D; `src/lib/matching/types.ts`, `score.ts`, `persist.ts` |

## 1. What this task is for

The blueprint says every engine call is an asynchronous job: the API answers in under a second with a job id, a worker does the work in the background, and the app polls for the result. This task writes that whole path, with a **stub engine** in place of the AI, so Shivang's real engine has a place to run and the reliability design is tested before any money is spent on models.

**Scope of this plan: only what can be built and verified now**, on a laptop, with no AWS account changes, no model calls and no database. Deployment and real model runs come after, and are listed in section 7.

Why now: on 2026-11-16 the customer asked to review and test the first build on Monday 2026-11-23, and to wrap up around 2026-12-02. He said what matters most is proving the AI ranking is clearly better than the ranking from priorities alone, not just different. The project lead agreed that a local quality report is enough for that review. So the engine must be able to run locally, not only inside AWS.

## 2. What is already decided

| Decision | Value | Source |
|---|---|---|
| Front door | `POST /jobs` and `GET /jobs/{id}`. The optional `POST /jobs/{id}/summaries` route is out of scope | Blueprint |
| `POST /jobs` | Validates input and size, checks the idempotency key, saves the input, creates the job, enqueues its id, returns 202 with the job id. No AI calls | Blueprint |
| `GET /jobs/{id}` | Returns state and progress, and a result link when the job is finished | Blueprint |
| Final states | DONE, PARTIAL (some candidates used a fallback and are flagged) or FAILED | Blueprint |
| Duplicate delivery | The worker takes a lease and skips a job that is finished or already leased. Writes are keyed by job and profile, so repeating them is safe | Blueprint |
| Double click or retried POST | The idempotency key is written with a conditional write. The second call gets the same job id | Blueprint |
| Checkpoints | One per finished candidate, so a resumed job does not redo work | Blueprint |
| Client wrapper | The two function signatures do not change. It creates a request id, posts the job, polls with backoff, downloads the result. `rankPool` sends only profile ids | Blueprint |
| Reload | The job id is kept in `sessionStorage` | Blueprint |
| Reproducibility | Each result stores the model ids, prompt version and threshold it was produced with | Blueprint |
| Job record | Each job records duration by phase, throttles, retries, fallbacks, tokens and estimated cost | Blueprint |
| Variants | A: Luna for everything, 5 summaries (first to measure). B: Luna, 10 summaries. C: Luna for Fit, Sol for extraction and summaries, 5 summaries. D: as C with 10 | Project lead's summary |
| Speed target | 10 to 30 seconds per ranking. More than 1 minute is too long | Project lead's summary |
| Monthly cap | Needs the app to send the engine who the manager is. Built only if time allows | Project lead's summary, blueprint |
| Needs agreement first | Progress callback (changes `types.ts`), labeled placeholder fallback, on-demand summaries route | Blueprint |

## 3. What will be built now

### 3.1 Engine package, under `loop8/engine/`

A small TypeScript package with its own `package.json`, so the customer's `package.json` is not touched.

| File | What it does |
|---|---|
| `package.json`, `tsconfig.json` | Dependencies: AWS SDK v3 clients for DynamoDB, S3 and SQS, and the S3 presigner. Dev: `typescript`, `esbuild`, `@types/aws-lambda`, `@types/node` |
| `build.mjs` | Bundles each handler with esbuild and zips them as `api.zip` and `worker.zip` for runbook step D5. The same approach `npm run baseline` already uses for the app's scoring code |
| `src/core/run.ts` | **The engine core.** A plain function that takes a job and a context and runs the engine. It knows nothing about Lambda, SQS or DynamoDB, so the same code runs in the worker, in a local command and in tests |
| `src/core/settings.ts` | The variant settings: Fit model, text model, summary count, parallel calls, threshold, prompt version. Every job records the settings it ran with. Changing variant A to D is a settings change, not a code change |
| `src/engine/types.ts` | The engine interface (section 3.3) |
| `src/engine/stub.ts` | The stub engine (section 3.4) |
| `src/api/handler.ts` | The two routes: validation, idempotency, job creation, enqueue, status and result link |
| `src/worker/handler.ts` | Lease, load input, run the engine core with checkpoints, write the result and job record, set the final state |
| `src/shared/jobs.ts` | Job items: create, lease, checkpoint, finish, and the state rules (QUEUED, RUNNING, DONE, PARTIAL, FAILED) |
| `src/shared/store.ts` | A small storage interface for job items and files, with two implementations: AWS (DynamoDB and S3) and in-memory. The in-memory one lets the API and worker logic be tested end to end on a laptop |
| `src/shared/validate.ts` | Input shape and size checks, and the caps |
| `scripts/run-local.mjs` | Runs the engine core locally on a job file and prints the ranking, the job record and the end-to-end time. Today it runs the stub; it runs the real engine once Shivang plugs it in |
| `scripts/smoke-test.mjs` | Posts a small job to a deployed API, posts it again (same job id expected), polls to DONE, checks the result shape. Written now, run after deployment |
| `test/*.test.ts` | Unit tests, run with Node's built-in test runner after an esbuild bundle. No new test framework |
| `README.md` | How to build, test, run locally and package |

### 3.2 Job storage layout (proposal)

One DynamoDB table, `mavenscout-dev-jobs`, partition key `pk`, sort key `sk`, every item expiring after 7 days. The in-memory store uses the same keys.

| Item | `pk` | `sk` | Holds |
|---|---|---|---|
| Job | `JOB#<jobId>` | `META` | state, progress, lease, input and result keys, settings used, error code, timestamps, job record |
| Candidate checkpoint | `JOB#<jobId>` | `CAND#<profileId>` | the candidate's finished result |
| Idempotency key | `IDEM#<key>` | `IDEM` | the job id the key created |
| Daily counter | `DAY#<yyyy-mm-dd>` | `COUNT` | jobs started that day, for the daily cap |

### 3.3 Engine interface

The meeting point with Shivang's code. To be agreed with him before building.

```ts
interface Engine {
  modelIds: Record<string, string> // stored with every result
  promptVersion: string            // stored with every result
  rank(job: RankJob, ctx: EngineContext): Promise<void>
}

interface EngineContext {
  settings: Settings                                         // the variant this job runs
  isDone(profileId: string): boolean                         // skip candidates already checkpointed
  checkpoint(result: JdMatchResult): Promise<void>           // save one finished candidate
  fallback(profileId: string, reason: string): Promise<void> // flag a candidate, makes the job PARTIAL
  record(phase: string, usage: Usage): void                  // feeds the job record
}

interface Usage {
  durationMs: number
  tokensIn?: number
  tokensOut?: number
  throttles?: number
  retries?: number
  estimatedCostUsd?: number
}
```

`RankJob` holds the job id, the job description id, the requirement rows, the pool's profile ids and an optional manager id (reserved for the monthly cap). `JdMatchResult` is the existing type from `src/lib/matching/types.ts`, imported as a type only.

### 3.4 Stub engine

1. Fit is a fixed number from a hash of the job description id and the profile id, so the same input always gives the same order.
2. The total equals Fit and the band comes from `bandFor` in `src/lib/matching/config.ts`.
3. The narrative says plainly that it is a stub result. Model id `stub`, prompt version `stub-1`.
4. Test settings, off by default: a delay per candidate, a failure rate per candidate (exercises PARTIAL) and a forced crash (exercises redelivery).

### 3.5 Client wrapper, in the app

1. New file `src/lib/matching/remote.ts`. It keeps a request id and the job id in `sessionStorage`, posts with an `idempotency-key` header, polls every second for the first 30 seconds and then with backoff (retrying network errors), downloads the result and returns `JdMatchResult[]`.
2. One change in `src/lib/matching/score.ts`: `rankPool` uses the wrapper only when `VITE_ENGINE_URL` is set. When it is not set, the app behaves exactly as today.
3. One line in `.env.example`: an empty `VITE_ENGINE_URL` with a comment.

### 3.6 Job record and timing

Every log line is JSON and carries the job id; profile text is never logged. Each job stores its settings, model ids, prompt version, threshold, duration by phase, fallbacks, tokens and estimated cost (zero for the stub), and its **end-to-end time from creation to finish**, so the 10 to 30 second target can be checked for every run.

### 3.7 Not built in this step

| Item | Why it waits |
|---|---|
| Stored result reuse | The blueprint makes it a setting that is off or same day, and the customer worries about missing new consultants. Off until he asks for it |
| Continuation when the worker runs short of time | At a 30 second target, a job that needs it has already missed the target. Checkpoints and redelivery still cover crashes |
| Monthly cap, 3 minute message, progress callback, summaries route | Need agreement or are built only if time allows. The manager id is reserved in the request |
| `extractRequirements` through the engine | Blueprint step 8 |
| Candidates that fall back in a PARTIAL job | They are listed only in the result's fallbacks and do not appear in the ranking the app shows. Showing them flagged depends on the labeled fallback decision, which needs the customer's agreement first |

## 4. Our calls

Choices this plan makes where the blueprint is silent. Each one can be corrected by the project lead.

1. TypeScript on Node.js 22 (`nodejs22.x`), so the worker can reuse the app's TypeScript scoring code later.
2. The engine core is a plain library that runs locally and in AWS, so quality can be measured without a deployment.
3. Variants are settings recorded with every job.
4. The stub returns fixed fake scores. It needs no database.
5. Storage sits behind a small interface with an in-memory version, so the API and worker are tested without AWS.
6. Default limits until agreed: up to 5,000 pool ids per request, 200 candidates deep scored per job, 100 jobs a day.
7. The idempotency and job keys use the job description id, not its text. A run's text never changes after it is created.

## 5. Impact analysis

| Area | Effect | Risk and mitigation |
|---|---|---|
| Customer code | A new `src/lib/matching/remote.ts`, one switch in `score.ts`, one line in `.env.example` | With `VITE_ENGINE_URL` unset the app behaves exactly as today. The reason goes in the issue |
| `types.ts`, customer `package.json` | Not changed | |
| AWS account | Nothing touched | |
| Cost | None. No models, no AWS | |
| Shivang's work | The engine interface is the meeting point | Agree it with him before building |
| Public repository | Code and docs only, no endpoints, ids or secrets | |

## 6. Acceptance criteria (all checked locally)

1. `npm run build` in the repository root passes, and with `VITE_ENGINE_URL` unset the ranking works as before.
2. The engine package type-checks and bundles, producing `api.zip` and `worker.zip`.
3. Unit tests pass for: rejecting invalid and oversized input; the same idempotency key returning the same job id; the state rules (no job leaves DONE, PARTIAL or FAILED); a leased or finished job being skipped; a resumed job skipping checkpointed candidates; a stub failure rate ending the job as PARTIAL; every result and job record carrying the settings, model ids, prompt version and end-to-end time; the stub being deterministic and returning valid `JdMatchResult` objects.
4. An end-to-end test with the in-memory store: post a job, run the worker, poll to DONE, read the result. Posting twice gives one job.
5. `scripts/run-local.mjs` runs the stub on a sample job and prints the ranking, the job record and the end-to-end time.

## 7. Steps

Now:

1. Project lead reviews this plan.
2. Agree the engine interface (section 3.3) with Shivang.
3. Project lead approves opening the GitHub issue; branch `feature/<issue>-walking-skeleton` off `loop8-develop`.
4. Build and test locally until section 6 passes.
5. Project lead reviews; commits stay local until then, then a pull request into `loop8-develop`.

Later, each with its own approval: deploy with runbook Part D and run the smoke test; real model runs once a role can call Bedrock; the local quality report once the demo data is available to the engine.
