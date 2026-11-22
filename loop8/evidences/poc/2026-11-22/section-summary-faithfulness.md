# Do the written summaries say what the data says? (2026-11-22)

POC environment, us-east-1. A check of the top five summaries written by the engine, before and after a fix. No secret value and no account id is written here. The plan with the build record is [summary-writing-plan.md](../../../docs/planning/summary-writing-plan.md).

## What could and could not be tested

| Area | Tested | Method |
|---|---|---|
| The numbers in the text (total, Fit, band) match the data | Yes | 23 real summaries of the deployed engine, `summary-faithfulness-check.log` P1 |
| A claim that every priority was met against the stored rows | Yes | The same check, rows with outcome partial or not met, P1 |
| Fit explained by location, language, career level or employer | Yes | A search of the sentence that names Fit, P1 |
| The fix on real candidates | Yes, on the summary step only | 20 real candidates per run with Nova Lite, P2 and P3 |
| The fix inside a deployed job | Not yet | It needs the fix merged and applied |
| Whether the text is true in every detail (an invented skill or a wrong place) | No | It would need a person to read the evidence of each candidate. Only what the numbers and rows can prove was checked |
| How a customer reads the tone | No | A judgment, not a measure |
| Other models than Nova Lite | No | The agreed models are not enabled for the account |

## Results

| Check | Result | Log |
|---|---|---|
| Numbers right | 23 of 23 | P1 |
| Fit sentence naming an excluded attribute | 0 of 23 | P1 |
| Summary says every priority was met while a row was partly met or not met | 5 of 23 (22 percent) before the fix | P1 |
| Summaries that start with The candidate ranks, and that use the word proven | 23 of 23 and 18 of 23 before the fix | P1 |
| Live check after the fix | 38 of 40 accepted (95 percent), 35 at the first try, no first reply overclaimed | P2, P3, P4 |
| Summaries with proven, extensive or impressive after the fix | 8 of 38 | P2, P3, P4 |
| Summaries that start with The candidate ranks after the fix | 34 of 38 | P2, P3, P4 |

## Not run

The same check on the deployed engine after the fix, a read of the text against the evidence by a person, and the check with the agreed models.
