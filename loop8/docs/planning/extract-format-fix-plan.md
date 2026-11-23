# Plan: count the model answers that copy a hint, make the loss visible and measure the models

| | |
|---|---|
| Status | Built and checked offline on 2026-11-23 (section 8), waiting for the review of the project lead. Not pushed. The series of live calls of criterion 4 is not done |
| Phase | P2 (job description parsing) |
| Task | Fix the extraction so that the names the model returns are not lost to a format mismatch, log what the model returned, and add a script that measures the extraction with each candidate model on the five sample ToRs |
| Owner | Guillermo Sandoval |
| Date | 2026-11-23 |
| Sources | Issue 88, `loop8/docs/planning/extract-route-plan.md` and its pull request 87, `loop8/engine/src/extract/prompt.ts`, `extract.ts`, `parse.ts` and `handler.ts`, `docs/samples/expectations.json`, the first real extraction and three local model calls of 2026-11-23, `loop8/CLAUDE.md` sections 3 and 4 |

Figures about the models come from one ToR and one run per row. They are a diagnostic and not a measurement. The measurement is criterion 4 of section 6.

## 1. What this task is for

The first real extraction on the deployed engine (sample ToR 01, Nova Pro) found 10 of 13 expected terms, the same as the keyword extractor, and added nothing in expertise. Three local model calls, with the same prompt and the same list as the Lambda, showed the first reason.

1. The expertise list is sent as lines of the form `Name (hint, hint)`. 138 of its 140 items have a hint. The prompt never says what the parentheses are, and only a comment in the code does.
2. Nova Pro copied whole lines, for example `Health Systems (HSS, Health Systems)`. The validation compares the exact name, so it dropped 3 of the 4 names that the model returned. With the parenthesis removed all 4 are on the list.
3. Nothing shows it. The answer has `degraded` false because the model did not fail, and the log line `extract_done` counts only the suggestions that survived.

The calls showed a second fact that this task does not fix but must measure. With the corrected format, Nova Pro returned 4 names and none of the three terms that the keyword extractor misses (Gender Mainstreaming, Workshop Facilitation, Policy Briefs). Nova 2 Lite returned 5 names, including Gender Mainstreaming, and no name outside the expected ones. The text of the ToR says those three terms with other words ("gender strategy", "validation workshop", "policy brief"), which is the case the module was designed for.

## 2. What the design already decided

1. The expertise list is a controlled vocabulary. A name that is not on the list, or an old name that maps to no item, is dropped.
2. The result is the union with the keyword result, so recall can only rise. A model failure returns the keyword result with `degraded` true.
3. Extraction only suggests. It never sets a Must have and never fills the employer (`loop8/CLAUDE.md` section 3.4). The levels it can suggest are Nice to have and Important, and the model-only names are always at the lowest one.
4. The job description and the reply of the model are never logged.
5. The model is a variable. Sol is blocked, so Nova Pro is the temporary model of the route.
6. Measure, do not argue (`loop8/CLAUDE.md` section 4). Cost and latency figures are estimates until measured and say where they came from.

## 3. What will be built

1. In `src/extract/extract.ts`, the validation of an expertise name tries, in this order: the exact name, the old name map, and then the same two without one trailing parenthesis (`\s*\([^)]*\)\s*$`). Exact first, so a real name that contains a parenthesis could never be broken by the strip. No name of the current list contains one. A name that matches none is dropped, as before. Matching without regard to letter case is not added, because no call showed a case problem.
2. `extractFromJd` reports counts through an optional callback in its dependencies: names returned, kept as exact, kept after the hint was removed, kept as old names and dropped for expertise, and returned and kept for locations and languages. The counts carry no text.
3. In `src/extract/prompt.ts`, rule 1 says that each line is a name followed by hints in parentheses that are not part of the name, asks for the name before the parenthesis spelled as in the list, and asks to read the context, the tasks and the deliverables. It uses no example taken from a sample ToR. The prompt gets a version id, `extract-v2`.
4. In `src/extract/handler.ts`, `extract_done` adds the counts and the prompt version id. It still has no text.
5. A script `scripts/extract-compare.ts` and the command `npm run extract-compare` in `loop8/engine`. For each sample ToR and each model it builds the context from the customer database (read only), runs the real extraction code with the real text model, and prints the recall of the expected terms, the unexpected suggestions, the counts, the tokens and the time. It also prints the same for the keyword extractor, which needs no call. Without `--confirm-live` it prints the planned number of calls and makes none, like `npm run compare`. It takes the models from `--models=`.
6. Unit tests for the strip, for the order of the matches, for an invented name, for an old name with a hint, for the counts, and for the prompt text and version id. The handler has no unit test, like the earlier handlers, and its log line is checked after the deploy.
7. Documentation in the same pull request: the engine README (the route section), the extraction route plan gets a note that this task followed from its first measurement, and the index of `loop8/README.md`.

## 4. Assumptions and decisions for the project lead

Assumptions:

1. The hint format of the list does not change. If it does, the strip may stop being needed, and the counts would show it.
2. The prompt sentence adds about 290 characters, which is below 100 tokens, so it adds under 0.0001 dollars to a call. An estimate from the measured size of the prompt.
3. The model reply may come inside a code fence, as Nova 2 Lite did. The parser already accepts it.
4. The AWS price of Nova 2 Lite must be read from the AWS price list before the series, so the cost of its calls can be written. It was not read yet.

Decisions that come after the measurement, not before:

1. Which model runs the extraction. The role of the extract Lambda allows only Nova Pro today. Changing it is the two variables `extract_model` and `extract_profile_model_ids`, in a separate small pull request.
2. Whether the model is worth its cost, if no candidate passes the target of criterion 4.

## 5. Impact analysis

1. Runtime. Only the code of the extract Lambda changes. The `api` and worker bundles do not import the extraction, so their code hashes must stay the same in the Terraform plan, and the plan is read to check it. No resource changes.
2. Behavior. Names that the model returned with their hint, and were dropped before, are now kept. This can raise the number of model-only suggestions, some of which are not in the expected list. The measurement of criterion 4 counts them, so the precision cost is visible.
3. Cost. A few more input tokens per call, and the series of calls of the measurement (section 6). No new resource.
4. Privacy. The counts and the version id are numbers and a label. No text is logged.
5. The app. No change. The answer of the route does not change.
6. Reversal. Revert the pull request. The route keeps working, with the old format loss.

## 6. Acceptance criteria

1. Unit tests: a name with its hint is kept, an invented name is dropped, the exact name wins over the stripped one, an old name with a hint maps to its item, the counts are right, and the prompt text and version id are as planned.
2. The engine type check and tests and the app build pass. `npm run baseline` without the engine gives the same result as before, because the keyword extractor does not change.
3. `npm run extract-compare` prints the planned calls and makes none without `--confirm-live`.
4. A measured series with the project lead's approval for the calls: the five sample ToRs with Nova Pro and Nova 2 Lite, with the recall of the 62 expected terms, the unexpected suggestions, the counts, the tokens, the time and the cost per call from the AWS price list. The target is above 53 of 62 with no new false positives. It is a target and not a promise, and the result is reported whatever it is.
5. The Terraform plan of the pull request shows the code change of the extract Lambda only.
6. After the merge, one real call to the deployed route returns names without hints, and its `extract_done` line shows the counts and `extract-v2`.
7. Documentation is updated in the same pull request.

## 7. Remaining steps

1. Review of this plan by the project lead.
2. The code and the tests (section 3, points 1 to 4 and 6), one logical change for each commit.
3. The script of point 5, and its dry run without calls.
4. Documentation (point 7).
5. Review by the project lead. Commit locally only after that.
6. With approval: push, open the pull request against `loop8-develop`, read the Terraform plan.
7. With approval for the calls: the series of criterion 4, and the record of its results in the plan and in `loop8/evidences/poc/<date>/`.
8. With approval: merge, then the single real call of criterion 6.
9. A separate pull request for the model change, if the measurement supports one.

Not part of this task: the model change in Terraform, the AI suggestions of Important and Must have, the monthly cap per manager, and summaries on demand.

## 8. Build record

Written on 2026-11-23 after the offline checks. The series of live calls of criterion 4, the push, the Terraform plan and the single call after the merge are not done.

### 8.1 What was built

Section 3 as planned: the hint removal and the counts in `src/extract/extract.ts`, the prompt rule and the version id `extract-v2` in `src/extract/prompt.ts`, the counts and the prompt version in the `extract_done` line of `src/extract/handler.ts`, the script `scripts/extract-compare.ts` with its pure part in `src/eval/extract-compare.ts` and the command `npm run extract-compare`, the tests, and the documentation.

### 8.2 Offline checks

| Check | Result |
|---|---|
| Engine type check and tests | Pass, 457 of 457. 7 new tests for the extraction (the hint kept as the name, an invented name dropped, only a trailing parenthesis removed, an old name with a hint, the exact name winning over the stripped one, the counts, no counts when the model failed, the prompt text and version) and 4 for the comparison arguments and score |
| App build | Pass |
| `npm run extract-compare` without `--confirm-live` | Prints 10 planned calls for two models and five ToRs, and says that no database read and no model call was made. With `--confirm-live` and no `--max-calls` it refuses |
| Bundles | The `api` and worker bundles are identical to those of `loop8-develop` (same SHA-256). Only the `extract` bundle changes |
| `npm run baseline` without the engine | Same scores as the committed run: extraction recall 53 of 62, 14 of 14 expected profiles in the top 10 and top 5. The regenerated file differs from the committed one only in the wording of its header, the run date and a row count of the database, so it is not part of this change |

### 8.3 The baseline through the deployed engine before this change

The baseline harness uses the engine whenever `VITE_ENGINE_URL` is in the `.env` of the repository, and not only when it is in the shell. A run on 2026-11-23 before this change, with the deployed code (Nova Pro, the old prompt and the exact validation), made 5 real extractions and found 54 of 62 expected terms, with no extraction degraded. The keyword extractor alone finds 53 of 62. The expertise found out of the expected, by ToR: tor-01 6 of 9, tor-02 7 of 9, tor-03 5 of 7, tor-04 8 of 9 and tor-05 8 of 8. The 5 calls used 16,059 input tokens and 367 output tokens, which is 0.014 dollars at the AWS price list of 2026-11-11. This is the figure to compare the series of criterion 4 with.

The same ToR 01 with the same 3,306 input tokens produced 121 output tokens in one call and 71 in another, at temperature 0, so the answer of the model varies between runs. One run per model is therefore a first reading, and the series should be read with that in mind.

### 8.4 Open points

1. The baseline calls the engine without being asked to whenever the `.env` has the URL. A guard that requires an explicit flag would remove the risk of spending by accident. It is outside this task and needs a decision.
2. The price of Nova 2 Lite must be read before the series, to state its cost.

