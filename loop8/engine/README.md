# MavenScout ranking engine

This package is the server side of the ranking engine walking skeleton. It has two AWS Lambda functions: an API function that accepts a ranking job and reports its status, and a worker function that ranks the pool and writes the result. Today the worker runs a stub engine that produces stable fake scores, so the whole job pipeline can be tested before the real engine exists.

## Commands

Run these from this folder.

| Command | What it does |
|---|---|
| `npm install` | Installs the dependencies. |
| `npm test` | Builds the tests and runs them. |
| `npm run typecheck` | Type checks the source, tests and scripts. |
| `npm run local` | Runs one job end to end on this machine and prints the ranking. |
| `npm run local -- path/to/job.json` | Same, with your own job file instead of `samples/sample-job.json`. |
| `npm run compare` | Ranks the sample ToRs and the hard cases with the placeholder and the semantic engine (fake models) and prints the comparison. |
| `npm run make-sample-index` | Rewrites `samples/sample-index.json` (fake data for the offline semantic run). |
| `npm run build` | Writes `dist/api.zip` and `dist/worker.zip`. |

`npm run local` uses an in-memory store and queue and the stub engine. It prints rank, profile id, Fit and band for each profile, then the variant settings, the job phases and the end-to-end time in milliseconds. Set `LOCAL_VERBOSE=true` to also see the JSON log lines.

## Manual against AI comparison

`npm run compare` ranks every case twice: once with the app's placeholder `scorePool` (the manual side, mirroring the fixed requirements run of `scripts/ranking-baseline.ts`) and once with the variant A semantic engine through `runEngine` (the AI side). Logic is in `src/eval/compare.ts`.

1. Cases: the five ToRs in `docs/samples/expectations.json` (their `expected_top` handles, and their `not_top10` checks as decoys) and the hard cases in `samples/hard-cases/cases.json`.
2. Pools: the two sets are ranked in separate runs. The customer ToR set ranks the demo seed profiles in `scripts/demo-seed/profiles` that pass the app's listing rule, and nothing else, which is the baseline harness's pool. Every ToR that has a hard case is then ranked again in its own run over those demo profiles plus every hard-case fixture, and each hard case is measured on that run. In each run, Required rows are applied once with the app's `applyMustHaves`, so both rankers get the same survivors.
3. Taxonomy and organizations are read through the Supabase reader, read only, with the values named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the repo root `.env` (or `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the environment). No profile row is read.
4. Measures per case and ranker: the status of each handle (`ranked`, `filtered` by a Required row, `fallback` when the engine could not score it, or `not_in_pool`), its rank, hits in the top 5 and top 10, and whether each decoy stays outside the top 10. Only a ranked handle can be a hit. A decoy passes only when it is ranked outside the top 10 or filtered; a fallback or a handle not in the pool never passes. The mean reciprocal rank counts a handle that was not ranked as 0. A handle named by a case but missing from its set's pool is warned on stderr. The runs table also gives, per run and per ranker, the number of tied adjacent pairs (same total) in the top 10, counted as the baseline harness counts them.
5. Two summaries, never combined: the customer ToR set (the five ToRs of `expectations.json`, the primary measure) and the Loop8 hard set (our fixtures, built to defeat keyword matching). The hard set table shows the placeholder's result on each case: `fails`, `passes`, or the fixture's status when it was not ranked.
6. Both sides get the same extraction. The extraction the manual side computes for a ToR (`extractRequirements` over its text) is also the stored extraction the AI side reads, as the app passes the stored one in production, so its location and language values are removed from the AI query and from the text sent to Fit.
7. The positive `top10` checks of `expectations.json` (`untagged_text_evidence`, `wrong_location_strong_fit`, `top10`) are measured only where the handle is also an expected handle. Today that is one check, `demo-nusrat-jahan-chowdhury` in tor-01. The other five are not measured, though they are the cases where semantic retrieval should help.
8. Profile dates are fixed. Every date in the pool comes from one constant, `REFERENCE_DATE` in `src/eval/compare.ts` (2026-11-18, the run date of `docs/samples/ranking-baseline.md`): demo profiles are dated their `updated` days before it, and every fixture is dated on it, replacing the date in its file. After total and Fit, the placeholder breaks ties on that date, so the tie order no longer changes with the day of the run. A fixture is therefore at least as fresh as any demo profile, so on the placeholder it wins a tie on total and Fit unless the demo profile was also updated on that date (then the id decides).
9. Baseline check: the run reads `docs/samples/ranking-baseline.md`, takes its fixed requirements top 5 and top 10 counts from the summary line, and prints whether the manual side's customer ToR counts are the same (`match` or `mismatch`). The baseline reads its profiles from the database and this command reads the seed files, so a mismatch can come from either side.
10. Output: a markdown table on stdout and in `loop8/internal/compare-<timestamp>.md` (gitignored). Handles, ranks and scores only.

`--models=fake` is the default: the embedder and the text model are deterministic fakes and the index is built in memory, so the AI column proves the plumbing only.

`npm run compare -- --models=live` without `--confirm-live` makes no read and no call. It counts the planned calls from the files on disk, prints them and exits 0. `npm run compare -- --models=live --confirm-live` uses Titan and the Bedrock text model with the job settings' model ids (`FIT_MODEL`, `TEXT_MODEL`), the prebuilt `loop8/internal/index-artifact.json` for the demo profiles and on-the-fly embedding of the fixtures only. It checks the artifact's model and dimensions, prints the planned number of calls, then makes them. Live calls are paid by the customer. The text call count is an upper bound that does not count throttling retries, and a run that fails part way writes no report for the calls already made.

Read the live numbers with these two facts in mind:

1. The live artifact is built by `scripts/build-index.ts`, which drops the history entries written as tuples (and tuple education and accreditation entries). Seven demo profiles have tuple history, so for those seven the AI side sees less text than the manual side does (the fake mode index is built from the normalized profiles and does not have this gap).
2. In live and fake mode the AI side asks Fit for the first `FIT_CAP` shortlisted candidates in similarity order (200 by default, the same as the stage 1 cap, so it normally does not bind). If the shortlist is longer, the rest keep a capped similarity estimate, and the job records and logs `fit_cap_hit` with the cap and the number of candidates beyond it.

## Packaging

`npm run build` produces three zip files in `dist/`, one for the API function, one for the worker function and one for the extract function. In all of them, the handler is `index.handler`. The API zip contains no model client: extraction runs in its own function. Deployment follows `loop8/docs/runbooks/poc-environment.md`, Part D.

## Environment variables

1. Infrastructure: `JOBS_TABLE`, `JOBS_BUCKET`, `JOBS_QUEUE_URL` and `AWS_REGION`.
2. Job settings: `ENGINE_VARIANT`, `FIT_MODEL`, `TEXT_MODEL`, `EMBED_MODEL`, `FIT_CAP`, `SUMMARY_COUNT`, `PARALLEL_CALLS`, `THRESHOLD` and `PROMPT_VERSION`. The API function reads them when a job is created and saves them with the job, and the worker runs the job with those saved values. Set them on the API function. Setting them on the worker changes nothing about the calls a job makes. Each has a default, so none is required.
3. Extract function: `JOBS_TABLE` (for the daily counter only), `EXTRACT_MODEL` and `AWS_REGION`. It has no bucket and no queue. Without `EXTRACT_MODEL` the code default is GPT-6 Sol, which is blocked for this account, so Terraform sets it (`extract_model`, Nova Pro for now).
4. Stub engine controls: `STUB_DELAY_MS` adds a delay in milliseconds for each profile, `STUB_FAILURE_RATE` is the share of profiles (0 to 1) that fall back, and `STUB_CRASH=true` makes the engine throw. All are off when unset. They apply to the worker and to `npm run local`.

## Choosing the engine

`ENGINE` selects the engine in the worker and in `npm run local`. Unset, empty or `stub` runs the stub engine, exactly as before. `semantic` runs the semantic engine with stage 2 (Fit, scoring, summaries). Any other value fails the job with `invalid_engine_setting`.

The worker builds the engine on the first job, not at module load. A missing variable then fails that job with the code `missing_env_<NAME>`, and the job is recorded as FAILED at once, instead of the container crashing on every start and burning the five receives. The code names the variable and never shows its value. A bad or missing index file fails with `index_artifact_missing` or `index_artifact_invalid`. A transient error, such as an S3 outage, is retried like any other.

Worker variables for `ENGINE=semantic`, names only. The worker reads these itself, when it builds the engine on its first job:

1. `ENGINE`, as above.
2. The index: `INDEX_ARTIFACT_PATH` (a local file) or `INDEX_ARTIFACT_S3_KEY` (a key in the `JOBS_BUCKET` bucket). The path wins if both are set. The S3 object is read with the same helper as the job results, so it must be stored gzip compressed.
3. The job description, profile and reference list reads need the Supabase URL and anon key. Deployed, set `SUPABASE_SECRET_ID` to the id of the secret (`mavenscout/supabase`, a JSON string with the keys `SUPABASE_URL` and `SUPABASE_ANON_KEY`). The worker reads it once, when it builds the engine, and its role needs `secretsmanager:GetSecretValue` on that secret. Locally, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as plain variables. If both are set they win and the secret is not read. If neither way is set the job fails with `missing_env_SUPABASE_SECRET_ID`, and a secret that is not valid JSON or lacks a key fails with `supabase_secret_invalid`. A failed read (access denied, throttling, network) is retried and its error shows only the error name. At the same build as the index, the worker reads the canonical organization names and aliases and the language names once, and removes them from every job description before it is embedded and sent to Fit. Place names are removed per job, from the requirements and the stored extraction.
4. The embedding model: `TITAN_MODEL_ID`, which defaults to `amazon.titan-embed-text-v2:0`. This is the id the query embedding really calls, so it must equal the `modelVersion` of the index, or the job fails with `embedding_model_mismatch`. `EMBED_MODEL` is only a job setting kept with the job for the record. It plays no part in this check.

The model ids written with a job's result and job record are the ids the job's calls used: the Fit and text models from the job's saved settings, the embedding model of the index (checked against `TITAN_MODEL_ID` as above), and the index version.

When every Fit call of a run fails, the job does not finish as DONE. If any of the failures is a configuration problem (access denied, a validation error, a model that does not exist or is "not available for this account"), or every reply was cut off at the token limit, the job fails at once with `fit_model_unavailable`. Otherwise the run throws `fit_all_failed`, and the job is retried like any other transient error. When only some Fit calls fail, those candidates keep a flagged similarity estimate and the job continues. Each failed Fit call writes one `fit_call_failed` log line with the job id and the error name, never the error message.

Offline run: `ENGINE=semantic LOCAL_FAKE_MODELS=true npm run local` runs the whole stage 2 path with no network. A fake embedder, a fake text model and fake profile, extraction, reference list and job text data replace Bedrock and Supabase, and the index defaults to `samples/sample-index.json`. That file is fake data for the ten ids in `samples/sample-job.json`, made by `npm run make-sample-index` from the fake embedder. The scores it prints mean nothing. Only `npm run local` accepts `LOCAL_FAKE_MODELS`. The deployed worker fails every semantic job with `fake_models_not_allowed` when the variable is set to any value.

## Limitations of the semantic engine

These are known and accepted for the proof of concept. All call counts below are worst case figures worked out from the code, not measurements.

1. The `FIT_CAP` bound applies to one run of a job, not to the job as a whole. A run makes its Fit calls and summary calls before it saves any result. If it crashes after the Fit calls and before the results are saved, the next receive makes those calls again for every candidate not yet saved. A Lambda timeout is now avoided by the run deadline (see "Model call errors"), but a crash the worker cannot catch, such as running out of memory, still ends this way. Each such crash can therefore repeat up to `FIT_CAP` Fit calls plus `SUMMARY_COUNT` summary calls, and a job has up to five receives. The customer pays for every one of these calls.
2. A resumed run can judge a candidate's Fit differently. Candidates saved by an earlier run keep their scores, and the candidates that were not saved are judged again. A language model does not always give the same Fit twice, so a candidate judged again can end up above candidates that were saved earlier. The summaries are then not exactly the top `SUMMARY_COUNT` by total, and a fallback (`profile_missing`, `score_failed` or `not_indexed`) recorded in both runs can be listed twice.
3. Some wording reaches Fit and is kept out of the score only by the instruction in the Fit prompt. The job description can still say things about availability, seniority or work arrangement, because only organization, language and place names are removed from it. The free text of the profile fragments (bio, tagline, descriptions) can still contain the candidate's name, a city or an employer, unless `npm run check-artifact` was run on the index and passed. The prompt tells the model to ignore all of these, but nothing in the code removes them. The manual review of AI output should check for this.
4. Organization and language names are removed with the case rule described under "Organization name check" below. A name such as `Pact` matches in any case, so the ordinary word "pact" is also removed from the job description. A name with a capital after its first letter, such as `UN Women`, is removed only when written in exactly that case, so "UN WOMEN" or "Un Women" stays in the text.
5. An index stored in S3 must be gzip compressed. A plain JSON object fails to read, and the job fails with `engine_error` after five receives instead of `index_artifact_invalid`.

## Model call errors

Each Bedrock call is limited and retried as follows. The wait and time figures are choices made in the code, not measurements.

| What | Behavior |
|---|---|
| Request timeout | A Converse call that is still open after 25 seconds is aborted and fails with `RequestTimeout` (`REQUEST_TIMEOUT_MS`). The error carries no request or model text. |
| Retried errors | `ThrottlingException`, `ServiceUnavailableException`, `ModelTimeoutException`, `ModelErrorException`, `RequestTimeout` and HTTP 408, 424, 429 and 5xx (`isRetryable`). The SDK retry is off, so these are the only retries. |
| Retry policy | 5 retries, a wait of a random share of 500 ms times 2 to the attempt, each wait capped at 8 seconds. The worst case total wait of one call is 15.5 seconds. |
| Errors never retried | `AccessDenied`, `ValidationException`, `ResourceNotFoundException` and the message `not available for this account` fail the job at once with `fit_model_unavailable`. |
| Run deadline | The handler passes the end of the Lambda time as `deadlineAt`. No new Fit attempt starts in the last 75 seconds and no new summary attempt in the last 45 seconds (20 seconds to save the results, 25 for a call that started just before, and 30 seconds of window for the summaries). A candidate not reached keeps its similarity estimate with its own note, and a summary not reached uses the template text. Local runs and tests have no deadline. |
| After a throttle | The Fit calls in flight are halved, at most once every 2 seconds, down to 2, and are not raised again in that run. |
| What the job record shows | The `fit` and `summary` records carry `throttles` (attempts that failed with throttling or a service error), `retries` (attempts that failed with a retryable error), `fallbacks` and `skipped`. A `fit_deadline_hit` record is added when candidates were skipped. The share of fallbacks is `fallbacks` over `calls`. |

An error that is not a model failure, such as reaching the deadline while waiting to retry, skips the candidate and does not count as a failed Fit call. If every attempted Fit call fails the job still stops as before.

## Written summaries

The summary of each of the top `SUMMARY_COUNT` candidates is written after the ranking, with the text model, and explains the total and not Fit. Prompt version `summary-v2` (recorded with each result in `promptVersion`). Plan and measurements: `loop8/docs/planning/summary-writing-plan.md`.

| What | Behavior |
|---|---|
| Input | The numbers, the band, the priority rows, the must haves the candidate passed, the reason of the Fit call and the evidence. Never the name or the ids of the candidate |
| Prompt | Two or three short sentences, about 40 words and never more than 55. Plain words like one person explaining to another, no analogies, no lists or markdown, no dash used as punctuation. Fit is never explained by location, language, availability, seniority or career level, work arrangement, membership or employer names. The must haves given are the ones passed. The scores carry the number of priority rows met and the number of rows that count, and the text may say that every priority was met only when they are equal. Concrete words, not empty praise such as proven, extensive or impressive |
| Checks | `summaryProblems`: 40 to 60 words, no other band named, no long dash, short dash, double hyphen or hyphen with white space around it, and no list marker at the start of a line. A hyphen inside a word is fine. With the priority rows given, a sentence that says that all, every or each priority was met while a row is partly met or not met is an overclaim. `checkSummary` is true when there is no problem |
| Retry | A rejected reply is asked for again with what was wrong and the rejected text, up to 3 tries. Too long: cut to about 50 words by removing the least important details. Too short: add one short sentence. Overclaim: the rows that were not fully met are named. The tokens of every try are counted |
| Fallback | A reply that fails the third try, or is cut off at the token limit, falls back to the template text with the note that a written summary was not available. The job continues |

Measured with Nova Lite on 20 real candidates per run: 37 to 38 of 40 summaries accepted, 31 to 33 at the first try, none with a dash. The first version in production had 0 of 25 accepted. On a real job on the deployed engine the top five summaries were real text, 51 to 60 words.

## Extraction of the job description

The route `POST /extract` reads a pasted job description once and answers in the same request with the suggestions the manager sees as chips. Its own Lambda serves it, so the API function still calls no model. Plan: `loop8/docs/planning/extract-route-plan.md`.

| What | Behavior |
|---|---|
| Request | `{ jdText, ctx }`, where `ctx` carries the expertise list, the known locations and the known languages. At most 15,000 characters of text and 524,288 bytes of body. A bad body answers 400 or 413 and does not use the daily cap |
| Response | `{ extracted, degraded, model }`. `extracted` has expertise, locations and languages, each a suggestion only. Never a Must have, never the employer. `model` is the model id that was asked. `degraded` is true when the model failed or its reply could not be read and `extracted` is the keyword result |
| Prompt | Version `extract-v2`. The list is sent as lines `Name (hint, hint)`. Rule 1 says that the parentheses are hints and not part of the name, and asks to read the context, the tasks and the deliverables. It uses no example taken from a sample ToR |
| Model call | The same text model client and retry rules as Fit, with a 10 second timeout per call and at most one retry. A retry does not start when less than a call timeout remains before the deadline of the Lambda (25 seconds, less a 2 second margin for the response). The model reply is checked against the known lists and the result is joined with the keyword result so recall can only rise. A name is tried exactly, then as an old name, and then without one trailing parenthesis, because a model may copy the whole line of the list. A name that matches none is dropped |
| Failure | A model that fails does not fail the route. It answers 200 with the keyword result and `degraded` true, and the app shows suggestions as before. The Lambda answers 500 only when the function itself fails, for example when the counter table cannot be reached |
| Daily cap | 300 extractions a day (`extractDailyCap` in `src/shared/limits.ts`), counted in the jobs table under the key `DAY#extract-<day>`, separate from the daily job cap. The next call answers 429 with the code `daily_cap`, and the app client does not retry that code. The count includes calls whose model failed |
| Route throttle | 1 request a second with a burst of 3 for this route, set in Terraform (`extract_rate_limit`, `extract_burst_limit`). Estimates, adjust after the first runs |
| Role | The extract role has logs, `bedrock:InvokeModel` on the extraction model and `dynamodb:UpdateItem` on the keys `DAY#extract-*` of the jobs table. It has no bucket, queue or secret access. It is part of the budget cut at 150 percent |
| Logs | One `extract_done` line per call: status, model, degraded, duration, model calls, tokens, the number of expertise suggestions, the prompt version and `modelNames`, the counts of what the validation did with the names the model returned (returned, exact, old name, hint removed, dropped, and returned and kept for locations and languages). The job description and the reply of the model are never logged, and neither is a returned name |
| Measured | Not measured yet. The recall against the keyword result, the latency and the cost per call are recorded in the plan after the first runs |

## Comparing models for the extraction

`npm run extract-compare -- --models=<id>[,<id>]` runs the real extraction code on the five sample ToRs with each model and scores it against `docs/samples/expectations.json`, next to the keyword extractor. Plan: `loop8/docs/planning/extract-format-fix-plan.md`.

1. Without `--confirm-live` it prints the number of planned calls (ToRs times models) and makes none: no database read and no model call.
2. With `--confirm-live --max-calls=<n>` it makes the calls. `n` must be at least the planned number, so the approved number of calls is written in the command. The calls are paid by the customer.
3. It needs AWS credentials in the environment that may invoke the models, and the Supabase values of the root `.env` to read the expertise list, the locations and the languages (read only).
4. It prints, for each model, the recall of the expected terms, the suggestions that were not expected, the degraded answers, the tokens and the counts of the validation, and writes the table to `loop8/internal/`. It never prints a job description or a model reply. The cost is computed from the tokens and the AWS price list, not by the script.

## Retries

When the worker catches an error that a retry might fix, it releases its lease on the job and makes the SQS message visible again after 10 seconds (`retryDelaySeconds` in `src/shared/limits.ts`), instead of waiting for the full visibility timeout of 1,080 seconds. It shortens the wait only if the lease was released, because a worker that finds the lease still held skips the message and SQS then deletes it. A crash the worker cannot catch, such as a Lambda timeout, still waits the full visibility timeout. Each retry counts as a receive, so after the fifth receive the job is failed and the message goes to the dead letter queue as before. A `TerminalError` fails the job at once and is never retried. The worker role needs `sqs:ChangeMessageVisibility`, which runbook Part D already grants. The worker takes the queue URL from `JOBS_QUEUE_URL` when it is set and otherwise builds it from the `eventSourceARN` of the SQS record (`aws` and `aws-us-gov` partitions only); if neither gives a URL, no fast retry is requested and the message waits for its visibility timeout.

## Smoke test

The smoke test runs against a deployed API, not against your machine. Set `ENGINE_URL` to the API base URL and run:

```
node scripts/smoke-test.mjs
```

It posts `samples/sample-job.json` twice with one idempotency key and expects the same job id both times. It then checks the job status once a second for up to 120 seconds, downloads the result and checks that it has `results` and `settings`. It prints one summary line and exits 0 on success, or exits 1 with a message if the job fails, times out or the result is malformed.

## Local engine server

`npm run serve` starts an HTTP server on `127.0.0.1:8787` that runs the real API and worker code in memory with the stub engine. Use it to try the customer's app against the engine without any AWS resources. Set `LOCAL_ENGINE_PORT` to use another port. The command prints the URL when it is ready, and stops with Ctrl+C. Jobs live only in memory and are lost when the server stops.

To connect the app, set `VITE_ENGINE_URL=http://127.0.0.1:8787` in the app's `.env` and restart the Vite dev server. Use 127.0.0.1 and not `localhost`, because the server binds 127.0.0.1 only and on Windows `localhost` can resolve to ::1 first. The app still needs its own Supabase settings to load profiles, because the engine only ranks the profile ids it is sent.

This works with `npm run dev`, with the app on `http://localhost:5173`, which is the origin the server allows by default. `npm run dev:lan` is not supported, because it serves the app over HTTPS and a browser blocks an HTTPS page from calling this HTTP server. If Vite starts on another port, for example 5174 because 5173 is busy, set `LOCAL_ALLOW_ORIGIN` to that origin, such as `LOCAL_ALLOW_ORIGIN=http://localhost:5174`.

The local server also answers `POST /extract`. With AWS credentials it calls the extraction model. Without them the call fails and the answer is the keyword result with `degraded` true, so the app can be tried offline.

The stub options work here too. `STUB_DELAY_MS` adds a delay in milliseconds for each profile, `STUB_FAILURE_RATE` is the share of profiles (0 to 1) that fall back, and `STUB_CRASH=true` makes the engine throw so the job ends as failed.

## Organization name check

An employer name in embedded text would reward that employer in Fit, so no fragment text may contain an organization name. `npm run check-artifact -- <artifact.json>` loads an index artifact and reports every fragment that contains one. Terms come from Supabase when `SUPABASE_URL` and `SUPABASE_ANON_KEY` are both set, otherwise from `--orgs <file.json>`, a JSON object `{ "names": string[], "aliases": string[] }`. Names and aliases follow one case rule, the same one the query builder uses: a term with a capital after the first letter of any of its words, such as `UN`, `PATH` or `CoST`, matches only in that case, and any other term, such as `World Bank` or `Pact`, matches without regard to case. A name like `Pact` can therefore still hit the ordinary word "pact". Matching is by whole phrase, and any run of whitespace between words counts.

The output is `fragments <n>`, `terms <n>` and one line per hit as `fragmentId profileId type term`. It never prints fragment text. Exit 0 means no hits, 1 means hits, 2 means a usage or load error.
