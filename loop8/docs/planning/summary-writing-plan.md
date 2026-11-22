# Plan: make the written summaries pass and follow the writing rules

| | |
|---|---|
| Status | Applied on 2026-11-22 (pull request 79) and checked on a real job. A second change (issue 81) rejects summaries that say every priority was met when a row was not, found by a check of 25 summaries. The on demand summaries are not built |
| Phase | P3 (narratives) |
| Task | Turn the written summary of each top candidate from text that always fell back to the template into text that passes its checks, in the plain style of the project, and explain how it relates to pull request 78 |
| Owner | Guillermo Sandoval |
| Date | 2026-11-22 |
| Sources | `loop8/engine/src/stage2/summary.ts`, pull requests 60, 78 and 79, issue 77, the five real jobs of 2026-11-21 (`loop8/evidences/poc/2026-11-21/job-records.log`), `loop8/CLAUDE.md` sections 3 and 10, the engine blueprint section 6 |

All token and cost figures here are computed from measured tokens and the Nova Lite prices of the cost log. Success rates come from live checks of 40 candidates and are not a guarantee.

## 1. What this task is for

The blueprint says the summary is written after the total and the band are known, receives those numbers, and falls back to the template text when it fails. In the five real jobs of 2026-11-21 every summary of the top five fell back, 25 of 25, because Nova Lite wrote 74 to 77 words against the 40 to 60 that the check requires, and the retry sent the same request again. Each job still paid for 10 summary calls, about 9.5 percent of its cost, and the user saw the template with a placeholder label.

The project lead also asked for the summaries to follow the project writing rules: plain words, one person explaining to another, no analogies and no dashes used as punctuation.

## 2. What the design already decided

1. The summary explains the total, not Fit. It gets the numbers, the band, the priority rows, the must haves, the reason of the Fit call and the evidence, and never the name or ids of the candidate.
2. A summary has 40 to 60 words and never names a band other than the computed one. A failed summary falls back to the template text with a note, for that candidate only.
3. Fit never uses location, language, availability, seniority or career level, work arrangement, membership or employer names (`loop8/CLAUDE.md` section 3).
4. The summaries of the top `SUMMARY_COUNT` candidates are written after the ranking. The on demand route of the blueprint is not built.

## 3. What was built

1. Prompt `summary-v2`: two or three short sentences of about 40 words in total and never more than 55, the writing rules (plain words, short sentences, no analogies, no lists or markdown, no dash used as punctuation, hyphens only inside words), the rule that Fit is never explained by location, language, availability, seniority or career level, work arrangement, membership or employer names, and the rule that the must haves given are the ones the candidate passed.
2. `summaryProblems` returns every problem of a reply: too short or too long with its word count, another band named, a dash (long dash, short dash, double hyphen, or a hyphen with white space on both sides) and a list marker at the start of a line. `checkSummary` is true when there is none and keeps its signature.
3. A rejected reply is asked for again with what was wrong and the rejected text, up to three tries. A reply that is too long is asked to be cut to about 50 words by removing the least important details. A reply that is too short is asked to add one short sentence. The third try exists because a model told that it wrote too many words tends to overshoot to too few.
4. Added on 2026-11-22 (issue 81). The prompt carries `priority_rows_met` and `priority_rows_total` and the rule to say that every priority was met only when they are equal, and to ask for concrete words and not empty praise such as proven, extensive or impressive. `summaryProblems` takes the priority rows and reports an `overclaim` when a sentence says that all, every or each priority was met and a row is partly met or not met. A claim about the must haves alone, a sentence that limits the claim (not, but, except, only, most, some) and rows that do not apply are not flagged. The retry names the rows that were not fully met.
5. The tokens of every try are counted and billed, a truncated reply fails at once, and a reply that fails the third try falls back to the template, as before.

Pull request 78 by the engineer covered the same ground with three sentences that have a role each, feedback of the word count or the band, the Fit rule and the must haves rule. Both versions were measured with the same live check. The must haves rule of pull request 78 is in this change. Its structure of three sentences is not, because it did not help (section 8). The writing rules, the check for dashes and lists, the feedback that cuts or extends the text and the third try are what this change adds to pull request 78.

## 4. Assumptions

1. The live check uses the stored adjustment rows of an earlier job and a real Fit call for the reason, so it shows the text and the acceptance rate and not the ranking.
2. Nova Lite does not give the same text twice, so each rate has a spread of a few candidates. The runs of the same version gave 37 and 38 of 40 in two sets.
3. A stronger model, once Luna, Sol or Claude are enabled for the account, will need the checks less. The prompt and the checks do not depend on the model.

## 5. Impact analysis

1. The prompt is about 130 input tokens longer. A summary that passes at the first try saves the second call, so the cost of the summaries falls.
2. The worker code changes and nothing else. No Terraform and no AWS resource changed. `ENGINE` stays `semantic`.
3. The check is strict on dashes and on claims about the priority rows. A model that keeps using a dash is retried twice and then falls back to the template, which is safe and costs two more calls.
4. Reversal: revert pull request 79. The template fallback stays whatever the model returns.

## 6. Acceptance criteria

1. A reply with a dash used as punctuation, a list marker or a wrong word count is rejected, and a hyphen inside a word is accepted.
2. The retry request names what was wrong and carries the rejected text.
3. In a live check with Nova Lite on real candidates, at least 9 of 10 summaries are accepted, with no dash and 40 to 60 words.
4. On the deployed engine, the summaries of the top five of a real job are real text and not the template.
5. Type check and the engine tests pass.

## 7. Remaining steps

1. Summaries on demand and for more than the top `SUMMARY_COUNT` candidates, if the customer wants them.
2. Repeat the live check with the models agreed with the customer when AWS enables them.
3. The template text of the narrative, which belongs to the customer (`src/lib/matching/narrative.ts`), has an em dash that the rules would not allow. It is not changed without the customer.
4. A repeat study of how often a summary needs a retry, with many runs and several job descriptions.

## 8. Build record

### 8.1 Live checks with Nova Lite, 20 real candidates per run

| Version | Runs | Accepted | Notes |
|---|---|---|---|
| `summary-v1`, in production since pull request 60 | 5 real jobs | 0 of 25 | The top five of each job fell back |
| `summary-v2` asking for about 45 words | 1 | 9 of 20 | Most replies were too long |
| Two or three short sentences of about 40 words, one retry, with three different retry sentences | 5 | 17, 18, 16, 19 and 17 of 20 | |
| Three tries, retry as a rewrite in a number of sentences | 2 | 20 and 16 of 20 | The retry overshot to too few words |
| Three tries, retry as cut or extend, before the must haves rule | 2 | 18 and 20 of 20 | 33 of 40 at the first try |
| Final, with the must haves rule | 2 | 19 and 18 of 20 | 31 of 40 at the first try |
| Pull request 78 as it was, two tries | 2 | 17 and 16 of 20 | 30 of 40 at the first try |
| Three sentences with a role each plus the rules and the retry of this change | 2 | 17 and 20 of 20 | 27 of 40 at the first try, not kept |

None of the accepted summaries had a dash. They had 43 to 60 words, 52 on average. The raw outputs of the last four rows are in `loop8/evidences/poc/2026-11-21/summary-live-check.log`.

### 8.2 Deployed

Pull request 79 was merged on 2026-11-22 and the apply finished with 0 added, 1 changed, 0 destroyed. The worker function was Active and the dead letter queue was empty. A real job over the 98 individuals with ToR 01 then finished DONE in 11.6 seconds with the prompt versions `fit-v2+summary-v2`. The summary phase made 5 calls, none fell back, used 6,466 input and 450 output tokens (about 0.0005 dollars, against 0.00076 dollars for the 10 calls of the earlier jobs), and the top five summaries had 51, 54, 55, 56 and 60 words with no dash.

### 8.3 Check of the summaries against the data (issue 81)

A check of the top five summaries of the five sample ToRs through the deployed engine (`loop8/evidences/poc/2026-11-22/summary-faithfulness-check.log`) found 25 summaries, of which 23 were real text and 2 fell back to the template. The numbers were right in all 23 and no Fit sentence named an excluded attribute. But 5 of the 23 (22 percent) said that every priority was met while a row was partly met or not met, for example a summary that said all priority rows were met for a candidate whose row for Data Science was not met. In the app the text sits next to the counter of rows met, so the contradiction is visible. All 23 started with "The candidate ranks" and 18 of 23 used the word "proven".

The fix of section 3, item 4 was checked on real candidates with Nova Lite, 20 per run: 38 of 40 summaries accepted (95 percent), 35 at the first try against 31 to 33 before, no first reply overclaimed, and the words proven, extensive or impressive in 8 of 38 summaries against 18 of 23. 34 of 38 still start with "The candidate ranks", which the prompt asks for in its first sentence. The same check on the deployed engine is recorded after the apply.
