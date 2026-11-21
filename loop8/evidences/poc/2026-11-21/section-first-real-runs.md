# First real runs of the semantic engine (2026-11-21)

POC environment, us-east-1. Five jobs ran with the engine in AWS: three posted to the API and two started from the app on the project lead's machine. The report is [first-real-runs-report.md](../../../docs/reports/first-real-runs-report.md). No secret value and no account id is written here.

## What could and could not be tested

| Area | Tested | Method |
|---|---|---|
| The engine runs in the account and returns a full ranking | Yes | Three jobs through the API, `api-run-3.log`, `job-records.log` |
| The app reaches the engine and shows its ranking | Yes | Two jobs from the app, `ui-run.log` and the screenshots |
| Every candidate of the pool is ranked | Yes, after a fix | The first index left 29 and 6 profiles out. The rebuilt index leaves none, `index-build.log`, `job-records.log` |
| Time of a ranking | Yes, one job description | Phase records of five jobs, `job-records.log` |
| Cost of a ranking | Yes for tokens, computed for the money | Token counts from the job records and CloudWatch, prices from the Price List API, `cost-measurement.log` |
| Cost on the bill | Not yet for 2026-11-21 | Cost Explorer lags, the jobs are not in it, `cost-measurement.log` P4 and P5 |
| Quality of the ranking against the manual one | No | Not run here. The engineer's results are reported in the report, section 5.4 |
| Repeat noise of Fit | Partly | Four comparisons of repeated or related runs, `job-records.log`. Too few for a conclusion |
| Written summaries | Failed | All fall back to the template text, `job-records.log` |
| Organization names in the index text | Yes | `check-artifact.log` |
| Throttling, a hung call, the run deadline and the dead letter queue path in a live run | No | They cannot be forced against the customer account. They are tested with injected errors in the engine tests |
| Authentication of the API | Not applicable | The API has none, by the blueprint's accepted risk |
| Other job descriptions than ToR 01 | No | One job description only |

## Results

| Check | Result | Log |
|---|---|---|
| Worker settings | `ENGINE=semantic`, index version `13d7674312434864`, function Active | `aws-state.log` P1 |
| Model settings of the jobs | Nova Lite for Fit and text, Titan V2 for embeddings | `aws-state.log` P2 |
| Bucket lifecycle | Inputs and results expire after 7 days, the index does not | `aws-state.log` P3, P4 |
| Dead letter queue and alarms | 0 messages, 17 alarms all OK | `aws-state.log` P5, P6 |
| CORS from the app origin | 204, origin allowed | `aws-state.log` P7 |
| Index ids | 98 profiles, 964 fragments, the six ToR 05 individuals under their database ids | `index-build.log` P2 |
| Index rebuild after the fix | 0 Titan calls, 964 vectors reused | `index-build.log` P3 |
| Organization names in the index text | 153 hits in 40 of 98 profiles | `check-artifact.log` P1, P2 |
| Third API job | DONE, 98 ranked, 10.7 s, no fallback | `api-run-3.log` |
| The five jobs | 3 DONE, 2 PARTIAL, 0 throttles, 0 retries, 0 Fit fallbacks, 5 of 5 summaries fell back in every job | `job-records.log` P1 |
| Cost of a job | About 0.008 USD for 98 candidates, 114,080 tokens in and 4,661 out | `job-records.log` P1, `cost-measurement.log` P1 |
| Run from the app | 97 of 97 ranked, same top five as the API, no unscored notice | `ui-run.log`, `ui-run-screenshots/` |
| What the app saved in the customer database | A new ad hoc run with 97 results. The ranking saved in an opening was not touched | `ui-run.log` P2 |
| Pull requests and applies | Pull requests 55 to 72 merged, 0 resources destroyed in any apply, two failed runs fixed | `pipeline.log` |

## Not run

The comparison of the engine against the manual ranking, which the engineer ran locally and reported. A repeat study of Fit with many runs. Any job description other than ToR 01. The engine with the models agreed with the customer, which are not enabled for the account.

## Window

The jobs of the app wrote to the customer database. The app replaces the earlier unsaved ranking of the demo manager by design, and the project lead approved the run.
