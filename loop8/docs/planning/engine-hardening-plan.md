# Plan: harden the model calls of the semantic engine

| | |
|---|---|
| Status | Built and checked locally on 2026-11-21 in pull request 68. The apply and the stub job check are recorded after the merge |
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
4. Not checked. A real hung call, a real throttling burst and the names `ModelTimeoutException` and `ModelErrorException` cannot be forced against the account, so the timeout is tested with a client that never answers and the other paths with injected errors. The time to save 200 results is not measured.
5. Still pending. The apply of this pull request (the two Lambda functions update in place, `ENGINE` stays unset) and a job with the stub engine, the summaries fix of the engineer, the gzipped index in the jobs bucket and the separate change that sets `ENGINE=semantic`.
