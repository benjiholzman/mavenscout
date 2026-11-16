# MavenScout GenAI POC: Delivery Plan

| | |
|---|---|
| Status | Living plan |
| Phase | P0 to P4 |
| Task | Delivery plan |
| Owner | Guillermo Sandoval |
| Date | 2026-11-16 |
| Sources | SOW extract, ranking brief, match rework spec, architecture blueprint |

Repo: `benjiholzman/mavenscout`, Loop8 source of truth: branch `loop8-develop`
Authority, in order: `loop8/docs/sow/SOW-MavenScout-GenAI-POC.md` (signed PDF wins),
`docs/MavenScout — Ranking Engine Brief for Loop8.md`, `docs/MavenScout-match-rework.md`,
`CLAUDE.md`

## Context

MavenScout is a curated consultant marketplace for the international development sector. The app is
already built (Vite, React, TypeScript, Supabase) and the ranking flow works end to end: a hiring
manager sets priorities, optionally pastes a job description (JD) or Terms of Reference (ToR), and
ranks the directory. The scoring rules, score display and persistence are decided and built.

What is placeholder is the **understanding**: requirement extraction and Fit are keyword matching
today. Loop8 builds the real engine behind two functions in `src/lib/matching/`
(`extractRequirements` and `rankPool`), running server-side on AWS, plus the component breakdown and
narrative the SOW asks for.

Success, per SOW section 5:

1. A hiring manager pastes or uploads a JD and gets a ranked candidate shortlist.
2. Each result shows a confidence score with a multi-dimensional breakdown.
3. Each result has a plain-language narrative explaining its rank.

And per the brief: the engine must clearly beat the placeholder on vocabulary-mismatch test cases,
at a known and affordable cost per ranking across about 3,000 profiles. On 2026-11-16 the customer added how success will be judged: show with an objective measure that the AI ranking is better than the manual one, not only different, and how much better, so the gain can be weighed against the AI cost.

## State as of 2026-11-16

| Item | Status |
|---|---|
| Repo access | Have it. Loop8 works on `loop8-develop`, which is the source of truth. `main` is the customer's and is never touched |
| Customer AWS account | Dedicated MavenScout account. Read-only checks on 2026-11-09 and 2026-11-13 (see the runbook findings): Titan V2, GPT-6 Luna and GPT-6 Sol are usable. Claude Haiku 5.5 and Sonnet 5.5 are blocked (quota at 0, Anthropic use case form not submitted) and are not in the plan. Quota increase requests were filed on 2026-11-12 and have not been granted. No Lambda functions and no budgets yet |
| AWS Business Support+ | Requested. The Support API did not answer as Basic, to be confirmed |
| Test data | 98 synthetic profiles (`is_demo`), five sample ToRs, `expectations.json` and the baseline harness (`npm run baseline`) are in the repo. The baseline has not been re-run against a database yet |
| Engine contract | Defined: match-rework spec sections 4 and 6, `src/lib/matching/types.ts` |
| Design | Documented in `loop8/docs/architecture/index.html` (asynchronous, Bedrock, OpenSearch Serverless, two stages, models as settings by role). The customer approved the plan on 2026-11-13 |
| Customer document | "Flows and Costs" sent to the customer (`loop8/docs/client-proposal/`). Answered on 2026-11-12: four variants to test, summaries of 40 to 60 words, a target of 10 to 30 seconds, a cap of 10 rankings per account per month if time allows. Still open: the score breakdown |
| Customer call 2026-11-16 | Phase 1 reported closed and Phase 2 started. The customer accepted Luna and Sol, asked for the most limited version first, and left the data model, weights and expertise until the first version exists. Dates: build this week with WhatsApp updates, show and test on 2026-11-23, a possible wrap-up call on 2026-12-02 or 03. The 2026-11-30 call is not settled. The baseline of P1 has not been run yet |
| App build | `npm ci && npm run build` passes on `loop8-develop` |

## Working model

1. Feature branches `feature/<issue>-<short-name>` off `loop8-develop`, one pull request per deliverable back into `loop8-develop`. `main` belongs to the customer and is never touched.
2. Every change starts from a GitHub issue on `benjiholzman/mavenscout`.
3. Per SOW section 9, no Terraform, CloudFormation or CI/CD is committed to this repository. The POC environment in the customer's AWS account is created with the AWS CLI and recorded in `loop8/docs/runbooks/poc-environment.md`.
4. The repository is public. No secrets, account IDs, client personal data, commercial terms or internal notes. Everything Loop8 writes lives under `loop8/`, and internal notes live in `loop8/internal/` (gitignored).

## Engine direction (decided 2026-11-13)

The original three mode plan (filter, then preferences, then AI) does not scale to large pools: a manager may skip filters, and preferences only rank, they do not filter. On the 2026-11-02 call the customer agreed to Loop8 proposing a better approach, provided it is affordable per ranking. The detailed design is in `loop8/docs/architecture/index.html`. In short:

1. **Must haves filter first** (app side, unchanged). Failing candidates are never scored.
2. **Read the JD once.** `extractRequirements` runs one language model call (the text model setting). The output is stored with the JD. Until the customer confirms in writing that the AI may suggest Important and Must have priorities shown before the run, the model never sets a Must have.
3. **Stage 1, search by meaning.** Embeddings (Titan Text Embeddings V2) of profile fragments are stored in a vector database (OpenSearch Serverless, chosen on 2026-11-13). Indexing is a script run by hand in the POC. A candidate passes by an absolute similarity threshold, not by rank, with a hard cap of 200. Transcripts are never indexed.
4. **Stage 2, Fit per candidate.** The Fit model setting judges Fit (0 to 100) from the top 5 fragments of each candidate, with component scores. Candidates below the threshold get a capped, flagged estimated Fit from their similarity.
5. **Total and narrative.** The existing scoring code computes the total and band. Summaries (40 to 60 words, the text model setting) are written last: 3 by default, the next 5 on demand, or none, with the existing template as fallback.
6. **Asynchronous jobs.** API Gateway returns a job id, an SQS queue feeds a worker Lambda, state lives in DynamoDB and results in S3, so no request is held open and retries are safe. A repeated search with the same inputs returns the stored result at no cost (design intent, not built).

The pool independence rule (brief rule 3) is kept by the absolute threshold and the estimated Fit below it.

Models are settings by role. Confirmed on 2026-11-16: Titan Text Embeddings V2 for embeddings, GPT-6 Luna for Fit, GPT-6 Sol for extraction and summaries. Claude Haiku 5.5 and Sonnet 5.5 are not part of the plan and would only be compared if they are unblocked. The prices of the GPT-6 models are not published, so cost figures use Claude prices as a reference only. Reference estimate per ranking at a shortlist of 100, not measured: about $0.04 for variants A and B, $0.09 for C and $0.11 for D (the four variants the customer asked to test). See the architecture page, cost section.

## Phases

Phases follow the Nimbus tracker (P0 to P4). SOW weeks 1 to 3 map to P1 to P3. The ordered list of 15 starting steps, each with the proof that it worked, is in the "How to start" section of `loop8/docs/architecture/index.html`.

### P0: Setup

1. Repo cloned, `loop8-develop` flow agreed, Loop8 docs added (this plan, SOW extract, CLAUDE.md)
2. AWS onboarding to the MavenScout account, Business Support+ activation
3. Kickoff and Sales to Delivery handoff (done)

### P1: Discovery and Technical Assessment (SOW week 1)

1. Audit the codebase: profile data structure, `src/lib/matching/`, `src/lib/requirements/`,
   migrations 000 to 019
2. Define the profile fields that feed the engine and the JD parsing requirements
3. Run `npm run baseline` and record the placeholder's numbers before changing anything
4. Add harder vocabulary-mismatch test cases to `docs/samples/expectations.json`
5. Choose the architecture and models (Bedrock model, embedding model, vector store, serving
   layer). Set a target cost and latency per ranking first
6. AWS environment setup in the customer account (starts with the Anthropic use case form and the Bedrock quota requests, which need an administrator)
7. **Deliverable:** technical assessment report (architecture, cost and latency per ranking)

### P2: JD Parsing and Candidate Matching Engine (SOW week 2)

1. Server-side `extractRequirements`: separate "the programme covers Nigeria" from "must be based in
   Nigeria", map paraphrases to the expertise list, never set Must have
2. Generate profile embeddings and store them in the vector store
3. Server-side `rankPool`: semantic Fit across the whole profile, relevance not volume
4. Surface ranked results in the existing flip card UI through the unchanged contract
5. **Deliverables:** parsing module, matching engine with embeddings and ranked results

### P3: Confidence Scoring and Explainability (SOW week 3)

1. Multi-dimensional scoring model: component scores behind the overall match
2. Display the component breakdown alongside the overall score on each card
3. Plain-language ~100-word narrative per candidate that never contradicts the numbers
4. Propose `config.ts` values (bands, weights, credits) from our own baseline runs, for sign-off
5. **Deliverable:** scoring model with component breakdown and narrative

### P4: Validation and Handoff

1. Baseline before and after, including the new test cases and the 3 vs 10 portfolio-item check
2. Cost per ranking measured on the full pool
3. Final documentation: findings summary, architecture overview, recommendations (SOW section 9)
4. Demo walkthrough; POC environment kept 30 days post-demo, then decommissioned
5. Handoff of the final code to the customer. Loop8 never touches `main`; how the customer receives `loop8-develop` is agreed at handoff

## Build plan for the engine and its AWS environment (2026-11-16)

The order below follows the engagement rules: what the task is for, what the design decided, what will be built, assumptions, impact, acceptance criteria and steps. A build record is added to each step after it is validated.

### What this is for

To build the proof of concept of the ranking engine behind `extractRequirements` and `rankPool`, run it on the customer's AWS account, and measure the four variants the customer asked to test. Everything here is limited to the proof of concept in the SOW.

### What the design already decided

1. Asynchronous engine: API Gateway HTTP API, a Lambda api, SQS with a dead-letter queue, a worker Lambda, DynamoDB for job state, idempotency and counters, S3 for inputs and results, Secrets Manager, CloudWatch and a Budget alert.
2. Bedrock through the US inference profiles. Titan Text Embeddings V2 (1024 dimensions) and OpenSearch Serverless for the vector search. Supabase stays the source of profiles.
3. Model roles as settings: text model, Fit model, embedding model.
4. Scoring rules, Must have filtering and the Fit rules from `loop8/CLAUDE.md` section 3, unchanged.

### What will be built

1. **Code** in `loop8/engine/`: the job lifecycle (create, queue, work, store, read), the model calls behind a role setting, the indexing script, the result shape the app already expects, and the per account monthly counter (only if time allows).
2. **Environment** with the AWS CLI, recorded in `loop8/docs/runbooks/poc-environment.md` the same day each resource is created. No Infrastructure as Code and no CI/CD (SOW section 9). Every resource carries the funding tag from `loop8/CLAUDE.md` section 9.

### Assumptions

1. The text model is GPT-6 Sol and the Fit model is GPT-6 Luna. Their quality for this task is not yet measured, and the first measured variant decides whether the choice holds.
2. The app passes a hiring manager identifier to the engine. The app's authentication is simulated, so this is a value, not a login.
3. The customer approves every cost figure and the budget amount. The customer pays the AWS cost.
4. The term of the SOW allows two to three weeks of work. To be confirmed.

### Impact analysis

1. No change to `main`. The only code outside `loop8/` is the two engine functions in `src/lib/matching/`, with a reason written in the issue.
2. New AWS resources add cost to the customer's account. Each is created only after explicit approval and removed at decommissioning.
3. The "ask first" rules stay in force except the one in open question 10, which needs written confirmation.

### Acceptance criteria

1. `npm run baseline` is recorded before any change and after each engine change.
2. Variants A to D each run end to end and report quality, time per ranking and cost per ranking, all marked as measured with where they came from.
3. A ranking of a pasted job description returns in 10 to 30 seconds for the small model variants (the customer's target), and the failure paths (model error, duplicate request, expired job) behave as the design says.
4. Results show the score breakdown and a summary, and a candidate's score does not depend on the rest of the pool.
5. The same test cases are ranked manually and with the AI, and one measure shows whether the AI ranking is better and by how much, next to the measured cost per ranking.

### Remaining steps

1. Run `npm run baseline` with the demo data and record the placeholder numbers (P1). Proof: the baseline file changes and the numbers are in the plan.
2. Update this plan and the runbook with the quota requests of 2026-11-12 (same day rule).
3. Create the budget with an alert, with the amount chosen by the customer (needs approval).
4. Build the job lifecycle skeleton in `loop8/engine/` with fake model calls, then test the failure paths locally.
5. Connect Titan V2 and the Fit model, and measure variant A (small model only, 5 summaries), including the manual against AI comparison on the test cases. This is what is shown on 2026-11-23.
6. Run the short OpenSearch build check (needs approval, creates resources and cost), then index the demo profiles by script.
7. Add the text model calls for extraction and summaries, and measure variants B, C and D.
8. Add the monthly counter per hiring manager if time allows.
9. Validation, handoff documents per phase, and the demo (P4).

## Decision rights (from the brief)

| Tier | Covers |
|---|---|
| Loop8 decides | Everything inside `extractRequirements` and `rankPool`: models, prompts, retrieval, embeddings, Fit, evidence, narratives, infrastructure |
| Propose, customer signs off | `src/lib/matching/config.ts` values: points, per-point weight and 20% cap, bands, partial credits, calibration |
| Ask first | Additive structure (Fit plus preference share), Must haves filtering before scoring, extraction never setting Must have, membership never affecting rank, employers never pre-filled |

## Open questions

1. **SOW components against the Fit rule.** SOW section 3 lists "sector and geographic relevance" and "seniority alignment" as components. The brief says Fit must not score location, career level, language, availability or employers. Proposal: technical skills, domain expertise and sector and regional experience (allowed by the brief) come from Fit, and seniority and where someone is based come from the priority rows. Asked to the customer as question 3 of the Flows and Costs document.
2. **Conversational agent.** SOW section 3 mentions selecting services for a "conversational agent" but no deliverable or success criterion covers one. Confirm it is out of scope for this POC.
3. **Cost and latency target per ranking.** The customer has not given one. The document asks for the acceptable wait time.
4. **Differences from the SOW architecture diagram.** Profiles stay in Supabase instead of DynamoDB, ranked results use S3 and DynamoDB instead of ElastiCache, and CloudFront, Cognito and Amplify are not included. Each is documented with its reason in the technical assessment. Agree with the project manager how to tell the customer.
5. **Vector database.** OpenSearch Serverless is chosen. It still needs a short build check: filtering by a list of ids, accuracy under the default compression, creation from the CLI and its real cost.
6. **Quota and access.** Not blocking, because Luna, Sol and Titan are the confirmed models. Claude Haiku 5.5 and Sonnet 5.5 stay blocked until the quota requests are granted and the Anthropic use case form is decided. They are optional for a later comparison.
7. **Region.** us-east-1 with the US inference profile. The customer should know requests can be processed in us-east-1, us-east-2 or us-west-2.
8. **Term.** The SOW runs 30 days from kickoff (roughly until November 18, not verified). More time needs a signed written amendment. The customer's dates on 2026-11-16 reach 2026-12-03, so ask the project manager how the term is counted and whether a written amendment is needed. This is the most urgent question.
9. **Expertise.** The customer proposed reading expertise as free text and dropping its filter and priority. Whether expertise counts twice (as a tag and as text) is open.
10. **Priority suggestions.** The customer agreed the AI may suggest Important and Must have priorities if they are shown before the run. This changes an "ask first" rule, so it is recorded here only after the written confirmation and then in `loop8/CLAUDE.md`.
11. **Scope of the model change.** Seniority, work arrangement and employers stay as they are, outside Fit.
12. **Quality measure.** The customer wants an objective measure of manual against AI ranking quality but did not define it. Proposal: rank the same test cases both ways and compare the position of the expected profiles, next to the measured cost. To be agreed with the customer.
13. **Not discussed on 2026-11-16.** The monthly cap, the threshold, written confirmation of suggested priorities, expertise counted twice and the AWS budget amount. They keep their status above.

## Team

Guillermo (project lead), Nashita, Shivang and Krish (engineering), Chad (project manager, all
customer communication). Task assignments and hours live in Nimbus.
