# Plan: make the AI extraction of the job description work in AWS

| | |
|---|---|
| Status | Approved by the project lead on 2026-11-23, with the decisions of section 4 as recommended. Built and checked offline on 2026-11-23 (section 8), waiting for the review of the project lead. Not applied to AWS and not measured |
| Phase | P2 (job description parsing), closing the gap left by pull request 85 |
| Task | Add the `POST /extract` route and a separate `extract` Lambda so the extraction code merged in pull request 85 can run, with its limits, alarms and cost cut, and measure it |
| Owner | Guillermo Sandoval |
| Date | 2026-11-23 |
| Sources | Pull request 85 (merged as `0cf5e6e`) and its fallback commit `8e064ab`, `loop8/infra/modules/engine-api/main.tf`, `loop8/infra/modules/cost-guard/main.tf`, `loop8/infra/bootstrap/bootstrap.yaml`, `loop8/engine/src/api/`, `loop8/engine/src/extract/`, `loop8/engine/src/bedrock/sol.ts`, `loop8/engine/src/models/text-model.ts`, `loop8/engine/src/stage2/retry.ts`, `loop8/docs/planning/nova-temporary-models-plan.md`, `loop8/docs/reports/first-real-runs-report.md` sections 10 and 11, `loop8/CLAUDE.md` sections 3 and 9 |

Every cost, latency and quality figure that depends on the new route is unknown until the measurement in section 6. Limits written here are estimates and are marked as such.

## 1. What this task is for

Pull request 85 added the code that reads a job description with a model: the extraction module, a client for it in the app and a `POST /extract` handler inside the `api` Lambda. It did not add the route to API Gateway, which has only `POST /jobs` and `GET /jobs/{id}`. On 2026-11-23 a request to `/extract` returned 404 without CORS headers, so a browser sees it as a network error. The app now falls back to the keyword extractor after at most 10 seconds (commit `8e064ab`), so nothing breaks, but the AI extraction never runs.

Three more facts block it. The `api` Lambda has no Bedrock permission by design, its timeout is 10 seconds, and Terraform does not set `EXTRACT_MODEL`, whose code default is GPT-6 Sol, which is blocked for this account. The extraction client in the engine has its own retry rules and no timeout per call, unlike the hardened client used by Fit and the summaries.

This task is also the first step of point 4 agreed with the customer (the AI suggests Important and Must have), which needs a working extraction call. The extra value of the model over the keyword extractor is not proven: the pull request reports 54 of 62 expected terms against 53, with Nova Pro and a single run, and Loop8 has not repeated it. Section 6 repeats it.

## 2. What the design already decided

1. The `api` Lambda calls no model. The `api` role has no Bedrock statement and the module test `api_role_cannot_call_models` checks it.
2. Extraction reads the job description once, in one synchronous call, and never per candidate.
3. Extraction suggests expertise, locations and languages only. It never sets a Must have and never fills the employer (`loop8/CLAUDE.md` section 3.4). Its result is the union with the keyword extractor, so recall can only rise, and a model failure returns the keyword result.
4. The customer pays for AWS. Every resource carries the funding tag. The monthly budget is 350 dollars, with a deny on model calls at 100 percent for the engineers and at 150 percent for the service roles.
5. Terraform and the pipeline create everything. The apply runs when a change reaches `loop8-develop`. The apply role is limited by name prefix, `mavenscout-engine-*` for Lambda functions and the names to match for IAM roles.
6. Sol is blocked, so Nova Pro is the temporary text model (`loop8/docs/planning/nova-temporary-models-plan.md`). The model is a variable, so changing it later is one line.
7. The API has no authentication because the sign in of the app is mocked. The protection of each route is throttling, a daily cap and the budget cut. This is an accepted risk that the customer must be told about.

## 3. What will be built

### 3.1 Engine code (`loop8/engine/`)

1. A new Lambda handler `src/extract/handler.ts`. The route logic (`isExtractionContext` and the validation now in `extractJd`) moves from `src/api/app.ts` to `src/extract/route.ts` as a function that takes the extractor and the limits. `handleApi` loses the `/extract` route and its `extract` dependency, and `src/api/handler.ts` loses the Sol client. The `api` bundle no longer contains the Bedrock SDK. Its zip was 324 KB before pull request 85 and 512 KB after, as measured on 2026-11-22.
2. The model call of the extraction uses `createBedrockTextModel` and `withRetry` from `src/models/` and `src/stage2/`, the same client as Fit. The default 25 second timeout does not fit a route that API Gateway cuts at 30 seconds, so extraction uses a 10 second timeout per call, at most two tries, and a deadline taken from the Lambda context so that no retry starts when less than the call timeout remains. `parseExtraction` and its type move to `src/extract/parse.ts`. `src/bedrock/sol.ts` is deleted, and `src/local-server.ts` and the tests that import it change with it. The token counters of `sol.ts` are replaced by the tokens returned by the text model, which the handler logs.
3. The response is `{ extracted, degraded, model }`. `degraded` is true when the model failed and the result is the keyword result, and `model` is the model id that ran. The app ignores both fields. The baseline harness reads them, prints how many extractions were degraded and labels the report with the real model, so a baseline can never measure the keyword result by mistake.
4. A daily cap for extraction. The handler calls `store.incrementDaily` with the key `extract-<day>`, which writes the item `DAY#extract-<day>` that the existing method already supports, and answers 429 with `daily_cap` when the cap is reached. The setting is `extractDailyCap` in `src/shared/limits.ts`, 300 by default (estimate, section 4).
5. One line of the app client, in `src/lib/matching/remote.ts`: a 429 with `daily_cap` fails at once instead of being retried for the 10 second budget. It is outside `loop8/`, so the issue states the reason: without it a manager would wait 10 seconds on every click after the cap is reached.
6. `build.mjs` builds a third entry, `extract`, and writes `dist/extract.zip`.
7. Logs: one `extract_done` line per call with the model id, input tokens, output tokens, duration, degraded and the counts of suggestions. The text of the job description and the model reply are never logged.

### 3.2 Terraform (`loop8/infra/`)

1. In the module `engine-api`: the archive of `extract`, the log group `/aws/lambda/mavenscout-engine-extract` with 14 days of retention, the role `mavenscout-engine-extract-role`, and the Lambda `mavenscout-engine-extract` (Node 22, 25 second timeout, 512 MB, estimates).
2. The extract role has three statements and nothing else: logs, `bedrock:InvokeModel` on the extraction model through the US inference profile (the profile and the model in the three regions, using the same list as the worker), and `dynamodb:UpdateItem` on the jobs table limited by the condition `dynamodb:LeadingKeys` to `DAY#extract-*`. It has no S3, no queue and no secret access.
3. A second integration to the extract Lambda, the route `POST /extract` with the same Checkov skip for CKV_AWS_309 as the other routes, and its Lambda permission for `POST /extract`. The existing permission only matches paths that start with `/jobs`.
4. Route settings for `POST /extract` in the stage, with its own rate and burst (1 and 3 per second, estimates), set by variables.
5. Alarms for the extract Lambda: errors, and a duration above 20 seconds. Throttle alarms for the Nova Pro profile id and model id, added to `bedrock_throttle_alarm_models`. The token alarms for Nova Pro already exist.
6. The cost guard: the extract role is added to `worker_role_names`, so the 150 percent action denies model calls to it too, and the budget action role may attach the deny policy to it.
7. New variables with defaults: `extract_model` (`us.amazon.nova-pro-v1:0`), `extract_profile_model_ids` (`amazon.nova-pro-v1:0`), `extract_rate_limit`, `extract_burst_limit`, `extract_memory_mb`. The description of `engine_text_model` stops mentioning extraction.
8. Module tests with the mocked provider: the extract role has only the three statements and only the extraction model, the `api` role still has no Bedrock statement, the stage has the route settings, the function has the model in its environment, the alarms exist and notify the alerts topic, and the cost guard lists the role.

### 3.3 Documentation, in the same pull request

1. This plan gets a build record after the validation (section 8, written later).
2. `loop8/docs/runbooks/poc-environment.md`: inventory rows and change log entries, marked pending apply until the apply runs.
3. `loop8/engine/README.md`: a section on extraction, its route, limits and failure behavior.
4. `loop8/docs/reports/first-real-runs-report.md`: deviation 6 and point 4 change only after the measurement, in the follow up pull request.
5. `loop8/README.md`: a row for this plan.

## 4. Assumptions and decisions for the project lead

Decisions of the project lead on 2026-11-23. Each one follows the recommendation of this plan:

1. A separate `extract` Lambda. The `api` Lambda keeps no model access, and extraction has its own timeout, alarms and 150 percent cut. The cost is one more Lambda, role and log group.
2. A daily cap of 300 extractions with a counter item in the jobs table, written by a role limited to that key. Without a cap, the route is open to anyone who finds it, and the only brakes would be a throttle that still allows tens of thousands of calls a day and a budget action that reacts to spend data that arrives with a delay.
3. Nova Pro as the extraction model while Sol is blocked. Nova 2 Lite did best on the hard Fit cases, but that was Fit and not extraction, so it is not a reason to choose it here. The model is a variable.
4. The `degraded` and `model` fields in the response, so a measurement can tell a model result from the keyword result.
5. The code of pull request 85 is reworked: its route and its model client move. The project lead tells the engineer who wrote it.

Assumptions:

1. The API Gateway integration timeout for HTTP APIs is 30 seconds, its default and maximum, and it cannot be raised. Confirmed on 2026-11-23 in the AWS quotas page for HTTP APIs.
2. A setting for one route in the stage limits that route separately from the default settings. To confirm by reading the stage after the apply.
3. CORS is configured for the whole API, so the new route answers with the CORS headers. The preflight already answers 204 for any path, measured on 2026-11-23, and the 404 without headers was caused by the missing route.
4. One extraction with Nova Pro takes a few seconds for a job description of up to 15,000 characters with the expertise list in the prompt. Unknown until measured, and the 25 second timeout and 10 second call timeout depend on it.
5. The apply role may create the new Lambda, role, policy, log group and alarms by the prefix `mavenscout-engine-*`, and may pass the role to Lambda and Budgets. Confirmed on 2026-11-23 by reading `loop8/infra/bootstrap/bootstrap.yaml`. The bootstrap stack does not change.
6. The plan of Terraform may show the budget action at 150 percent as a replacement and not an update in place. If it does, the plan is read before any approval, because the action is the cost cut.

## 5. Impact analysis

1. Cost. Each pasted job description is one model call. The tokens per call are unknown, so no figure is written here. With the cap of 300 calls a day the worst day is bounded, and the figure is computed after the measurement from the measured tokens and the AWS price list. The Lambda itself costs cents.
2. Security. A new route that spends money and has no authentication. Limits: its own throttle, the daily cap, a role that can only call the extraction model and write one counter key, the 150 percent cut, and logs that never carry the text. The residual risk is up to the cap in calls a day by anyone with the URL, the same accepted risk as `POST /jobs`, and Chad must tell the customer.
3. Personal data. A job description can name an organization and people. It is sent to a model in the customer account and not stored: the extract role has no S3 access and the counter holds no text.
4. Existing paths. The `api` Lambda code changes, because the extraction code leaves it. The ranking path is covered by the existing tests of `createJob` and `getJob`, and the worker bundle does not change.
5. The app. Only `remote.ts` changes, for the 429 case, plus the baseline script. The fallback of commit `8e064ab` stays as the floor.
6. Terraform. New resources: Lambda, role and its policy, log group, integration, route, permission, three alarms. In place changes expected: the stage, the budget action role policy, the 150 percent action. Read the plan for anything else.
7. Time. The apply runs on merge. Until the apply, the app behaves as today.
8. Reversal. Revert the pull request: the pipeline removes the route and the Lambda, and the app falls back to the keyword extractor without change.

## 6. Acceptance criteria

1. In the pipeline: `terraform fmt -check`, validate, the module tests, tflint and Checkov pass, and `npm run build` and the engine tests pass.
2. The tests assert section 3.2 point 8. The `api` bundle in `dist/api/index.mjs` does not contain `client-bedrock-runtime`, checked by a search and by the zip size.
3. The 301st extraction of a day answers 429 `daily_cap`, in a unit test. After the apply, one real call writes the counter item and it is read back.
4. After the apply, read only checks: the preflight answers with the CORS headers, a body that is not valid answers 400 from the extract Lambda with the CORS headers, the stage shows the route settings, the role policy shows only the three statements, a policy simulation allows `dynamodb:UpdateItem` on a key `DAY#extract-<day>` and denies it on a job key, and the budget action lists the role.
5. A real call with each of the five sample job descriptions answers 200 with `degraded` false and the model id, and the log line shows tokens and duration.
6. In the app with `VITE_ENGINE_URL` set, "Read job description" shows the suggestions in the measured time and without the 10 second fallback wait, with the project lead's approval for that click.
7. Quality, measured and reported whatever the result: `npm run baseline` with the engine and without it, the recall of the 62 expected terms and the unexpected suggestions in both. The target is more than 53 of 62 with no new false positives. The target is not a promise: if it is not reached, the result is reported with its cost and the decision on keeping the model call goes to the project lead.
8. Latency and cost: at least 10 real extractions (the five sample job descriptions twice) give the median and the maximum duration, the tokens per call, and the cost per call from the AWS price list. Raw logs go to `loop8/evidences/poc/<date>/` with a section file, in the pattern of the earlier runs.
9. The plan of Terraform shows only the resources of section 5 point 6, and the project lead has read it before the merge.

## 7. Remaining steps

1. Approval of this plan and of the decisions in section 4.
2. With approval: the GitHub issue, with the problem, context, acceptance criteria and the reason for the change outside `loop8/`, and the branch `feature/<issue number>-extract-route` from `loop8-develop`.
3. Done on 2026-11-23: the apply role scope (assumption 5) and the integration timeout (assumption 1) were checked and need no change.
4. Engine code and tests (3.1), commits of one logical change each, reviewed after each commit.
5. Terraform and its tests (3.2), with the local checks run under the pinned tool versions.
6. Documentation (3.3), without any measured claim.
7. Review by the project lead. Commit locally only after that.
8. With approval: push, open the pull request against `loop8-develop`, read the Terraform plan comment, tell the engineer of pull request 85.
9. With approval: merge. The pipeline applies. Run the read only checks of criterion 4.
10. Measure (criteria 5 to 8) with approval for each call that spends money, then write the build record in section 8 and update the report, deviation 6 and point 4, in a follow up pull request of documents.
11. Chad receives the results and the security note for the customer.

Not part of this task: the AI suggestions of Important and Must have (point 4), the monthly cap per manager (point 5), summaries on demand, and the change to the agreed models when AWS enables them.

## 8. Build record

Written on 2026-11-23 after the offline checks. The checks that need AWS (the apply, the read only checks, the measurements of criteria 3 to 8) are not done, and no figure of quality, latency or cost exists yet.

### 8.1 What was built

Sections 3.1, 3.2 and 3.3 as planned, in issue 86. The extract route logic is in `src/extract/route.ts`, the handler in `src/extract/handler.ts`, the model call in `src/extract/complete.ts` and the reply parser in `src/extract/parse.ts`. `src/bedrock/sol.ts` is deleted. The api code (`src/api/app.ts`, `src/api/handler.ts`) is as it was before pull request 85, without the extraction.

### 8.2 Offline checks

| Check | Result |
|---|---|
| Engine type check and tests | Pass, 446 of 446. The new tests cover the route (validation, the cap of 300 with the 301st answering 429, count per day and separate from the job cap, a counter failure not hidden), the model call (retry once, no retry near the deadline, tokens counted, empty reply) and the fallback flag |
| App type check and build | Pass |
| App client tests | Pass: a `daily_cap` 429 fails at once, another 429 is retried, `onResult` reports `degraded` and `model` |
| Terraform format, validate and module tests | Pass. engine-api 17 of 17, the other four modules unchanged and passing |
| tflint | One warning that was already there (`enable_opensearch` is declared and unused) |
| Checkov | 231 passed, 0 failed, 35 skipped. The new skips follow the ones of the api function and routes, each with its reason |
| Size of the zips | `api.zip` 326,486 bytes (it was 512 KB after pull request 85 and 324 KB before), `extract.zip` 498,704 bytes, `worker.zip` 542,585 bytes |
| Bedrock SDK in the bundles | None in `dist/api/index.mjs`. It is in the extract and worker bundles |

### 8.3 Differences from the plan

1. `scripts/ranking-baseline.ts` wrote the engine URL into the generated report (`docs/samples/ranking-baseline-engine.md`) and the console. The repository is public, so the URL is no longer written or printed. This came with pull request 85 and was found while adding the `degraded` count.
2. The route settings of the stage and the budget action update are not checked until the plan of Terraform is read on the pull request. Assumptions 2 and 6 of section 4 stay open.
3. The IAM condition `ForAllValues:StringLike` on `dynamodb:LeadingKeys` is covered by the module test, but its effect is only proven by a policy simulation after the apply. It is added to criterion 4.
