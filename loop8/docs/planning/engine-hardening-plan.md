# Plan: harden the model calls of the semantic engine

| | |
|---|---|
| Status | Applied on 2026-11-21 (pull request 68) and checked. The deviations from the blueprint are listed in section 9 and wait for the project lead's decision |
| Phase | P2 (engine wiring, error handling) |
| Task | Close gaps 1, 2, 3 and 5 of section 8 of `worker-engine-connect-plan.md`: a request timeout on the Bedrock call, a run deadline, longer and visible retry of throttling with fewer parallel calls after a throttle, and the two transient errors that were treated as final |
| Owner | Guillermo Sandoval |
| Date | 2026-11-21 |
| Sources | `loop8/docs/planning/worker-engine-connect-plan.md` section 8, `loop8/engine/src/stage2/` (merged in pull request 60), `loop8/engine/src/models/text-model.ts`, `loop8/engine/README.md`, the Bedrock Converse API error list as remembered |

All time and cost figures in this document are estimates. None has been measured in this account.

## 1. What this task is for

Calls to a model fail often. Pull request 60 retries throttling three times, fails fast on configuration errors and falls back per candidate, but four things are still open. A call that hangs has no timeout. A run has no deadline, so a Lambda timeout at 180 seconds loses every call of the run and the next receive pays for them again. The retry gives up after about 3.5 seconds, so a real throttling burst turns many Fit calls into estimates without any sign of it beyond a note on each candidate. Two transient errors, `ModelTimeoutException` (HTTP 408) and `ModelErrorException` (HTTP 424), are treated as final.

The summaries are not part of this task. The engineer is changing `src/stage2/summary.ts` and its prompt.

## 2. What the design already decided

1. One retry policy in `withRetry`, with the SDK retry off (`maxAttempts` 1), so retries do not multiply.
2. A failed Fit, score or summary falls back for that candidate only, with an honest note. If every Fit call fails the job does not finish as DONE.
3. Errors a retry cannot fix fail the job at once with `fit_model_unavailable`.
4. The worker timeout is 180 seconds and results are saved at the end of the run, in rank order, so a run that is cut loses the calls it made.

## 3. What will be built

1. Request timeout. Each Converse call gets an abort signal of 25 seconds (a setting of the client, not of the job). When it fires, the call fails with the error `RequestTimeout`, which carries no model or request text and is retryable.
2. Retryable errors. A new `isRetryable` covers everything `isThrottling` covers, plus `ModelTimeoutException`, `ModelErrorException`, HTTP 408 and 424 and `RequestTimeout`. It is the default of `withRetry`. `isThrottling` keeps its meaning, because the throttle counter uses it.
3. Longer retry of the same errors. The default is 5 retries instead of 3, and each wait is capped at 8 seconds (`maxDelayMs`), still with full jitter. The worst case total wait of one call is 15.5 seconds, and the run deadline bounds the sum.
4. Run deadline. The handler passes the end of the Lambda time (now plus `getRemainingTimeInMillis()`) as `deadlineAt` through `processJob` and `runEngine` into the engine context. Stage 2 derives two instants from it: no new summary attempt starts in the last 45 seconds (20 to save, 25 for a call that is already running), and no new Fit attempt starts 30 seconds before that. A Fit candidate that was not reached keeps its similarity estimate, with its own note and a count in the job record. A summary that was not reached uses the template text with the existing note. The run then saves and finishes. Without a deadline (local runs and tests) nothing changes.
5. Fewer parallel calls after a throttle. Fit starts with `PARALLEL_CALLS`. After a throttling error the pool halves its limit, at most once every 2 seconds, down to a floor of 2, and does not raise it again in that run.
6. Visible degradation. The `fit` and `summary` phase records get the number of throttles and retries, and the `fit` record gets how many candidates were skipped at the deadline. Fallbacks and calls were already counted. The share of fallbacks is therefore readable from the job record.

Files: `src/models/text-model.ts`, `src/stage2/retry.ts`, `src/stage2/run-stage2.ts`, `src/core/types.ts`, `src/core/run.ts`, `src/worker/app.ts`, `src/worker/handler.ts`, their tests, the engine README and section 8 of the connect plan. Nothing outside `loop8/`.

## 4. Assumptions

1. The Lambda context gives `getRemainingTimeInMillis()` with the configured 180 seconds.
2. Saving up to 200 results takes less than the 20 second reserve. Not measured, and the number of results in the demo pool is below 100.
3. `ModelTimeoutException` and `ModelErrorException` exist with these names and statuses in the Converse API. They cannot be forced against the account, so they are not confirmed with a real call. If a name is wrong the only effect is that the error is not retried.
4. A throttled request does not use tokens. A request that timed out may have used tokens that are billed anyway. Not measured.

## 5. Impact analysis

1. No Terraform or AWS resource changes. On merge the pipeline updates the two Lambda functions in place with the new code. `ENGINE` stays unset, so the worker still runs the stub and no model is called.
2. With the semantic engine on, the worst case calls of one Fit candidate go from 4 attempts to 6 (5 retries plus the first call), and a bad JSON reply still allows one more round. These are worst case counts from the code. Throttled attempts are not expected to cost tokens.
3. The deadline turns a Lambda timeout, which lost the whole run, into a finished run with flagged estimates. It does not change a run that finishes in time.
4. Reversal: revert the pull request.

## 6. Acceptance criteria

1. A hung call fails with `RequestTimeout` after the timeout and is retried. Other errors pass through unchanged.
2. `isRetryable` is true for 408, 424 and the named errors, and false for configuration errors.
3. A wait never exceeds `maxDelayMs`, and the default is 5 retries.
4. With a deadline in the past or near, no new Fit call starts, the skipped candidates keep their estimate with their own note, the job record counts them, and summaries use the template text.
5. After a throttle the number of calls in flight drops and never goes under 2.
6. The `fit` record carries throttles and retries.
7. Type check, the engine tests and the engine build pass. After the apply, a job with the stub engine finishes DONE and both functions are Active.

## 7. Remaining steps

1. The engineer finishes the summaries and uploads the gzipped index to the jobs bucket.
2. A separate change sets `ENGINE=semantic` and `INDEX_ARTIFACT_S3_KEY` after approval, because from then every job calls a model and costs money.
3. One real run checks the throttle path. It is not forced against the customer account without approval.
4. Gaps 4 and 6 of section 8 (a share of fallbacks that fails the job, and the content filter stop reason) are decided after the first real runs.

## 8. Build record

Built on 2026-11-21 in pull request 68 for issue 67. Checked locally on a copy with the engine dependencies installed.

1. Code. `src/models/text-model.ts` (request timeout, `RequestTimeoutError`), `src/stage2/retry.ts` (`isRetryable`, `maxDelayMs`, 5 retries by default, `DeadlineError`, `REQUEST_TIMEOUT_MS`), `src/stage2/run-stage2.ts` (guarded model with counts and the deadline, `createLimiter`, a pool whose limit can be cut, the note for candidates not reached, the `fit_deadline_hit` record), `src/core/types.ts`, `src/core/run.ts`, `src/worker/app.ts` and `src/worker/handler.ts` (the deadline from the Lambda context). `src/stage2/fit.ts` and `src/stage2/summary.ts` are unchanged.
2. Tests. 21 new tests: the timeout and its error, `isRetryable` and `isThrottling`, the cap and the default of `withRetry`, the limiter and the pool, the deadline reaching the engine through `runEngine` and `processJob`, and five engine runs with a moving clock (Fit not started, summaries skipped, Fit stopped part way, deadline reached while waiting to retry, no deadline). One existing test changed: the default of `withRetry` is now 5 retries, so `judgeFit` gives up after 6 calls instead of 4.
3. Checks. `npm run typecheck`, `npm test` (382 of 382) and `npm run build` pass, and the worker bundle loads. The pre-commit hooks are run by the commit.
4. Checked with a real call. On 2026-11-21 one Converse call to Nova Lite through the `us.` profile with the normal timeout returned in about 0.9 seconds and used 11 tokens, and the same call with a timeout of 1 millisecond failed with `RequestTimeout` after 9 milliseconds, which `isRetryable` accepts. This shows the SDK honors the abort signal. The call was a single request with 5 output tokens at most.
5. Not checked. A real hung call, a real throttling burst and the names `ModelTimeoutException` and `ModelErrorException` cannot be forced against the account, so the other paths are tested with injected errors and a client that never answers. The time to save 200 results is not measured.
6. Applied. The pull request was merged on 2026-11-21 and the apply finished with 0 added, 1 changed, 0 destroyed (the worker function). Both functions were Active, the dead letter queue was empty and a job with the stub engine finished DONE in 1.4 seconds. The engine was turned on later the same day (`worker-engine-connect-plan.md`, section 10) and five real jobs ran with these limits: no throttle, no retry and no failed Fit call in any of them, so the retry and the deadline paths were not exercised live.
7. Still pending. The summaries fix of the engineer, and the decisions of section 9.

## 9. Deviations from the blueprint

The blueprint is the published page `loop8/docs/architecture/index.html`. These are the places where the build differs from it, reviewed with the project lead on 2026-11-21. Each one waits for a decision. The blueprint is updated for the ones that are accepted.

| # | Blueprint | Build | Reason | What would remove it |
|---|---|---|---|---|
| 1 | When time runs short the worker saves a checkpoint and sends a continuation message | The run stops starting calls early and finishes with flagged estimates | Simpler, and a job is never lost | Checkpoints per candidate, the permission `sqs:SendMessage` for the worker role, a continuation message |
| 2 | After a throttle the job halves its parallelism and recovers slowly. A last pass retries the failed candidates | The parallelism is halved down to 2 and is not raised again in the run. No last pass | Less code for a first version | A slow recovery rule and a retry pass |
| 3 | 4 attempts and a 30 second call timeout | 6 attempts and a 25 second timeout | Gap 3 of section 8 of the connect plan asked for a longer retry | Change the blueprint, or change the defaults |
| 4 | A checkpoint after each candidate | One checkpoint per candidate at the end, in rank order | The summaries need every total first | Write the Fit results as they arrive and update them after the summaries |
| 5 | OpenSearch Serverless as the vector database | An index file in S3, searched in memory | Variant A with a pool of 98 profiles, and OpenSearch bills by the hour | The OpenSearch build check and a decision on its cost to the customer |
| 6 | A model reads the job description and suggests requirements | The engine uses the app's current extractor | The first variant measures Fit | An extraction call with the text model, which the customer's suggested priorities need |
| 7 | Summaries on demand and reuse of a stored result by hash | Not built | Both are optional in the blueprint | A route `POST /jobs/{id}/summaries`, a button in the app and a hash of the request |
