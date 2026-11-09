# Technical Assessment: MavenScout Ranking Engine (draft)

| | |
|---|---|
| Status | Draft in progress |
| Phase | P1 |
| Task | SOW deliverable 1, technical assessment report |
| Owner | Guillermo Sandoval |
| Date | 2026-11-09 |
| Sources | Code on `loop8-develop`, AWS Price List API, read-only checks of the customer AWS account, SOW |

SOW deliverable 1, Phase 1. **Status: draft in progress.**

Sections 1 to 3 come from reading the code on `loop8-develop` on 2026-11-04. Section 4 is an estimate of the cost per ranking using official AWS prices read on 2026-11-09 and approximate token sizes. It is not measured. Section 5 is the proposed architecture, to be confirmed. Section 6 lists every difference from the architecture diagram in the signed SOW, with the reason.

## 1. How ranking works today

Ranking runs **entirely in the browser**, against Supabase with the anon key.

| Step | Where | Today |
|---|---|---|
| Manager sets priorities, pastes a JD | `src/components/ranking/`, `src/pages/Directory.tsx` | Real UI |
| Read the JD once | `extractRequirements`, `src/lib/matching/extract.ts` | **Placeholder:** literal matching of expertise names and aliases, location and language names |
| Must haves filter the pool | `src/lib/requirements/mustHaves.ts` | Real, app side |
| Create the run row | `createRun`, `src/lib/matching/persist.ts` | Real (`job_descriptions`) |
| Score each candidate | `rankPool`, `src/lib/matching/score.ts` | **Placeholder Fit** (`fit.ts`), real preference scoring (`adjustments.ts`, `total.ts`) |
| Narrative | `buildNarrative`, `src/lib/matching/narrative.ts` | **Placeholder template** from the numbers |
| Save results | `saveResults`, `persist.ts` | Real (`match_results`) |
| Show results | `src/components/match/RankHeader.tsx`, `AboutResultModal.tsx` | Real UI |
| Loosen a Must have | `scoreNewcomers`, `persist.ts` | Real: scores only newcomers and merges |

### Placeholder Fit (`fit.ts`)

1. JD signature, once per run: the 40 most frequent content words of the JD, minus "condition" words
   (availability, seniority, language and location words) and organization names, plus the words of
   the extracted expertise items.
2. Evidence score: the share of those words that appear anywhere in the candidate's evidence text.
3. Tag coverage: how well the candidate's Core / Strong / Working knowledge tags cover the extracted
   expertise (credit 1 / 0.75 / 0.4).
4. Blend 5 : 6 (evidence : tags), then a calibration curve
   `100 x (1 - e^(-1.5 x raw)) / (1 - e^(-1.5))`.

## 2. Findings

| # | Finding | Where | Why it matters |
|---|---|---|---|
| F1 | Fit's evidence text is headline, bio, portfolio items and accreditations only. **Work history, education and additional experience are not read.** | `evidenceText` in `fit.ts` | The brief expects Fit to judge bio, portfolio, work history, education and certifications |
| F2 | The "untagged text mention" partial credit for preference rows uses the same evidence text, so it has the same gap | `adjustments.ts` | Expertise described only in work history earns no partial credit |
| F3 | **Volume bias.** Evidence is all portfolio items joined into one text, so every extra item adds words that can hit the JD's terms. More items can only raise the score | `evidenceScore` in `fit.ts` | Breaks "relevance, not volume": Featured Members (up to 10 items) have an edge over Members (3) |
| F4 | Scoring runs client side and loads the pool's portfolio items with one `.in('profile_id', ids)` query | `loadEvidence` in `score.ts` | At about 3,000 candidates this query, and the browser doing the work, are unlikely to hold up. Moving the engine server side removes it |
| F5 | Extraction is literal. Every place named in the JD is suggested as a location, whether it is where the work is or where the consultant must be. `hiring_organization` is always null | `extract.ts` | The brief asks the engine to tell "programme covers Nigeria" from "must be based in Nigeria" |
| F6 | The result contract has a single `fit_score`, with no component scores | `JdMatchResult` in `types.ts` | SOW section 3 asks for a component breakdown (see section 3.3) |
| F7 | `match_results.sub_scores` (jsonb, nullable) is a legacy column, typed `MatchSubScore` with components including `technical_skills` and `domain_expertise`. Nothing writes it now | `000_schema.sql`, `src/types/db.ts` | Could hold component scores without a migration, if the customer agrees to reuse it |
| F8 | Loosening a Must have scores only the newcomers and merges them | `scoreNewcomers` in `persist.ts` | The engine must give each candidate an absolute score that does not depend on who else is in the pool (brief rule 3) |
| F9 | Engine output already maps to existing columns: `fit_score`, `total_score`, `band`, `adjustments`, `scoring`, `narrative` | `persist.ts` | No schema change is needed for the engine itself |
| F10 | UI copy describes the placeholder: a "placeholder" badge on the narrative, and "How scoring works" says Fit reads "portfolio, bio, accreditations and expertise tags" | `AboutResultModal.tsx` | Must be updated when the real engine lands |
| F11 | Row Level Security on `job_descriptions` and `match_results` is development-open (`USING (true)`) | `000_schema.sql` | Not POC scope. A server-side engine needs a Supabase key that bypasses RLS, so that key lives in Secrets Manager only |

## 3. Engine inputs and outputs

### 3.1 Profile fields for Fit

| Field | Used in Fit | Notes |
|---|---|---|
| `headline`, `detailed_bio` | Yes | Short. Candidates for the stage 1 pre-screen text |
| Portfolio items: project name, role, description, results | Yes | Judged per item, best evidence counts, not volume |
| `work_history`: role, organization, description | Role and description yes; **organization name no** | The brief says employer names never score in Fit |
| `education_history`, `accreditations` | Yes | Certifications are evidence of capability |
| `additional_experience` | Yes | Not read today (F1) |
| `tiered_expertise` (Core / Strong / Working knowledge) | Yes | Already scored by preference rows too; watch for double counting (brief open question) |
| `location`, `spoken_languages`, availability, `career_level`, `work_types` | **No** | Practical conditions, handled by priority rows |
| Video Q&A and audio testimonial transcripts | **No** | Display only |
| `is_premium`, membership | **No** | Never affects rank |

### 3.2 JD parsing

Output stays `ExtractedRequirements` (`types.ts`): expertise items from the unified list with mention
counts, locations, languages, hiring organization. What the real extractor must add:

1. Map paraphrases to list items ("refugee livelihoods" to Economic Inclusion & Livelihoods and
   Refugees & Forced Displacement).
2. Separate work location from required residence; suggest only the second as a location row.
3. Find the hiring organization.
4. Never suggest Must have. Optionally flag items the ToR itself calls "required" or "essential" so
   the manager can choose to make them Must haves (the brief's idea).

### 3.3 SOW components vs the brief's Fit rule

SOW section 3 asks for components "technical skills, domain expertise, sector and geographic
relevance, and seniority alignment". The brief says Fit must not score location or career level.
Proposed split, to confirm with the customer:

| SOW component | Source |
|---|---|
| Technical skills | Fit component (methods and skills evidence) |
| Domain expertise | Fit component (sector and theme evidence) |
| Sector and geographic relevance | Fit component for experience working in a sector or region (allowed by the brief); "based in" stays a priority row |
| Seniority alignment | Existing Career level priority row, not Fit |

## 4. Estimated cost per ranking

**Not measured.** The prices are official. The token sizes and the number of calls are our assumptions, so the totals are estimates.

### Prices used

Read from the AWS Price List API for us-east-1 on 2026-11-09. The US inference profile keeps processing inside US Regions and costs 10% more than the global profile. It is the one used here.

| Model | Input per million tokens | Output per million tokens | Cached input per million tokens |
|---|---|---|---|
| Claude Haiku 5.5, US profile | $0.11 | $0.55 | $0.011 |
| Claude Sonnet 5.5, US profile | $2.20 | $11.00 | $0.11 |
| Titan Text Embeddings V2 | $0.02 | not applicable | not applicable |

The Titan price comes from an AWS blog post (May 2024), not from the price list. Claude Haiku 5.5 and Sonnet 5.5 do not support batch inference according to their model cards.

### Token sizes assumed

| Operation | Input tokens | Output tokens | Basis |
|---|---|---|---|
| Read one JD (extraction) | about 8,000 | about 600 | JD of 740 to 3,750 tokens, the 140 item expertise list, location and language options and instructions |
| Fit, per candidate | about 2,500 | about 120 | About 1,200 shared (rubric and requirements) plus about 1,300 of evidence from 5 fragments. Assumes short structured output and no extended thinking |
| Narrative, per candidate | about 1,500 | about 200 | Numbers, rows and short evidence in, about 100 words out |

### Cost per operation and per ranking

| Item | Claude Haiku 5.5 | Claude Sonnet 5.5 |
|---|---|---|
| Read one JD | $0.0012 | $0.024 |
| Fit, one candidate | $0.00034 | $0.0068 |
| Narrative, one candidate | $0.00028 | $0.0055 |

A full ranking assumes the AI reviews 100 candidates in depth and writes narratives for the top 20, plus 10% for retries and about $0.002 of AWS infrastructure around the models. The search database is not included.

| Option | Models | Typical per ranking | Likely range |
|---|---|---|---|
| Haiku only | Haiku 5.5 for everything | $0.05 | $0.02 to $0.14 |
| **Sonnet and Haiku (recommended)** | Sonnet for extraction and narratives, Haiku for Fit | **$0.19** | $0.09 to $0.56 |
| Sonnet only | Sonnet 5.5 for everything | $0.90 | $0.45 to $2.70 |

With a shortlist of 200 the recommended option is about $0.22. Writing narratives only for the top 10 lowers it to about $0.13. The ranges are our judgment, not a calculation. Sending all 3,000 profiles to the model with no stage 1 would cost about $1.13 on Haiku 5.5 and about $22.65 on Sonnet 5.5, so cost alone no longer forces two stages. The case for them is speed and the account's rate limits.

### Monthly view and other costs

| Rankings per month | Haiku only | Sonnet and Haiku | Sonnet only |
|---|---|---|---|
| 100 | $5 | $19 | $90 |
| 500 | $23 | $94 | $450 |
| 2,000 | $94 | $374 | $1,800 |

These are the rankings only. OpenSearch Serverless adds about $5 to $100 a month with the newer type that scales to zero (our estimate, to be measured), or a fixed $175 to $350 a month with the classic type. Supporting AWS services add about $5 a month. Indexing 3,000 profiles costs under $1 but takes at least an hour because of the Titan limits (600 requests and 300,000 tokens per minute, not adjustable). Testing during the POC is estimated under $60. The customer pays the AWS cost (SOW section 13.3).

### Latency

Not measured. The estimate is 1 to 2 minutes per ranking, from 100 to 200 model calls of 2 to 5 seconds with about 16 running in parallel. This is why the engine is asynchronous.

## 5. Architecture (proposed)

The full design, with diagrams, failure handling, limits and risks, is in `loop8/docs/architecture/index.html`. Summary:

| Layer | Choice | Why |
|---|---|---|
| Front door | API Gateway HTTP API, two routes | Requests are short because work is asynchronous |
| Work | Lambda api, SQS with a dead-letter queue, Lambda worker | Caps concurrent jobs, redelivers after a crash, no request held open |
| State and results | DynamoDB (job state, idempotency, TTL 7 days), S3 (inputs and results) | Temporary data that expires by itself, results too large for a synchronous response |
| Models | Bedrock, US inference profiles: Claude Sonnet 5.5, Claude Haiku 5.5, Titan Text Embeddings V2 | The 5.5 models are reachable only through inference profiles |
| Vector search | OpenSearch Serverless, after a short test. Fallback: pgvector with exact search in Supabase | It is the vector database in the SOW diagram and keeps search load off the app's database |
| Profiles | Supabase (existing), read through the shared pooler in transaction mode | The profiles already live there |

Open decisions: the customer's wait time and cost expectations, approval to enable the AI models, and the result of the OpenSearch test.

## 6. Differences from the SOW architecture diagram

The signed SOW diagram shows API Gateway, Lambda, Amazon Bedrock with Titan embeddings, OpenSearch as the vector database, DynamoDB for candidate profiles, ElastiCache for ranked results, and CloudFront, Cognito and Amplify CI/CD for the frontend. SOW section 3 says the architecture is confirmed in this phase.

| In the SOW diagram | In this design | Reason |
|---|---|---|
| API Gateway, Lambda, Bedrock and Titan, OpenSearch | Same | Aligned |
| DynamoDB for profiles | Profiles stay in Supabase. DynamoDB holds job state only | The profiles already live there and the app reads them. Copying them adds a sync and no benefit |
| ElastiCache for ranked results | S3 and DynamoDB | Results are temporary and read once or twice. A cache cluster has a fixed monthly cost and S3 does not |
| CloudFront, Cognito, Amplify CI/CD | Not included | The frontend already exists, sign-in is mocked in this build, and SOW section 9 says no CI/CD is delivered |

## 7. Next steps

1. Run `npm run baseline` against a Supabase copy with the demo data and record the placeholder numbers.
2. With an administrator of the customer account: submit the Anthropic use case form and request the Bedrock quota increases.
3. Measure real profile token sizes and prototype Fit on a handful of profiles to measure output tokens, latency and cost.
4. Run the OpenSearch test and decide between it and the pgvector fallback.
5. Replace section 4 with measured numbers.
