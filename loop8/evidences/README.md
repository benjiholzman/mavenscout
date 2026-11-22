# Evidences

Raw output of live checks, kept as logs so a result can be read again without running the check again. One folder per environment and date, one `.log` per check, and one `section-*.md` that says what was and was not tested and links the logs. The pattern is the one of the Second Social project.

The only environment so far is `poc`, the temporary POC environment in the customer's AWS account.

## Format

1. A `.log` starts with `#` header lines: what it checks, the date and the context (account, branch, address). The account id is never written.
2. Each check is a block `### P<n> name`, then the command or request after `$`, then the raw output, then `RESULT:` with what the output shows.
3. A `section-*.md` has a table "What could and could not be tested" with a mark and the method for each area, then the results with the log that backs each one.
4. Scripts that produce a log are saved next to it, so the check can be run again.
5. Screenshots go in a folder named after the log they belong to.

## Rules

1. Add the files when the check is verified, not later.
2. Redact before saving: no account ids, keys, tokens, passwords, secret values, API ids or database hosts, and no local paths. Keep status codes, field names, model ids and the behavior the check proves. Names of keys and resources are fine.
3. A check that does not prove what it claims is left out.
4. A figure in a report names the log that holds it.
5. The repository is public. Evidence is read only output. A check that writes to the customer's systems says so in its header.

## Index

| Folder | Section | Covers |
|---|---|---|
| [poc/2026-11-21](poc/2026-11-21/) | [section-first-real-runs.md](poc/2026-11-21/section-first-real-runs.md) | The first real runs of the semantic engine in the customer account, from the API and from the app |
| [poc/2026-11-21](poc/2026-11-21/) | [index-build.log](poc/2026-11-21/index-build.log) | The two builds of the index and the check of the ids of the six ToR 05 individuals |
| [poc/2026-11-21](poc/2026-11-21/) | [check-artifact.log](poc/2026-11-21/check-artifact.log) | Organization names found in the free text of the index fragments |
| [poc/2026-11-21](poc/2026-11-21/) | [aws-state.log](poc/2026-11-21/aws-state.log) | Worker and api settings, bucket lifecycle, index objects, dead letter queue, alarms and CORS preflight |
| [poc/2026-11-21](poc/2026-11-21/) | [api-run-3.log](poc/2026-11-21/api-run-3.log) | Raw output of the third real job through the API |
| [poc/2026-11-21](poc/2026-11-21/) | [job-records.log](poc/2026-11-21/job-records.log) | Records, tokens, cost and Fit comparison of the five real jobs |
| [poc/2026-11-21](poc/2026-11-21/) | [cost-measurement.log](poc/2026-11-21/cost-measurement.log) | Prices, CloudWatch token counts and Cost Explorer spend |
| [poc/2026-11-21](poc/2026-11-21/) | [summary-live-check.log](poc/2026-11-21/summary-live-check.log) | Live check of the written summaries with the real text model on 40 real candidates, prompt `summary-v2` |
| [poc/2026-11-21](poc/2026-11-21/) | [summary-deployed-check.log](poc/2026-11-21/summary-deployed-check.log) | A real job on the deployed engine after pull request 79: the top five summaries are real text |
| [poc/2026-11-21](poc/2026-11-21/) | [pipeline.log](poc/2026-11-21/pipeline.log) | Merged pull requests, pipeline runs and the result of each apply |
| [poc/2026-11-21](poc/2026-11-21/) | [ui-run.log](poc/2026-11-21/ui-run.log) | The ranking started from the app, its screenshots and what it saved in the customer database |

The report that uses these logs is [first-real-runs-report.md](../docs/reports/first-real-runs-report.md).
