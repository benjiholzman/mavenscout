# Plan: connect the semantic engine to the worker in AWS

| | |
|---|---|
| Status | Applied on 2026-11-20 (pull request 62) and checked. The engine was turned on on 2026-11-21 (pull request 70, section 10) |
| Phase | P2 (engine wiring, deploy) |
| Task | Give the worker and API Lambdas what the semantic engine (variant A) needs to run in the customer account: model access, the Supabase secret, the index artifact and the settings, and cut the worker role at 150% of the budget |
| Owner | Guillermo Sandoval |
| Date | 2026-11-20 |
| Sources | Pull requests 55 and 60 (`loop8/engine/README.md`, `src/engine/factory.ts`, `src/core/settings.ts`), `loop8/infra/modules/engine-api`, `loop8/infra/modules/cost-guard`, `loop8/docs/planning/engine-deploy-plan.md`, `loop8/docs/planning/nova-temporary-models-plan.md`, `loop8/docs/runbooks/poc-environment.md` |

All cost figures in this document are estimates. None has been measured in this account.

## 1. What this task is for

The worker Lambda runs the stub engine today. It has no model, secret or index permission, by design (`engine-api/main.tf`). The engineers finished the semantic engine for variant A in pull requests 55 and 60. It is off by default (`ENGINE=stub`), so nothing changes in AWS until this task turns it on. The customer review is on 2026-11-23 and the variant A comparison needs the engine running in the account.

## 2. What the design already decided

1. Models are settings by role. Variant A uses one model for Fit and for summaries. While GPT-6 is blocked, that model is Nova Lite (`us.amazon.nova-lite-v1:0`), with Titan Text Embeddings V2 for embeddings ([nova-temporary-models-plan.md](nova-temporary-models-plan.md)).
2. The engine reads the fit and text model ids and the counts from the job settings. The API function reads them from its environment when a job is created and saves them with the job. The code defaults still point to Luna, so the API environment must set them.
3. Secret values never go through chat, the repository, the plan or the state. Terraform names the secret, the Lambda reads it at run time.
4. The apply role is not widened. It already creates policies and roles named `mavenscout-engine-*`, and the budget action.
5. The worker role is cut at 150% of the budget, as written in `cost-guard/main.tf`, and the engineers at 100%.
6. The API role cannot call any model and keeps it that way.

## 3. What will be built

| Part | What |
|---|---|
| Worker role policy (`engine-api`) | Adds `bedrock:InvokeModel` on Titan V2 and on the models of variant A through the `us.` profile: the profile of the account and the foundation model in us-east-1, us-east-2 and us-west-2 (same shape as the engineer policy). Adds `secretsmanager:GetSecretValue` on the ARN of `mavenscout/supabase` only. The worker already has `s3:GetObject` on the jobs bucket, which covers the index artifact |
| Worker environment | `SUPABASE_SECRET_ID=mavenscout/supabase` and `INDEX_ARTIFACT_S3_KEY` with the key of the gzipped index. `ENGINE` stays `stub` in this change |
| API environment | `FIT_MODEL`, `TEXT_MODEL` and `EMBED_MODEL` set from root variables. The counts and the threshold keep the code defaults |
| Variables | New root variables for the worker model ids and the index key, with the temporary mapping in their descriptions. Defaults are Titan V2 and Nova Lite |
| Budget cut at 150% (`cost-guard`) | A second budget action that attaches the existing deny policy to the worker role at 150% of actual spend, and the permission for the action role to attach it to that role only |
| Token alarms | Nova Lite and Titan V2 alarms already exist. No new token alarm |
| Failure alarms (`engine-api`, `cost-guard`) | Five new alarms that notify the existing alerts topic: worker Lambda errors, worker Lambda throttles, worker duration above 150 seconds (83% of the 180 second timeout, so a timeout is seen before it happens), and Bedrock invocation throttles for Nova Lite (one for the profile id and one for the model id, as for the token alarms). The dead letter queue alarm already exists. Estimate about 0.10 dollars a month each |
| Module tests | New runs in `engine_api.tftest.hcl` and `cost_guard.tftest.hcl`: the worker policy has the model, the secret and the S3 statements and no wildcard, the API role has no Bedrock action, the 150% action targets the worker role only |
| Runbook and index | The runbook inventory and change log get the new rows, marked pending apply. The README index gets a row for this plan |

Error handling is part of this task because calls to a model fail often. What exists today and what is asked is in section 8.

A second, separate change turns the engine on: `ENGINE=semantic` on the worker, after the index artifact is in the bucket. It needs its own approval, because from then on every job calls the models and costs money.

## 4. Assumptions

1. The engineers build and upload the index artifact (gzipped JSON, `scripts/build-index.ts`) to the jobs bucket. This task only passes its key. An index that is not gzipped fails the job after five receives (engine README).
2. The Nova Lite quotas are enough: 400 requests and 8,000,000 tokens per minute across regions. With the Fit cap at 200 and the demo pool of about 98 profiles, one ranking is about 100 Fit calls plus 5 summaries (estimate, not measured). The jobs at once are capped by `max_jobs_at_once`, so two rankings together stay inside the limit. The engine retries with backoff on throttling.
3. The worker timeout of 180 seconds is enough for about 100 calls at 16 in parallel. This is not measured. If a run reaches the timeout, the retry repeats the calls, which costs more (engine README, known limit 1).
4. The guardrail `Loop8-Security-Guardrails` does not deny `bedrock:InvokeModel` or `secretsmanager:GetSecretValue` for a role named `mavenscout-engine-*`. This is not known. The engineer role proved the same names work for IAM policy and attachment. If it denies, the apply fails and the fix is a decision of the project lead, not a change to the guardrail by us.
5. Pull request 55 changes both Lambda functions when it merges, because the pipeline builds the zip from `loop8/engine`. The behavior stays the same with `ENGINE=stub`.

## 5. Impact analysis

0. Failure design: see section 8. The infrastructure side (alarms, timeout headroom, queue settings) is in this change. The code side belongs to the engine pull requests.

1. Exposure: only the worker role can read the Supabase secret besides the engineers. The anon key is the public publishable key by design, and `SUPABASE_DB_URL` is not set.
2. Cost: the Lambda and IAM changes are free. Model use is billed per token to the customer. Estimate for one ranking with Nova Lite, from public prices that are not confirmed in this account: about 1.5 cents (about 100 Fit calls of about 2,500 input tokens). At the daily limit of 100 jobs that is about 1.50 dollars a day, inside the 350 dollar monthly budget and its actions.
3. Failure: the 150% cut denies the worker model access if spend runs away. Billing data lags by hours, so it is not an instant cap, which is why the token alarms exist.
4. Customer: the models are temporary and not the ones the customer accepted. The project manager tells the customer before 2026-11-23.
5. Reversal: removing the statements and variables in a pull request removes the access. The secret and the index are not touched.

## 6. Acceptance criteria

1. The plan on the pull request shows only IAM, Lambda configuration and budget action changes, with 0 destroys, and the apply succeeds.
2. `aws iam simulate-principal-policy` for the worker role returns allowed for `bedrock:InvokeModel` on Titan V2 and on the Nova Lite profile, allowed for `GetSecretValue` on `mavenscout/supabase`, and implicit deny for any other model or secret, and for the API role on every model.
3. The API function environment shows the Nova Lite ids for `FIT_MODEL` and `TEXT_MODEL` (read with `get-function-configuration`, names and ids only).
4. With `ENGINE=stub` a job still finishes as before.
5. With `ENGINE=semantic` (second change) one ranking of the demo pool finishes, with the Fit and text model ids in its result, and the token alarms show data for the profile id or the model id.
6. The five failure alarms exist, are in state OK or INSUFFICIENT_DATA, and notify the alerts topic.
7. `terraform fmt`, `terraform validate`, the module tests, tflint, Checkov and the pre-commit hooks pass, and the next plan has no pending changes.

## 7. Remaining steps

| # | Step | Who | Needs approval | Proof it worked |
|---|---|---|---|---|
| 1 | Review this plan | Project lead | Yes | Plan accepted |
| 2 | Merge pull request 55 (changes both Lambda zips, behavior unchanged) | Project lead | Yes (merge, and the apply changes the customer account) | Plan shows 2 Lambda changes, `ENGINE=stub` job finishes |
| 3 | Fit cap change in pull request 60, then merge 60 | Krish, project lead | Yes (merge) | Pull request 60 updated, tests pass |
| 4 | Local change and module tests for this plan | Claude | No (local only) | Tests pass, diff reviewed by the project lead |
| 5 | Issue, branch, commit and pull request to `loop8-develop` | Project lead | Yes (issue, push, pull request) | Criterion 1 |
| 6 | Merge, which runs the apply | Project lead | Yes (merge, and the apply changes the customer account) | Criteria 1 and 3 |
| 7 | Run the simulate check | Project lead | No (read only) | Criterion 2 |
| 8 | Krish builds and uploads the gzipped index to the jobs bucket | Krish | No | Object exists, `check-artifact` passes |
| 9 | Second change: `ENGINE=semantic` and the index key on the worker | Project lead | Yes (issue, pull request, merge, and every job costs money from then on) | Criterion 5 |
| 10 | Tell the customer about the temporary models through Chad | Project lead and project manager | Yes | Customer informed before 2026-11-23 |
| 11 | Update the runbook inventory and add the build record below | Project lead | Yes (commit and pull request) | Inventory rows |

## 8. Error handling of the model calls

Calls to a model fail often, so the engine and the infrastructure are checked for it. What is in pull request 60 today was read on 2026-11-20 and is described here. The model error names are from the Bedrock API reference as remembered, and they are confirmed with a real call before the code changes.

What already works:

1. Throttling and transient errors (`ThrottlingException`, `ServiceUnavailableException`, HTTP 429 and 5xx) are retried 3 times with full jitter backoff, and the SDK own retry is off (`maxAttempts` 1), so retries do not multiply.
2. Errors that a retry cannot fix (`AccessDenied`, `ValidationException`, `ResourceNotFoundException`, and the message `not available for this account`) fail the job at once with `fit_model_unavailable`, instead of five receives. This is the exact error the blocked models give today.
3. A reply that is cut off or is not valid JSON is retried once, and the tokens of every reply are counted because they are billed. A summary of the wrong length or one that names another band is retried once.
4. One failed Fit, score or summary falls back for that candidate only, with an honest note. If every Fit call fails, the job does not finish as DONE.
5. After a caught retryable error the worker releases its lease and requeues the message after 10 seconds. The queue sends a job to the dead letter queue after 5 receives, and an alarm fires when that queue is not empty. Logs carry the error name only, never request or model text.

Gaps found, in the order of how much they matter (a model call fails often, so every item has an owner):

| # | Gap | Why it matters | Who | Proposed fix |
|---|---|---|---|---|
| 1 | The Bedrock client has no request timeout (`bedrockClientConfig` sets only region and `maxAttempts`) | A call that hangs holds a slot until the Lambda timeout, and the retry then repeats every call | Engine, pull request 60 | Set a connection timeout and a request timeout of about 25 seconds, and treat the timeout as retryable. Done in pull request 68 (request timeout of 25 seconds, `RequestTimeout` is retryable). The connection timeout is left to the SDK default |
| 2 | The run has no deadline. Results are saved only at the end | A timeout at 180 seconds loses the whole run, and the next receive pays for the calls again (engine README, known limit 1) | Engine | Read the remaining time from the Lambda context. When less than about 30 seconds remain, stop new calls, skip the summaries (use the template text) and save. Done in pull request 68 (Fit stops 75 seconds and summaries 45 seconds before the end of the Lambda time) |
| 3 | Backoff gives up after about 3.5 seconds in total (3 retries, 500 ms base) | Under real throttling, many Fit calls fail and the ranking mixes real Fit with estimates, with no sign of it beyond a note on each candidate | Engine | Retry throttling longer with a capped wait, lower the parallel calls after a throttle, and record the share of fallbacks in the job result so a degraded ranking is visible. Done in pull request 68 (5 retries with an 8 second cap, calls in flight halved after a throttle, throttles, retries, fallbacks and skipped on the phase records) |
| 4 | Only the job failing when every Fit call fails | A run where 80 of 100 calls fail still ends DONE | Engine and project lead | Fail and retry the job when more than a set share of Fit calls fell back (the share is a setting, to agree) |
| 5 | `ModelTimeoutException` (HTTP 408) and `ModelErrorException` (HTTP 424) are not in the retryable list | They are transient and are treated as final for that call | Engine | Add them to `isThrottling`, after checking them in a real call. Done in pull request 68 in a new `isRetryable`, so `isThrottling` keeps its meaning. The names are not confirmed with a real call because they cannot be forced |
| 6 | A reply blocked by a content filter shows as an empty text, which is counted as a cut off reply | If all replies were blocked the job would fail as a model setup problem | Engine | Read the stop reason and keep it apart from a cut off reply. Low priority |
| 7 | Only the dead letter queue and the token alarms exist | Nobody is told about Lambda errors, throttles, a run close to its timeout or Bedrock throttling | Infrastructure, this plan | The five failure alarms in section 3 |
| 8 | Worst case calls per job are the calls times 4 attempts times 5 receives (engine README) | The customer pays for them | Infrastructure and engine | Gaps 1 and 2 reduce it. `max_jobs_at_once` stays at 2, so two rankings together stay inside the 400 requests per minute of Nova Lite |

Gaps 1, 2, 3 and 5 are closed in pull request 68 (`engine-hardening-plan.md`). Gap 7 is built in this plan. Gaps 4 and 6 are decided after the first runs with real calls show which errors happen.

Checks. Tests in the modules `engine-api` and `cost-guard` show the alarms exist, notify the alerts topic and fire below the worker timeout, and that the 150% action targets the worker role. The behavior of the engine is checked with the engine tests (injected failures) and, after `ENGINE=semantic`, with one real run that is forced to throttle by a low `PARALLEL_CALLS`. Nothing is forced against the customer account without approval.

## 9. Build record

| Date | Step | What was done and how it was checked |
|---|---|---|
| 2026-11-20 | 1, plan written | This plan was written from pull requests 55 and 60 and the current Terraform. Nothing is built or applied. Pull request 55 shows 0 to add, 2 to change, 0 to destroy (both Lambda functions updated in place) |
| 2026-11-20 | 4, local change | Issue 61. The module `engine-api` got the worker model and secret statements, the optional settings of the functions and three failure alarms. The module `cost-guard` got the 150% action for the worker role and the Bedrock throttle alarms. The module `engine-secrets` got the outputs `secret_arns` and `secret_ids`. The root passes Titan V2 and Nova Lite to the worker, the Nova Lite ids to the api and the worker role to the budget cut. `terraform fmt` and `terraform validate` pass, and `terraform test` passes offline in `engine-api` (8 of 8 runs), `cost-guard` (5 of 5) and `engine-secrets` (5 of 5). Nothing is applied. The apply plan on the pull request decides whether the guardrail allows these permissions for a role named `mavenscout-engine-*` |
| 2026-11-20 | 5 and 6, pull request and apply | Issue 61 and pull request 62 merged (merge commit 81167e3). The plan showed 6 to add, 4 to change, 0 to destroy and the apply finished with 6 added, 4 changed, 0 destroyed, so the guardrail did not deny the permissions for a role named `mavenscout-engine-*` |
| 2026-11-20 | 7, simulation and checks | The worker role returned `allowed` for Titan V2, for the Nova Lite profile and its models in us-east-1, us-east-2 and us-west-2, and for `GetSecretValue` on `mavenscout/supabase`, and `implicitDeny` for Nova Pro, Luna and another secret name. The api role returned `implicitDeny` for a model and for the secret. The api function has `FIT_MODEL` and `TEXT_MODEL` set to the Nova Lite profile and `EMBED_MODEL` to Titan V2. The worker has `SUPABASE_SECRET_ID` and no `ENGINE` or `INDEX_ARTIFACT_S3_KEY`. Both budget actions (100 percent for the engineer role, 150 percent for the worker role) are in standby, and the five alarms exist in state OK or INSUFFICIENT_DATA. A job with the stub engine finished DONE in 1.4 seconds with 3 of 3 candidates. Acceptance criteria 1, 2, 3, 4, 6 and 7 are met |
| 2026-11-20 | 8 and 9, pending | Criterion 5 is open: the gzipped index in the jobs bucket, the engine pull request 60 with the error handling changes, and the separate change that sets `ENGINE=semantic` and the index key. The customer is told about the temporary models through the project manager |

## 10. Turning the engine on

Written on 2026-11-21 before the change, for issue 69. This is the separate change that section 3 left for later.

What it is for. The AI models do not run in AWS today, because the worker has no `ENGINE` and the stub answers every job. The customer review is on 2026-11-23 and the quality of the AI ranking has to be shown running in the account, not only in the engineers' local comparison.

What is already decided. The worker role, the secret, the model settings, the budget cut, the failure alarms (this plan) and the model call limits (`engine-hardening-plan.md`) are applied. The first variant is the small model alone for everything, here Nova Lite, with 5 summaries.

What will be built.

1. The index artifact, built on 2026-11-21 from the 98 local demo profiles with Titan V2 (964 fragments, index version `bda903154e95230e`, 9.4 MB gzipped), uploaded by hand to `index/index.json.gz` in the jobs bucket. It is not in the repository.
2. A variable `engine_mode` in the module `engine-api` and in the root, which sets `ENGINE` on the worker. The root default is `semantic`, and the root default of `index_artifact_key` is `index/index.json.gz`. Empty returns the worker to the stub.
3. The bucket lifecycle limited to `inputs/` and `results/`, because the 7 day expiry covered every object and would have deleted the index on 2026-11-28.

Assumptions.

1. The index built from the local demo seed matches the profiles in the customer database for the 97 approved ones. The engine reads the profile data for scoring from the database, so a profile that is in the index and not in the database falls back with `profile_missing`.
2. Reading and parsing the 9.4 MB index on a cold start takes a few seconds of the 180 second run. Not measured.
3. The index text contains organization names in 42 profiles (159 hits of `npm run check-artifact`). Fit is told to ignore employer names and nothing removes them. This is known limitation 3 of the engine README. It affects the quality claim and is not fixed here.

Impact analysis.

1. From the apply every job calls Titan V2 once and Nova Lite once for each candidate judged (up to 200) and for up to 5 summaries. The customer pays for these calls. The cost per job is not measured, and the engineer reported about 0.20 dollars for his whole comparison.
2. The worst case is bounded by 100 jobs a day, 200 candidates per job, the token alarms and the 150 percent cut of the worker role.
3. The summaries fall back to the template text until the engineer's fix for the summary length is merged.
4. Reversal: set `engine_mode` to empty in a pull request. The index is not touched.

Acceptance criteria.

1. The plan shows the worker updated in place and the lifecycle changed, with 0 destroys, and the apply succeeds.
2. The worker has `ENGINE=semantic` and the index key.
3. A job posted to the deployed API with a real job description and pool ids finishes DONE or PARTIAL, with Fit from Nova Lite and the index version in its result.
4. The dead letter queue is empty and no alarm fires.

Remaining steps. The apply and the real job (build record below after they are done), the engineer's summary fix and a decision on the organization names in the index text.

### 10.1 Build record

| Date | Step | What was done and how it was checked |
|---|---|---|
| 2026-11-21 | Index built and uploaded | Built with the hand run script from the 98 local demo profiles with Titan V2: 964 fragments, index version `bda903154e95230e`, 42,765 input tokens, 9.4 MB gzipped, uploaded to `index/index.json.gz`. `npm run check-artifact` against the organization list of the customer database reported 159 organization names in the free text of 42 profiles, which is known limitation 3 and was not fixed |
| 2026-11-21 | Turned on | Issue 69 and pull request 70 merged. The first pipeline run failed the Checkov check CKV_AWS_300, which accepts the abort setting only on a rule with an empty filter, so the lifecycle has a third rule for that. The apply finished with 0 added, 2 changed, 0 destroyed. The worker has `ENGINE=semantic` and the index key, and the 7 day expiry covers only `inputs/` and `results/` |
| 2026-11-21 | First real job | One job posted to the deployed API with ToR 01, its 9 requirement rows and 121 pool profiles (the pool query did not exclude firms) finished PARTIAL in 13.4 seconds, 92 profiles ranked. Fit and text model `us.amazon.nova-lite-v1:0`, embedding Titan V2, prompt `fit-v2+summary-v1`. No profile carried an estimate note, so every Fit call that was made succeeded. The dead letter queue was empty, no alarm fired and the worker log showed no error. The three expected profiles of ToR 01 were in the top 5 (ranks 1, 2 and 5). The summaries of the top 5 all fell back to the template text, the known length problem of Nova Lite. The 29 `not_indexed` profiles were 23 firms and 6 individuals |
| 2026-11-21 | Run from the app | The app on the project lead's machine, with `VITE_ENGINE_URL` set, ranked the 97 profiles of its pool for ToR 01 with two expertise priorities in 13.2 seconds: 91 ranked, 6 `not_indexed`, PARTIAL. The same top 3 as the API job. The app showed "6 more experts now meet your Must haves" for the 6 individuals. The ranking replaced the earlier unsaved ranking of the demo manager in the customer database, as the app does by design. The ranking saved to an opening was not touched |
| 2026-11-21 | Cause of the 6 | The 6 are the ToR 05 individuals. The seed gives them a slug and no id, and the index keyed them by slug, while the database holds them under an id derived from `demo-<slug>` by the seed build. The 6 derived ids matched the 6 `not_indexed` ids of the real job (issue 71) |
| 2026-11-21 | Index fixed | `demoKey` now derives the database id for a profile with a slug and no id, with tests for the six. The index was rebuilt with 0 Titan calls (all 964 vectors reused, the text is unchanged): version `13d7674312434864`, 98 profiles under their database ids, uploaded to `index/index-13d7674312434864.json.gz`. The key in Terraform points to it, so the apply replaces the worker environment and starts new containers (pull request 72). The result of the apply and of a job over the 98 individuals is recorded below once done |
