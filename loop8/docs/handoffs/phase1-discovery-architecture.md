# Handoff: P1 discovery, technical assessment and architecture

| | |
|---|---|
| Status | Final for P1, written on 2026-11-25 while P3 is in progress |
| Phase | P1 (SOW week 1) |
| Task | End of phase handoff: discovery and technical assessment, architecture, cost per ranking |
| Owner | Loop8 engineering |
| Date | 2026-11-25 |
| Sources | `loop8/docs/sow/SOW-MavenScout-GenAI-POC.md`; `loop8/docs/planning/PROJECT_PLAN.md`; `loop8/docs/reports/technical-assessment.md`; `loop8/docs/client-proposal/MavenScout-AI-Ranking-Proposal.en.md`; `loop8/docs/planning/poc-start-plan.md`; `loop8/docs/planning/nova-temporary-models-plan.md`; `loop8/docs/runbooks/poc-environment.md` (findings A1 to A11, inventory, change log); `loop8/docs/reports/first-real-runs-report.md` (for the later measurements); pull requests 13, 15, 17, 25, 26, 28, 32, 34, 36, 38, 49 and 57 (merge commits on `loop8-develop`) |

P1 work began with the code read of 2026-11-04; the `loop8/` workspace was merged in pull request 13 on 2026-11-09. P1 closed on 2026-11-16, when the delivery plan records Phase 1 as closed and Phase 2 as started. Two pieces of P1 work finished later and are described here because they were decided in P1: the placeholder baseline (run on 2026-11-18) and the deployment model of the AWS environment (decided on 2026-11-17). The model blocker that appeared in P2 is summarized here because it changed the model choice made in P1. Its details are in the P2 handoff.

## 1. Work done

1. **Codebase audit.** The ranking code on `loop8-develop` was read on 2026-11-04 and written up as findings F1 to F11 in `loop8/docs/reports/technical-assessment.md`, section 2. The main ones: ranking runs entirely in the browser; the placeholder Fit (`src/lib/matching/fit.ts`) is keyword matching and does not read work history, education or additional experience (F1); more portfolio items can only raise the score, which breaks "relevance, not volume" (F3); extraction is literal and cannot tell "the programme covers Nigeria" from "must be based in Nigeria" (F5); the result contract has a single `fit_score` and no components (F6); the engine output already maps to existing columns, so the engine needs no schema change (F9).
2. **Engine inputs and outputs.** Section 3 of the assessment lists which profile fields feed Fit and which never do (location, languages, availability, career level, work arrangement, transcripts and membership never do; employer names never do), what the real extractor must add (paraphrase mapping, work location against required residence, hiring organization, never a Must have), and a proposed split of the SOW components against the brief's Fit rule (section 3.3).
3. **Cost per ranking, estimated.** Section 4 of the assessment estimates the cost per ranking from official AWS prices read on 2026-11-09 and assumed token sizes. These are estimates, not measurements. With Claude reference prices: about $0.05 per ranking with Haiku 5.5 alone, about $0.19 with Sonnet 5.5 and Haiku 5.5 (the option recommended at the time) and about $0.90 with Sonnet 5.5 alone, for 100 candidates reviewed in depth and 20 narratives. Latency was estimated at 1 to 2 minutes per ranking. The delivery plan later added a reference estimate per variant at a shortlist of 100: about $0.04 for variants A and B, $0.09 for C and $0.11 for D (also estimates with Claude prices, because the GPT-6 prices are not published).
4. **Flows and Costs document.** `loop8/docs/client-proposal/MavenScout-AI-Ranking-Proposal.en.md` (and its PDF) explained the flow and the estimated costs to the customer and asked three questions: acceptable wait time, approval to enable the AI models, and the score breakdown. The delivery plan records the answers of 2026-11-12: four variants to test, summaries of 40 to 60 words, a target of 10 to 30 seconds per ranking, and a cap of 10 rankings per account per month if time allows. The score breakdown question stayed open.
5. **Architecture.** The engine blueprint (`loop8/docs/architecture/index.html`, version 4, pull request 15) records the design. The assessment's section 5 summarizes it and section 6 lists every difference from the architecture diagram in the signed SOW with its reason.
6. **Read only checks of the customer AWS account.** Recorded as findings A1 to A11 in the runbook: no Lambda functions and no budgets at the start, Business Support+ active, GPT-6 Luna and Sol listed as authorized and available, Claude Haiku 5.5 and Sonnet 5.5 quotas at 0, the Anthropic use case form not submitted, and Titan V2 limits of 600 requests and 300,000 tokens per minute (not adjustable).
7. **Placeholder baseline.** `npm run baseline` ran on 2026-11-18 against the live pool of 97 approved and active profiles, after the customer sent the project URL and the publishable key (pull request 49). Measured: 14 of 14 expected profiles in the top 10 and in the top 5 with fixed requirements, extraction recall 53 of 62 (85%), no ties at the top. These are the numbers the engine has to improve (`loop8/docs/planning/poc-start-plan.md`, build record).

## 2. Decisions and why

| # | Decision | Why | Source |
|---|---|---|---|
| 1 | Two stages. Stage 1 searches profile fragments by meaning with Titan Text Embeddings V2 (1024 dimensions, cosine) and keeps candidates by an absolute similarity threshold with a hard cap of 200. Stage 2 asks a model for Fit (0 to 100) per candidate from its top 5 fragments | Sending all 3,000 profiles to a model was estimated at about $1.13 on Haiku 5.5 and $22.65 on Sonnet 5.5 per ranking, so cost alone did not force two stages. Speed and the account's rate limits did. An absolute threshold, not a rank, keeps a candidate's score independent of the rest of the pool | Assessment section 4, delivery plan "Engine direction" |
| 2 | Must haves keep filtering in the app before the engine, and extraction never sets a Must have | These are "ask first" rules of the brief | `loop8/CLAUDE.md` section 3 |
| 3 | Asynchronous jobs: API Gateway HTTP API, an api Lambda, SQS with a dead letter queue, a worker Lambda, DynamoDB for job state and S3 for inputs and results | The latency estimate was 1 to 2 minutes, too long to hold a request open, and a queue caps concurrent jobs and redelivers after a crash | Assessment section 5 |
| 4 | Profiles stay in Supabase, results go to S3 and DynamoDB instead of ElastiCache, and CloudFront, Cognito and Amplify are not included | The profiles already live in Supabase, results are read once or twice, and the frontend and its mocked sign in already exist | Assessment section 6 |
| 5 | OpenSearch Serverless chosen as the vector database on 2026-11-13, subject to a short build check | It is the vector database of the SOW diagram and keeps search load off the app's database | Delivery plan, open question 5 |
| 6 | Models are settings by role (embeddings, Fit, text), not code. Confirmed on 2026-11-16: Titan V2 for embeddings, GPT-6 Luna for Fit, GPT-6 Sol for extraction and summaries. Claude Haiku 5.5 and Sonnet 5.5 left the plan | Fit runs once per candidate, so it gets the small model, and extraction and summaries are a few calls per ranking, so they get the larger one. The Claude models had a quota of 0 and the use case form was not submitted | Pull request 17, delivery plan, runbook A10 |
| 7 | us-east-1 with the US inference profiles | The models are reachable through inference profiles. Requests can be processed in us-east-1, us-east-2 or us-west-2, which the customer should know | Delivery plan, open question 7 |
| 8 | Terraform and a simple GitHub Actions pipeline build the POC environment (decided 2026-11-17). One CloudFormation bootstrap template creates the state bucket, the GitHub OIDC provider and the plan and apply roles. The apply role is pinned to `loop8-develop` and trusts the immutable GitHub subject of the repository | The engineers have read only access, so without a pipeline every deployment depends on the project lead by hand. Terraform also gives a one command teardown at decommissioning. This replaced the P0 decision of a runbook with AWS CLI steps | `loop8/docs/planning/poc-start-plan.md` decision 6, pull requests 25, 26 and 28 |
| 9 | A monthly budget of $350 with alerts at 50% and 80%, a deny on model calls for the engineer roles at 100%, and OpenSearch behind a variable that defaults to off | The customer pays the AWS cost, IAM cannot limit spend, and OpenSearch is the one resource that bills by the hour | `poc-start-plan.md` decision 7 and section 5 |
| 10 | Engineers call models through an assumable role (`mavenscout-engine-titan-invoke`), not through their read only role | A Loop8 guardrail denies any change to the read only role | `poc-start-plan.md` build record, pull requests 32, 34 and 36 |

The model choice of decision 6 did not hold. From 2026-11-19 Bedrock rejected GPT-6 Luna, GPT-6 Sol, Claude Haiku 5.5 and Claude Sonnet 5.5 with "not available for this account", and AWS support said the AWS sales team must enable them. On 2026-11-20 Amazon Nova Lite took the Fit role and Nova Pro the text role temporarily, with Nova 2 Lite added for comparison (pull requests 57 and 59, `loop8/docs/planning/nova-temporary-models-plan.md`). GPT-6 stays the target and its quality is not measured.

### Estimates against later measurements

| What | P1 estimate (source) | Later measurement (source) |
|---|---|---|
| Cost of one ranking with a small model | About $0.04 for variant A with Claude reference prices, estimate (delivery plan) | About $0.008 for 98 candidates with Nova Lite, computed from measured tokens and the AWS price list on 2026-11-21 (`first-real-runs-report.md` section 7.2) |
| Time of one ranking | 1 to 2 minutes for 100 to 200 model calls, estimate (assessment section 4) | 10.7 to 13.5 seconds end to end for 98 Fit calls, measured on 2026-11-21 (`first-real-runs-report.md` section 6) |
| Indexing 3,000 profiles | Under $1, estimate (assessment section 4) | 98 profiles cost 42,765 Titan tokens, computed at $0.0009. About $0.03 for 3,000 profiles, still an estimate (`first-real-runs-report.md` section 7.3) |

The measured figures use Nova Lite and a pool of 98 synthetic profiles, so they are not a measurement of GPT-6 or of a 3,000 profile pool.

## 3. Challenges

1. **Model access.** The quota requests for Claude Haiku 5.5 and Sonnet 5.5 filed on 2026-11-12 were closed with the applied value still 0, and the Anthropic use case form was not submitted (runbook A5 and A9). The models chosen instead, GPT-6 Luna and Sol, were later rejected at invocation. The model question was therefore never settled by the end of P1 and is still open.
2. **No published GPT-6 prices.** Every cost figure in P1 uses Claude prices as a reference only, so the customer read estimates for models that are not the ones planned.
3. **The SOW components against the Fit rule.** SOW section 3 lists "sector and geographic relevance" and "seniority alignment" as components, and the brief says Fit must not score location or career level. The proposal (assessment section 3.3) was asked to the customer as question 3 of the Flows and Costs document and was not answered in P1.
4. **The baseline needed customer data.** The placeholder baseline could not run until the customer sent the database values, so it ran on 2026-11-18, after P1 had closed.

## 4. Gotchas

1. A model listed as authorized and available (runbook A4, 2026-11-13) can still be rejected when it is invoked. Only a real call proves access.
2. The SOW (section 9) says the customer receives no Infrastructure as Code and no CI/CD. The team uses Terraform and a pipeline for the POC anyway. The P0 handoff and the "Working model" section of `PROJECT_PLAN.md` still describe the older rule of AWS CLI steps, while `loop8/CLAUDE.md` section 9 and `poc-start-plan.md` carry the current one.
3. The repository is public, so the Terraform and workflows are public. Role ARNs live in repository variables, and `engine-deploy-plan.md` records that pipeline logs can still show the account ID because GitHub masks secrets and not variables. Moving the two ARNs to secrets is open.
4. The Titan V2 limits (600 requests and 300,000 tokens per minute) are not adjustable, so indexing 3,000 profiles was estimated to take at least an hour.
5. The technical assessment is still marked "Draft in progress", and its section 4 still holds the estimates. Its own next step is to replace that section with measured numbers.

## 5. Next steps (into P2)

These were the open items at the end of P1. Their outcome is in the P2 handoff.

1. Build the asynchronous job pipeline with a stub engine, then deploy it with Terraform and the pipeline.
2. Generate the profile embeddings, build the stage 1 index, and connect the Fit model to the worker to measure variant A, including the manual against AI comparison.
3. Run the short OpenSearch build check (filter by a list of ids, accuracy, creation, real cost) before relying on it.
4. Add the text model for extraction and summaries, then measure variants B, C and D.
5. Get the customer's answer on the score breakdown through the project manager.
6. Replace section 4 of the technical assessment with measured numbers.
