# Technical Assessment: MavenScout Ranking Engine (draft)

SOW deliverable 1, Phase 1. **Status: draft in progress.**

- Sections 1 to 3 come from reading the code on `loop8-develop` on 2026-11-04.
- Section 4 is a **preliminary** cost estimate from approximate sizes and third-party price lists.
  It is not yet measured. Replace it with measured numbers once a Supabase copy with the demo data
  exists and prices are confirmed on the official AWS Bedrock pricing page.
- Section 5 (architecture) is not decided yet.

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

- Map paraphrases to list items ("refugee livelihoods" to Economic Inclusion & Livelihoods and
  Refugees & Forced Displacement).
- Separate work location from required residence; suggest only the second as a location row.
- Find the hiring organization.
- Never suggest Must have. Optionally flag items the ToR itself calls "required" or "essential" so
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

## 4. Preliminary cost per ranking

**Not measured.** Approximate sizes, about 4 characters per token:

| Input | Approx. size | Basis |
|---|---|---|
| Sample ToR | 500 to 750 tokens | `docs/samples/*.txt` are 1.9 to 3.0 KB |
| Longest allowed JD | about 3,750 tokens | `JD_MAX_CHARS = 15,000` |
| One profile's evidence | about 1,000 tokens (Member), up to about 2,000 (Featured, 10 portfolio items) | Estimate from the profile sources (98 profiles, about 690 KB including ids, URLs and media). Measure once a Supabase copy with the demo data exists |

Reference prices, on-demand, per million tokens (input / output). **Third-party sources, verify on
the official AWS Bedrock pricing page before this goes to the customer:**

| Model | Price |
|---|---|
| Claude Haiku 4.5 | $1 / $5 |
| Claude Sonnet 4.6 | $3 / $15 |
| Titan Text Embeddings V2 | $0.02 input |

Newer Claude models are listed at different prices by different sources; one source puts Claude
Haiku 5.5 far lower than Haiku 4.5. If confirmed, the LLM costs below drop accordingly.

### Per ranking, two-stage design

| Part | Tokens | Haiku 4.5 | Sonnet 4.6 |
|---|---|---|---|
| Extraction, once per JD (JD + expertise list + instructions in, about 600 out) | about 8,000 in / 600 out | about $0.01 | about $0.03 |
| Stage 1 pre-screen (one query embedding; vector search in the store) | about 1,000 | under $0.001 | under $0.001 |
| Stage 2 deep rank, per shortlisted candidate (rubric + requirements + best evidence in; Fit, components, ~100-word narrative out) | about 2,500 in / 250 out | about $0.004 | about $0.011 |
| **Shortlist of 50** | | **about $0.20** | **about $0.60** |
| **Shortlist of 100** | | **about $0.39** | **about $1.16** |
| **Shortlist of 200** | | **about $0.76** | **about $2.28** |

For comparison, sending all 3,000 candidates to the LLM with no pre-screen: about $11 per ranking on
Haiku 4.5, about $34 on Sonnet 4.6. That is the case for two stages.

One-time embedding of 3,000 profiles at about 1,200 tokens each: about $0.07. Re-embedding on profile
edits is negligible.

Levers not yet counted: prompt caching for the shared rubric and requirements, batching several
candidates per call, and generating narratives only for the candidates a manager actually views.

Not included: Lambda and API costs (expected to be small), and the vector store. pgvector in the
customer's Supabase adds no AWS cost; S3 Vectors charges for storage and queries; OpenSearch
Serverless has a minimum monthly compute charge. Price each before choosing.

### Latency

Not estimated yet. Stage 2 calls can run in parallel, bounded by the account's Bedrock request and
token quotas (runbook Part A6). Measure once the environment exists.

## 5. Architecture

To be decided. Working proposal in `docs/planning/PROJECT_PLAN.md` ("Recommended engine direction"):
Must haves first, JD read once, cheap embedding pre-screen, LLM deep rank on the shortlist, with
scores kept pool-independent.

Decisions still needed: model per stage, vector store, serving layer (Lambda plus Function URL or API
Gateway), and the customer's cost and latency target per ranking.

## 6. Next steps

1. Supabase copy with demo data; reproduce the placeholder baseline.
2. Measure real profile token sizes and replace section 4's estimates.
3. Confirm prices on the official Bedrock pricing page; run the AWS read-only checks.
4. Prototype stage 2 on a handful of profiles to measure output tokens and latency.
