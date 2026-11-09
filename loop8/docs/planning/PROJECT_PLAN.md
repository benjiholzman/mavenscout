# MavenScout GenAI POC: Delivery Plan

| | |
|---|---|
| Status | Living plan |
| Phase | P0 to P4 |
| Task | Delivery plan |
| Owner | Guillermo Sandoval |
| Date | 2026-11-09 |
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
at a known and affordable cost per ranking across about 3,000 profiles.

## State as of 2026-11-09

| Item | Status |
|---|---|
| Repo access | Have it. Loop8 works on `loop8-develop`, which is the source of truth. `main` is the customer's and is never touched |
| Customer AWS account | Dedicated MavenScout account. Read-only role checked on 2026-11-09 (see the runbook findings): Haiku 5.5, Sonnet 5.5 and Titan V2 listed as active, Anthropic use case form not submitted, Bedrock tokens per minute quota applied at 0 for the two Claude models, no Lambda functions and no budgets |
| AWS Business Support+ | Requested. The Support API did not answer as Basic, to be confirmed |
| Test data | 98 synthetic profiles (`is_demo`), five sample ToRs, `expectations.json` and the baseline harness (`npm run baseline`) are in the repo. The baseline has not been re-run against a database yet |
| Engine contract | Defined: match-rework spec sections 4 and 6, `src/lib/matching/types.ts` |
| Design | Proposed and documented in `loop8/docs/architecture/index.html` (asynchronous, Bedrock, OpenSearch Serverless, two stages). Not yet approved by the customer |
| Customer document | "Flows and Costs" sent to the project manager for the customer (`loop8/docs/client-proposal/`). Three open questions to the customer: wait time, approval to enable the AI models, the score breakdown |
| App build | `npm ci && npm run build` passes on `loop8-develop` |

## Working model

1. Feature branches `feature/<issue>-<short-name>` off `loop8-develop`, one pull request per deliverable back into `loop8-develop`. `main` belongs to the customer and is never touched.
2. Every change starts from a GitHub issue on `benjiholzman/mavenscout`.
3. Per SOW section 9, no Terraform, CloudFormation or CI/CD is committed to this repository. The POC environment in the customer's AWS account is created with the AWS CLI and recorded in `loop8/docs/runbooks/poc-environment.md`.
4. The repository is public. No secrets, account IDs, client personal data, commercial terms or internal notes. Everything Loop8 writes lives under `loop8/`, and internal notes live in `loop8/internal/` (gitignored).

## Engine direction (proposed 2026-11-09, to be confirmed in Phase 1)

The original three mode plan (filter, then preferences, then AI) does not scale to large pools: a manager may skip filters, and preferences only rank, they do not filter. On the 2026-11-02 call the customer agreed to Loop8 proposing a better approach, provided it is affordable per ranking. The detailed design is in `loop8/docs/architecture/index.html`. In short:

1. **Must haves filter first** (app side, unchanged). Failing candidates are never scored.
2. **Read the JD once.** `extractRequirements` runs one language model call (Claude Sonnet 5.5). The output is stored with the JD. The model never sets a Must have.
3. **Stage 1, search by meaning.** Embeddings (Titan Text Embeddings V2) of profile fragments are stored in a vector database (OpenSearch Serverless, pgvector in Supabase as the documented fallback). A candidate passes by an absolute similarity threshold, not by rank, with a hard cap of 200. Transcripts are never indexed.
4. **Stage 2, Fit per candidate.** Claude Haiku 5.5 judges Fit (0 to 100) from the top 5 fragments of each candidate, with component scores. Candidates below the threshold get a capped, flagged estimated Fit from their similarity.
5. **Total and narrative.** The existing scoring code computes the total and band. Narratives (Claude Sonnet 5.5, about 100 words) are written after the totals for the top 20, with the existing template as fallback.
6. **Asynchronous jobs.** API Gateway returns a job id, an SQS queue feeds a worker Lambda, state lives in DynamoDB and results in S3, so no request is held open and retries are safe. A repeated search with the same inputs returns the stored result at no cost (design intent, not built).

The pool independence rule (brief rule 3) is kept by the absolute threshold and the estimated Fit below it.

Estimated cost per ranking, US inference profile, official AWS prices, not measured: about $0.19 with the recommended model mix (plausible range $0.09 to $0.56). See the technical assessment, section 4.

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
5. **Vector database.** OpenSearch Serverless needs a short test: filtering by a list of ids, accuracy under the default compression, creation from the CLI and its real cost.
6. **Quota and access.** An administrator of the customer account must submit the Anthropic use case form and request the Bedrock quota increases. Lead time unknown, so this is the critical path.
7. **Region.** us-east-1 with the US inference profile. The customer should know requests can be processed in us-east-1, us-east-2 or us-west-2.
8. **Term.** The SOW runs 30 days from kickoff (roughly until November 18). More time needs a signed written amendment.

## Team

Guillermo (project lead), Nashita, Shivang and Krish (engineering), Chad (project manager, all
customer communication). Task assignments and hours live in Nimbus.
