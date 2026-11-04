# MavenScout GenAI POC: Delivery Plan

Repo: `benjiholzman/mavenscout`, Loop8 integration branch `loop8-develop`
Authority, in order: `docs/SOW/SOW-MavenScout-GenAI-POC.md` (signed PDF wins),
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

## State as of 2026-11-04

| Item | Status |
|---|---|
| Repo access | Have it. Loop8 works on `loop8-develop`; the customer merges it into `main` at handoff |
| Customer AWS account | Dedicated MavenScout account created by the customer 2026-10-30. Team access being granted through Loop8 onboarding |
| AWS Business Support+ | Requested, not yet confirmed active |
| Test data | 98 synthetic profiles (`is_demo`), five sample ToRs, `expectations.json` and the baseline harness (`npm run baseline`) are in the repo |
| Engine contract | Defined: match-rework spec sections 4 and 6, `src/lib/matching/types.ts` |
| `loop8-handoff` tag | Not yet created. Brief: one step remains (fresh Supabase project builds cleanly from the repo). Engine work that does not depend on it starts now |
| App build | `npm ci && npm run build` passes on `loop8-develop` |

## Working model

- Feature branches `feature/<issue>-<short-name>` off `loop8-develop`, one PR per deliverable back
  into `loop8-develop`. Never push to `main`; the customer owns `main`.
- Every change starts from a GitHub issue on `benjiholzman/mavenscout`.
- Per SOW section 9, no Terraform, CloudFormation or CI/CD is committed to this repo. The POC
  environment in the customer's AWS account is provisioned by Loop8 and documented in a runbook.
- The repo is public. No secrets, account IDs, client PII, commercial terms or internal notes.

## Recommended engine direction

The original three-mode plan (filter, then preferences, then AI) does not scale to large pools: a
manager may skip filters, and preferences only rank, they do not filter. On the 2026-11-02 call the
customer agreed to Loop8 proposing a better approach, provided it is affordable per ranking.

Working proposal, to be confirmed in Phase 1:

1. **Must haves filter first** (app side, unchanged). Failing candidates are never scored.
2. **Read the JD once.** `extractRequirements` runs one LLM call; output is stored with the JD.
3. **Stage 1, cheap pre-screen.** Embedding similarity between the extracted requirements and
   precomputed profile embeddings (bio, portfolio, work history, education; never transcripts).
4. **Stage 2, deep rank.** An LLM judges Fit on the shortlist using the most relevant evidence per
   profile, with component scores and the narrative in the same call.

Constraint to resolve before building: brief rule 3 says **scores must not depend on the pool**
(newly eligible candidates are scored and merged). A top-K pre-screen is pool-dependent. Options: an
absolute similarity threshold, or giving below-cutoff candidates a Stage 1 Fit estimate.

## Phases

Phases follow the Nimbus tracker (P0 to P4). SOW weeks 1 to 3 map to P1 to P3.

### P0: Setup

- Repo cloned, `loop8-develop` flow agreed, Loop8 docs added (this plan, SOW extract, CLAUDE.md)
- AWS onboarding to the MavenScout account, Business Support+ activation
- Kickoff and Sales to Delivery handoff (done)

### P1: Discovery and Technical Assessment (SOW week 1)

- Audit the codebase: profile data structure, `src/lib/matching/`, `src/lib/requirements/`,
  migrations 000 to 019
- Define the profile fields that feed the engine and the JD parsing requirements
- Run `npm run baseline` and record the placeholder's numbers before changing anything
- Add harder vocabulary-mismatch test cases to `docs/samples/expectations.json`
- Choose the architecture and models (Bedrock model, embedding model, vector store, serving
  layer). Set a target cost and latency per ranking first
- AWS environment setup in the customer account
- **Deliverable:** technical assessment report (architecture, cost and latency per ranking)

### P2: JD Parsing and Candidate Matching Engine (SOW week 2)

- Server-side `extractRequirements`: separate "the programme covers Nigeria" from "must be based in
  Nigeria", map paraphrases to the expertise list, never set Must have
- Generate profile embeddings and store them in the vector store
- Server-side `rankPool`: semantic Fit across the whole profile, relevance not volume
- Surface ranked results in the existing flip card UI through the unchanged contract
- **Deliverables:** parsing module, matching engine with embeddings and ranked results

### P3: Confidence Scoring and Explainability (SOW week 3)

- Multi-dimensional scoring model: component scores behind the overall match
- Display the component breakdown alongside the overall score on each card
- Plain-language ~100-word narrative per candidate that never contradicts the numbers
- Propose `config.ts` values (bands, weights, credits) from our own baseline runs, for sign-off
- **Deliverable:** scoring model with component breakdown and narrative

### P4: Validation and Handoff

- Baseline before and after, including the new test cases and the 3 vs 10 portfolio-item check
- Cost per ranking measured on the full pool
- Final documentation: findings summary, architecture overview, recommendations (SOW section 9)
- Demo walkthrough; POC environment kept 30 days post-demo, then decommissioned
- PR from `loop8-develop` to `main` for the customer's review

## Decision rights (from the brief)

| Tier | Covers |
|---|---|
| Loop8 decides | Everything inside `extractRequirements` and `rankPool`: models, prompts, retrieval, embeddings, Fit, evidence, narratives, infrastructure |
| Propose, customer signs off | `src/lib/matching/config.ts` values: points, per-point weight and 20% cap, bands, partial credits, calibration |
| Ask first | Additive structure (Fit plus preference share), Must haves filtering before scoring, extraction never setting Must have, membership never affecting rank, employers never pre-filled |

## Open questions

1. **SOW components vs the Fit rule.** SOW section 3 lists "sector and geographic relevance" and
   "seniority alignment" as components. The brief says Fit must not score location, career level,
   language, availability or employers; those are manager-set priorities. Proposal: technical
   skills and domain expertise (plus regional experience, which the brief allows) come from Fit;
   geography and seniority come from the existing priority rows. Confirm with the customer.
2. **Conversational agent.** SOW section 3 mentions selecting services for a "conversational agent"
   but no deliverable or success criterion covers one. Confirm it is out of scope for this POC.
3. **Cost and latency target per ranking.** Needed from the customer before the architecture is
   final (brief, open questions).
4. **Pool-independent scores** with a two-stage design (see above).
5. **Region.** us-east-1 assumed for Bedrock availability; confirm against the customer's Supabase
   region.

## Team

Guillermo (project lead), Nashita, Shivang and Krish (engineering), Chad (project manager, all
customer communication). Task assignments and hours live in Nimbus.
