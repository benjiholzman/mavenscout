# Plan: connect the semantic engine to the worker in AWS

| | |
|---|---|
| Status | Local change written for issue 61, tests pass. Not applied |
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
| 1 | The Bedrock client has no request timeout (`bedrockClientConfig` sets only region and `maxAttempts`) | A call that hangs holds a slot until the Lambda timeout, and the retry then repeats every call | Engine, pull request 60 | Set a connection timeout and a request timeout of about 25 seconds, and treat the timeout as retryable |
| 2 | The run has no deadline. Results are saved only at the end | A timeout at 180 seconds loses the whole run, and the next receive pays for the calls again (engine README, known limit 1) | Engine | Read the remaining time from the Lambda context. When less than about 30 seconds remain, stop new calls, skip the summaries (use the template text) and save |
| 3 | Backoff gives up after about 3.5 seconds in total (3 retries, 500 ms base) | Under real throttling, many Fit calls fail and the ranking mixes real Fit with estimates, with no sign of it beyond a note on each candidate | Engine | Retry throttling longer with a capped wait, lower the parallel calls after a throttle, and record the share of fallbacks in the job result so a degraded ranking is visible |
| 4 | Only the job failing when every Fit call fails | A run where 80 of 100 calls fail still ends DONE | Engine and project lead | Fail and retry the job when more than a set share of Fit calls fell back (the share is a setting, to agree) |
| 5 | `ModelTimeoutException` (HTTP 408) and `ModelErrorException` (HTTP 424) are not in the retryable list | They are transient and are treated as final for that call | Engine | Add them to `isThrottling`, after checking them in a real call |
| 6 | A reply blocked by a content filter shows as an empty text, which is counted as a cut off reply | If all replies were blocked the job would fail as a model setup problem | Engine | Read the stop reason and keep it apart from a cut off reply. Low priority |
| 7 | Only the dead letter queue and the token alarms exist | Nobody is told about Lambda errors, throttles, a run close to its timeout or Bedrock throttling | Infrastructure, this plan | The five failure alarms in section 3 |
| 8 | Worst case calls per job are the calls times 4 attempts times 5 receives (engine README) | The customer pays for them | Infrastructure and engine | Gaps 1 and 2 reduce it. `max_jobs_at_once` stays at 2, so two rankings together stay inside the 400 requests per minute of Nova Lite |

Gaps 1, 2 and 3 are asked from the engineer in the review of pull request 60. Gap 7 is built in this plan. Gaps 4 to 6 are decided after the first runs with real calls show which errors happen.

Checks. Tests in the modules `engine-api` and `cost-guard` show the alarms exist, notify the alerts topic and fire below the worker timeout, and that the 150% action targets the worker role. The behavior of the engine is checked with the engine tests (injected failures) and, after `ENGINE=semantic`, with one real run that is forced to throttle by a low `PARALLEL_CALLS`. Nothing is forced against the customer account without approval.

## 9. Build record

| Date | Step | What was done and how it was checked |
|---|---|---|
| 2026-11-20 | 1, plan written | This plan was written from pull requests 55 and 60 and the current Terraform. Nothing is built or applied. Pull request 55 shows 0 to add, 2 to change, 0 to destroy (both Lambda functions updated in place) |
| 2026-11-20 | 4, local change | Issue 61. The module `engine-api` got the worker model and secret statements, the optional settings of the functions and three failure alarms. The module `cost-guard` got the 150% action for the worker role and the Bedrock throttle alarms. The module `engine-secrets` got the outputs `secret_arns` and `secret_ids`. The root passes Titan V2 and Nova Lite to the worker, the Nova Lite ids to the api and the worker role to the budget cut. `terraform fmt` and `terraform validate` pass, and `terraform test` passes offline in `engine-api` (8 of 8 runs), `cost-guard` (5 of 5) and `engine-secrets` (5 of 5). Nothing is applied. The apply plan on the pull request decides whether the guardrail allows these permissions for a role named `mavenscout-engine-*` |
