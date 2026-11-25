# Handoff: P2 job description parsing and the matching engine

| | |
|---|---|
| Status | Final for P2, written on 2026-11-25 while P3 is in progress |
| Phase | P2 (SOW week 2) |
| Task | End of phase handoff: job description parsing module and candidate matching engine |
| Owner | Loop8 engineering |
| Date | 2026-11-25 |
| Sources | `loop8/docs/sow/SOW-MavenScout-GenAI-POC.md`; `loop8/docs/planning/PROJECT_PLAN.md`; `loop8/docs/planning/` (walking-skeleton, engine-deploy, engine-secret-read, nova-temporary-models, worker-engine-connect, engine-hardening, summary-writing, extract-route and extract-format-fix plans); `loop8/docs/reports/first-real-runs-report.md`; `loop8/evidences/README.md` and `loop8/evidences/poc/2026-11-21/` and `poc/2026-11-22/`; `loop8/engine/README.md`; `loop8/docs/runbooks/poc-environment.md`; pull requests 22, 40, 42, 44, 45, 47, 49, 52, 54, 55, 57, 59, 60, 62, 64, 66, 68, 70, 72, 75, 76, 79, 82, 84, 85, 87 and 89 (merge commits on `loop8-develop`) |

P2 started on 2026-11-16 and covers the merged pull requests up to 89 (2026-11-23). Everything below was measured on the synthetic demo pool (98 approved and active individuals) with temporary Amazon Nova models, not with the GPT-6 models agreed with the customer. Measured figures say where they come from, and estimates are marked as estimates.

## 1. Work done

### 1.1 The engine as built and deployed

| Part | What it does | Pull requests |
|---|---|---|
| Job pipeline | `POST /jobs` validates the input, checks the idempotency key, saves the input and queues the job, and answers 202 with a job id. `GET /jobs/{id}` reports state and progress and a result link. The worker takes a lease, runs the engine and writes the result and a job record (phases, tokens, retries, fallbacks, model ids, prompt versions, index version). Final states DONE, PARTIAL or FAILED. The engine code lives in `loop8/engine/` and also runs locally with an in-memory store | 22, 55 |
| AWS resources | HTTP API, api Lambda (10 s), worker Lambda (180 s, 1,024 MB, Node 22), jobs queue with a dead letter queue after 5 receives, DynamoDB jobs table, S3 jobs bucket with a 7 day expiry on inputs and results, the Supabase secret, alarms. All created by Terraform through the pipeline and listed in the runbook inventory | 40, 42, 44, 47, 62, 64, 70 |
| Index and embeddings | A hand run script splits each profile into fragments, embeds them with Titan V2 and writes a versioned index file. Employer names from work history, education institutions and credential issuers are kept out of the embedded text by design, but free text can still name an organization (section 4). Current index: 98 profiles, 964 fragments, version `13d7674312434864`, 9.4 MB gzipped, stored in the jobs bucket and searched in memory by the worker | 45, 70, 72 |
| Semantic Fit | The worker embeds the job description once, finds each candidate's best fragments, and asks the Fit model for one Fit per candidate (prompt `fit-v2`), one call per candidate (several in parallel, `PARALLEL_CALLS`), up to `FIT_CAP` (200). Organization, language and place names are removed from the job description before it is embedded and sent to Fit | 55, 60, 70 |
| Scoring | The engine scores with the app's own functions in `src/lib/matching/` (`computeAdjustments`, `preferenceScoring`, `totalScore`, `bandFor`), so the additive score and the bands are exactly the app's | 60 |
| Written summaries | The top 5 candidates get a summary of 40 to 60 words written after the ranking (prompt `summary-v2`), checked for length, dashes, lists, other bands and overclaims, retried with feedback up to 3 tries, and replaced by the template text on failure | 60, 79, 82 |
| Extraction route | `POST /extract` runs in its own Lambda (25 s, 512 MB), calls the text model once per job description (prompt `extract-v2`), checks the answer against the known lists and joins it with the keyword result so recall can only rise. It never sets a Must have and never fills the employer. A model failure answers with the keyword result and `degraded` true. The app falls back to the keyword extractor after at most 10 seconds when the route cannot answer | 85, 87, 89 |
| Hardening | A 25 second timeout per model call, 5 retries with an 8 second cap on each wait, a run deadline taken from the Lambda time, fewer parallel Fit calls after a throttle, and immediate failure with `fit_model_unavailable` for errors a retry cannot fix | 55, 68 |
| Manual against AI comparison | `npm run compare` ranks the five sample ToRs and the hard cases in `loop8/engine/samples/hard-cases/` with the placeholder and with the engine, with the same extraction on both sides. `npm run extract-compare` measures the extraction of each model on the five sample ToRs | 60, 89 |

### 1.2 Limits and caps in force

| Limit | Value | Source |
|---|---|---|
| Request body, pool size | 512 KB, up to 5,000 pool ids | `engine-deploy-plan.md` |
| Candidates judged by the Fit model per job | 200 (`FIT_CAP`) | Engine README |
| Jobs per day | 100 | `engine-deploy-plan.md` |
| Extractions per day | 300, the next answers 429 `daily_cap` | Engine README |
| API throttling | 5 per second, burst 10. `POST /extract` 1 per second, burst 3 (the extract values are estimates) | Runbook inventory |
| Concurrent worker jobs | At most 2 | Runbook inventory |
| Monthly budget | $350, model calls denied to the engineer roles at 100% and to the worker and extract roles at 150% (the extract role is recorded as pending apply, see the gotchas) | Runbook inventory |

### 1.3 Measured results

All from `loop8/docs/reports/first-real-runs-report.md` and the logs it names in `loop8/evidences/poc/2026-11-21/`, unless another source is given.

1. **Five real jobs on 2026-11-21** with ToR 01: three posted to the API and two started from the customer's app. The last three finished DONE with every candidate ranked. End to end time 10.7 to 13.5 seconds, against the customer's target of 10 to 30 seconds (`job-records.log`).
2. **Cost of one ranking**: about $0.008 for 98 candidates with Nova Lite, computed from measured tokens (114,080 in and 4,661 out) and the AWS price list. A Fit call used about 1,076 input and 37 output tokens (`job-records.log`, `cost-measurement.log`). A ranking of a 3,000 pool at the cap of 200 is about $0.016, an estimate from the same tokens per candidate.
3. **Quality on ToR 01**: the three profiles the fixture expects ranked first, second and fifth (`api-run-3.log`). This is one job description on a synthetic pool, so it shows the path works, not that the ranking is better than the manual one.
4. **Manual against AI**, reported by the engineer and not re-measured in the report: on the five customer ToRs the engine and the keyword scorer tie at 14 of 14 expected profiles in the top 5. On four hard cases, where the right work is described in other words, the keyword scorer places 1 of 4 in the top 10, Nova Lite 3 of 4 and Nova 2 Lite 4 of 4.
5. **Repeats**: the same job run twice changed the Fit of 3 of 98 candidates, by 10 points each, at temperature 0. Across the runs 3 to 6 percent of candidates moved by one step. This is model noise and not pool dependence, because Fit is judged one candidate at a time.
6. **Reliability**: no throttle, retry, server error or failed Fit call in the five jobs, the dead letter queue stayed empty and no alarm fired. The retry, deadline and dead letter paths were tested only with injected errors in the engine tests, not live.
7. **Summaries after the fix**: 37 to 38 of 40 accepted in live checks, none with a dash (`summary-live-check.log`). On the deployed engine the top five summaries of a real job were real text of 51 to 60 words (`summary-deployed-check.log`). After the overclaim fix, 0 of 21 real summaries said every priority was met when a row was not, against 5 of 23 before, and 4 of 25 fell back to the template (`loop8/evidences/poc/2026-11-22/summary-deployed-faithfulness.log`).
8. **Extraction**, measured on 2026-11-23 with one run per ToR and model (`extract-format-fix-plan.md` section 8.5): recall of the 62 expected terms 53 for the keyword extractor, 54 for Nova Pro and 55 for Nova 2 Lite, with 7, 12 and 10 suggestions outside the expected lists. Cost per call about $0.0029 for Nova Pro and $0.0013 for Nova 2 Lite, computed from measured tokens. The difference of one or two terms is inside the variance seen between runs, so this series does not show that the model beats the keyword extractor.

## 2. Decisions and why

| # | Decision | Why | Source |
|---|---|---|---|
| 1 | Nova Lite for Fit and for the summaries of variant A, Nova Pro for extraction, Nova 2 Lite available for comparison, all temporary | GPT-6 Luna and Sol and Claude Haiku and Sonnet 5.5 are rejected in the account, and Amazon models need no sales enablement. GPT-6 stays the target | `nova-temporary-models-plan.md`, pull requests 57 and 59 |
| 2 | An index file in S3 searched in memory instead of OpenSearch Serverless | Variant A with a pool of 98 profiles, and OpenSearch bills by the hour. The OpenSearch build check was not run | `first-real-runs-report.md` section 10, deviation 5 |
| 3 | The engine scores through the app's functions and keeps the app's extraction for ranking | Keeps the additive structure and the bands identical to the app, and lets the first variant measure Fit alone. The manual against AI comparison gives both sides the same extraction | Engine README, deviation 6 |
| 4 | Extraction runs in its own Lambda with its own role, daily cap and throttling, so the api Lambda calls no model | Keeps the api role without model access, and bounds the cost of an unauthenticated route | `extract-route-plan.md` |
| 5 | A run near the Lambda time limit stops starting calls and finishes with flagged estimates, instead of checkpointing and continuing | Simpler, and a job is never lost. Listed as a deviation from the blueprint for the project lead to decide | `engine-hardening-plan.md` section 9 |
| 6 | The summary is written after the total and the band, explains the total and not Fit, and never receives the candidate's name or ids | Keeps the text consistent with the numbers and keeps excluded attributes out | `summary-writing-plan.md` |
| 7 | The query embedding model must equal the model recorded in the index, or the job fails with `embedding_model_mismatch` | Scores from two embedding models are not comparable | Engine README, `poc-start-plan.md` decision 3 |

## 3. Challenges

1. **Blocked models.** From 2026-11-19 every model agreed with the customer was rejected in the account. Nova unblocked the build, but no result in this phase is a GPT-6 result, and the customer has to be told before relying on these numbers.
2. **Summary length.** In the five jobs of 2026-11-21 every summary fell back to the template (25 of 25): Nova Lite wrote 74 to 77 words against the 40 to 60 required, the retry repeated the same request, and each job still paid for 10 summary calls, about 9.5 percent of its cost. Pull request 79 fixed it with a new prompt and a retry that gives feedback. A later check found 5 of 23 summaries that claimed every priority was met when a row was not, fixed by pull request 82.
3. **Id-less profiles in the index.** The first two real jobs finished PARTIAL. Six ToR 05 individuals have a slug and no id in the demo seed, the index keyed them by slug, and the database holds them under an id derived from `demo-<slug>`. The index was rebuilt under the database ids with no new embedding call (pull request 72), and later jobs ranked every candidate.
4. **Pipeline failures.** The first engine apply failed on missing tagging permissions of the apply role (fixed by pull request 42), the engine build failed in CI because the app dependencies were not installed (fixed by pull request 66), and the bucket lifecycle failed the Checkov rule CKV_AWS_300 twice before it was rewritten (pull request 70).
5. **Extraction route.** Pull request 85 added the extraction code but no API route, so `/extract` answered 404 without CORS headers and the app always fell back. Pull request 87 added the route and its Lambda. The first real call then showed that the model copied the hints of the list lines and the validation dropped those names, fixed by pull request 89.

## 4. Gotchas

1. The index text still carries organization names: 153 hits in 40 of the 98 profiles (`check-artifact.log`). Fit is told to ignore employer names and nothing removes them. A decision is needed: clean the text before indexing or accept it.
2. Fit from Nova Lite comes in steps of 5 and 10, so several candidates share a Fit and their order comes from the preference share. A candidate near a band edge can change band between two identical searches.
3. A new index is read only when the worker starts a new container. Upload it under a new versioned key and change the key in Terraform, which replaces the worker environment.
4. A ranking started from the app writes to the customer database and replaces the demo manager's ad hoc ranking. Tell the customer before any demo on the shared database.
5. The API has no authentication because the app's sign in is mocked. Throttling, daily caps and the budget cut are the only protection. This is an accepted risk to be stated to the customer.
6. `npm run baseline` calls the deployed engine whenever `VITE_ENGINE_URL` is in the repository `.env`, which spends on models without an explicit flag.
7. The hard cases live in `loop8/engine/samples/hard-cases/` and run with `npm run compare`, not with `npm run baseline`. They are not in `docs/samples/expectations.json`.
8. The runbook inventory still marks the extract Lambda rows as pending apply, although `extract-route-plan.md` section 8.4 records a real call on the deployed route after the apply of pull request 87.
9. The template narrative in the customer's `src/lib/matching/narrative.ts` contains an em dash. It is the customer's file and is not changed by Loop8.

## 5. Next steps (into P3)

P3 (SOW week 3, confidence scoring and explainability) is in progress. The open items it takes over:

1. **Component breakdown.** Build the component scores behind the overall match, as SOW section 3 asks. The split of the SOW components against the Fit rule (technical skills, domain expertise, sector and regional experience from Fit; seniority and location from the priority rows) is still waiting for the customer's answer to question 3 of the Flows and Costs document, through the project manager.
2. **Card display.** Show the component breakdown next to the overall score on each candidate card.
3. **Summaries on demand.** The `POST /jobs/{id}/summaries` route and its button in the app are not built.
4. **Monthly cap.** The cap of 10 rankings per account per month (the hiring manager's account) is not built. The manager id already travels in the request.
5. **Decisions for the project lead**: the deviations from the blueprint (`first-real-runs-report.md` section 10), the organization names in the index, the extraction model (Nova 2 Lite is the cheaper candidate, with low confidence), and a guard on the baseline's engine calls.
6. **Measurement**: a repeat study of Fit noise to propose the band thresholds for sign off, a few similarity thresholds, and variants B, C and D once the text model is settled. Repeat the jobs and the comparison with GPT-6 if AWS enables it.
7. **Closing documents** for P4: the findings summary, architecture overview and recommendations of SOW section 9, the measured section 4 of the technical assessment, and the P3 handoff.
