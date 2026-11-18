# Plan: starting the engine build with Terraform and a simple deployment pipeline

| | |
|---|---|
| Status | Plan, not yet approved or executed. Replaces the version of 2026-11-17 morning that used direct engineer permissions and AWS CLI scripts |
| Phase | P2 (with the P1 baseline still open) |
| Task | Deployment model, access guardrails, budget, baseline and first build steps for variant A |
| Owner | Guillermo Sandoval |
| Date | 2026-11-17 |
| Sources | `PROJECT_PLAN.md`, `loop8/docs/architecture/index.html`, `loop8/docs/runbooks/poc-environment.md`, `loop8/CLAUDE.md`, Loop8's infrastructure practice from other projects (workflows, bootstrap templates and trust policies) |

All cost figures in this document are estimates. They come from the reference costs in the architecture page and from public AWS prices, and none has been measured in this account. The GPT-6 Luna and Sol prices are not published.

## 1. What this task is for

The team is ready to build Phase 2, and the demo and tests are set for 2026-11-23. Shivang and Krish have read only access to the customer's AWS account, so every deployment would otherwise depend on the project lead doing it by hand. The customer pays the AWS cost, so before anyone deploys or calls a paid model there must be a spending limit and a way to stop the one resource that bills by the hour (OpenSearch Serverless).

## 2. What the design already decided

1. Asynchronous engine with API Gateway, an api Lambda, SQS with a dead letter queue, a worker Lambda, DynamoDB and S3. Source: `PROJECT_PLAN.md`, "Engine direction".
2. Titan Text Embeddings V2 (1024 dimensions, cosine), GPT-6 Luna for Fit, GPT-6 Sol for extraction and summaries. Source: the confirmation of 2026-11-16.
3. OpenSearch Serverless as the vector store, with a short build check first (open question 5).
4. Must haves filter in the app before the engine runs. Fit never scores employer names, location, language level, availability, career level or work arrangement. Source: `loop8/CLAUDE.md` section 3.
5. Every AWS resource carries the funding tag. Source: `loop8/CLAUDE.md` section 9.

## 3. Decisions of 2026-11-17

| # | Decision | Reason |
|---|---|---|
| 1 | The embedding contract is agreed: Titan V2, 1024 dimensions, `normalize` true, cosine, one shared `embedText`, no type prefix, best fragment per profile against an absolute threshold with a cap of 200, top 5 fragments per candidate for stage 2 | Query side and index side must live in the same vector space or the scores are not comparable |
| 2 | Organization names stay in fragment metadata and never in the fragment text | An employer name in the embedded text would reward the employer in Fit, which the brief forbids |
| 3 | `profileId` is the profile UUID from the seed files, not the handle. The artifact lists `modelVersion` and `indexVersion` first, and a fragment with a different model version is rejected | Avoids mixing models and lets each job record which index it used |
| 4 | Shared engine code lives under `loop8/engine/src/`, for example `src/bedrock/titan.ts` | Type checking and tests only cover `src/` |
| 5 | When the worker catches a retryable error it releases its lease and calls `ChangeMessageVisibility` to retry in about 10 seconds. Crashes it cannot catch still wait the full 1,080 seconds | The app stops polling after 10 minutes and the customer expects 10 to 30 seconds |
| 5a | A retry still counts as a receive, so the dead letter limit of 5 receives still applies | Keeps the existing failure design intact |
| 6 | Infrastructure is written in Terraform and applied by a simple GitHub Actions pipeline. Engineers keep read only access and deploy by pull request | The project lead would otherwise deploy every change by hand. Terraform also gives a one command teardown at decommissioning |
| 7 | The budget is $350 per month for the account, set by the project lead on 2026-11-18. The amount can be shared with the customer through the project manager | See section 5 |

### Decision 6 in context

The SOW does not list Infrastructure as Code or CI/CD as deliverables, and `loop8/CLAUDE.md` sections 9.1 and 9.2 used to say not to add `terraform/` or `.github/workflows/` to this repository. The team uses both for the POC because they make the work easier to review and tear down. Two consequences are written down here:

1. The repository is public, so the Terraform code and the workflows are public. They must contain no account ID, no secret and no customer data.
2. `loop8/CLAUDE.md` is updated in the same change so that later sessions follow the new rule instead of the old one.

One alternative stays open: keeping the Terraform in a separate Loop8 repository, so the customer's repository only receives the application workflow. It was not chosen on 2026-11-17 and is listed in the open decisions.

## 4. Deployment model

### How GitHub reaches the AWS account

The pipeline signs in to AWS without stored keys. GitHub issues a short lived token for each workflow run, and an IAM role in the customer account trusts that token if its subject claim matches. This is the standard way to connect GitHub Actions to AWS without stored keys.

### The subject format of this repository (verified)

GitHub changed the subject claim for repositories created or renamed after 2026-07-15 to an immutable form that carries numeric IDs. Reading the repository settings with the GitHub API (read only) on 2026-11-17 returned:

| Item | Value |
|---|---|
| Immutable subject in use | true |
| Subject prefix | `repo:benjiholzman@270381471/mavenscout@1288851291` |
| Repository created | 2026-07-04 |
| Our permission on the repository | push, not admin |

The repository was created before the cutoff, but it already presents the immutable form, so the trust policy must use that form. The old form, `repo:OWNER/REPO:*`, would not match.

### Two roles

| Role | Trusted subjects | Can do |
|---|---|---|
| Plan role | `repo:benjiholzman@270381471/mavenscout@1288851291:pull_request` and the push to `loop8-develop` | Read only plus read of the Terraform state, so a pull request can show a plan |
| Apply role | `repo:benjiholzman@270381471/mavenscout@1288851291:ref:refs/heads/loop8-develop` only | Create and change the POC resources, limited by name prefix, with the funding tag required |

Pinning the apply role to the `loop8-develop` branch means no other branch, fork or pull request can apply. Only code that the project lead has reviewed and merged runs with write access.

### Simple pipeline

1. On a pull request to `loop8-develop`: `terraform fmt -check`, `terraform validate`, and a plan posted on the pull request, using the plan role.
2. On a merge to `loop8-develop`: `terraform apply`, using the apply role.
3. Application code (the two Lambdas): lint and test on the pull request, package and update the function on merge.
4. No staging environment, no approval gates beyond the pull request review.

### Cost safety built into the Terraform

1. The OpenSearch Serverless collection sits behind a variable `enable_opensearch` that defaults to false. A normal merge can never create the resource that bills by the hour.
2. The budget, the alarm and the deny actions are part of the Terraform from the first apply, so they exist before the first paid model is called.
3. The apply role cannot change its own policy or the budget actions.
4. The provider sets the funding tag as a default tag so no resource is created without it.

### Bootstrap, done once by the project lead

Terraform cannot create the things it needs to start. These are created once with the admin profile, with one CloudFormation template:

1. The Terraform state bucket, with versioning, encryption and public access blocked. Locking uses the native S3 lock file, so no DynamoDB table is needed.
2. The GitHub OIDC provider for `token.actions.githubusercontent.com`.
3. The plan role and the apply role described above.

### What GitHub needs from the customer

The repository belongs to a personal GitHub account (owner type User), and our role on it is write. Reading the repository variables works (the list is empty on 2026-11-17), but creating variables and secrets on a personal account repository is, according to the GitHub documentation, limited to the owner, and a personal repository has no admin role to grant to a collaborator. This was not tested by creating a variable, because that would change the customer's repository. The workflows read the role ARN from a repository variable because putting the ARN in the file would publish the account ID. The owner must therefore create two repository variables after the bootstrap, or the Terraform and workflows move to a Loop8 repository where we have admin. This is the first thing to ask for.

## 5. Spending limit

IAM can limit who may call a model and until when. It cannot limit the number of calls, the tokens per call or the spend. The limit therefore comes from several layers.

| Layer | What it does | Speed |
|---|---|---|
| Titan quota | The account quota is 300,000 tokens per minute. At the public Titan V2 price this bounds a sustained mistake to roughly $0.4 per hour (estimate) | Immediate |
| `enable_opensearch` false by default | No merge creates the hourly resource by accident | Immediate |
| CloudWatch alarm | Alarm on Bedrock input and output token metrics per model, notifying an SNS topic | Minutes |
| Budget alerts | Messages to the alert topic at 50% ($175), 80% ($280) and forecast 100% | Hours, billing lags |
| Budget action at 100% ($350) | Attaches an explicit deny on `bedrock:InvokeModel` to the engineer roles. The worker keeps running so the demo does not stop | Hours |
| Budget action at 150% ($525), added with the worker Lambda | Attaches the deny to the worker role as well | Hours |

How the size of the budget was reasoned, all estimates:

| Item | Assumption | Estimate |
|---|---|---|
| Luna and Sol | About 300 test rankings (cases times four variants, with repeats) at $0.04 to $0.11 reference cost, tripled because the price is unknown | $50 to $100 |
| Titan V2 | About 1,000 fragments from 98 demo profiles. A 3,000 profile test is still cents | under $1 |
| OpenSearch Serverless | Public price of $0.24 per OCU hour. About 2 OCUs without standby replicas (about $11.50 a day) or 4 with them (about $23 a day). The short check lasts hours, a collection kept alive for the demo lasts days | short check $2 to $5, ten days alive $115 to $230 |
| Lambda, SQS, DynamoDB, S3, API Gateway, CloudWatch, Secrets Manager | POC volume | under $10 |

The normal case, with the collection created and deleted per session, is about $60 to $120. The worst realistic case, a collection kept alive with standby replicas until the demo ends, is about $350 to $400. The amount is reviewed after variant A is measured, when real Luna and Sol prices are known.

## 6. What will be built or changed

1. Bootstrap (once, by the project lead): state bucket, OIDC provider, plan role and apply role.
2. `loop8/infra/`: Terraform laid out as modules, following the Loop8 infrastructure layout. The first module, `modules/cost-guard`, holds the alert topic, the budget, the budget action and the token alarms, with a `terraform test` that runs offline. The queue, the Lambdas, DynamoDB, S3, the API and the secret follow as their own modules, with the funding tag as a default tag and `enable_opensearch` false.
3. `.github/workflows/`: one workflow for Terraform and one for the engine code. This is outside `loop8/`, so the issue records the reason, as `loop8/CLAUDE.md` section 1 requires.
4. `loop8/engine/` skeleton: job lifecycle with fake model calls, checkpoints, idempotency, the retry release of decision 5, and the client wrapper that polls from `src/lib/matching/`.
5. The profile splitter and the embedding index artifact (`index-artifact.json`), loaded by `rankPool` for an in memory cosine search in the variant A demo.
6. The OpenSearch build check, run by setting `enable_opensearch` to true in one pull request and back to false in the next, which creates and then destroys the collection.
7. Updates to the architecture page, the runbook, `loop8/CLAUDE.md` sections 9.1 and 9.2, and this plan's build record.

## 7. Assumptions

1. The immutable subject reported by the API on 2026-11-17 is what GitHub will present in the token. To verify with the first workflow run, which prints the subject claim before any change is applied.
2. The repository owner can create two repository variables after the bootstrap. Granting admin is not an option on a personal account repository. If the owner cannot, the pipeline cannot run in this repository and the Terraform moves to a Loop8 repository. Until the variables exist, the steps that do not use AWS (format, validate, Checkov) still run, and the AWS steps are skipped when the variable is empty.
3. `workflow_dispatch` is not relied on, because it may require the workflow file on the default branch, which is `main` and belongs to the customer. Teardown at decommissioning is run by the project lead with the admin profile. To verify.
4. Embedding generation needs `bedrock:InvokeModel` on Titan. Either the project lead runs it, or it runs in a workflow under the apply role, or the earlier time limited engineer policy is kept. Open decision below.
5. The Titan quota of 300,000 tokens per minute is unchanged. Not re-checked on 2026-11-17.
6. The $350 limit is the project lead's decision. It is reviewed after variant A is measured, when real Luna and Sol prices are known.

## 8. Impact analysis

1. Nothing changes in `main`. Workflows and Terraform land on `loop8-develop` through pull requests. The only changes outside `loop8/` are `.github/workflows/` and the two engine functions in `src/lib/matching/`.
2. The pipeline is a new way into the customer account. Its safety depends on the trust policy being pinned to one repository and one branch. A mistake there, for example a wildcard subject, would let any branch or pull request apply. The trust policy is reviewed line by line before the bootstrap runs.
3. In a public repository anyone can read the workflows. They hold no account ID, no secret and no role ARN.
4. Terraform state can contain sensitive values. The bucket is private and encrypted, and secrets stay in Secrets Manager.
5. The budget actions lag the real spend by hours, so the budget alone is not a hard cap. The CloudWatch alarm covers the gap for model calls.
6. A merged mistake in the Terraform runs at once. The pull request plan is the review point, so the project lead reads the plan before merging.
7. If the retry release has a bug, a message could be retried more often than intended. The limit of 5 receives contains it.

## 9. Acceptance criteria

1. `npm run baseline` has been run on the demo data before any engine change, and its numbers are written in `PROJECT_PLAN.md`. This needs the customer's database URL and anon key.
2. The first workflow run prints the OIDC subject and it matches the trust policy. A run from a branch other than `loop8-develop` is refused by the apply role.
3. A pull request shows a plan, and a merge applies it and creates the budget, the alarm and the first resources, all with the funding tag.
4. `enable_opensearch` false creates no collection. Setting it to true and then false creates and removes it, with the real cost recorded.
5. The skeleton runs locally end to end with fake models, and a forced retryable error is retried in about 10 seconds while a simulated crash waits for the visibility timeout.
6. `index-artifact.json` loads in `rankPool`, rejects a fragment with a different `model_version`, and no fragment text contains an organization name.
7. Variant A reports quality, time per ranking and cost per ranking, each marked as measured with its source, and the manual against AI comparison is ready for 2026-11-23.

## 10. Remaining steps

| # | Step | Who | Needs approval | Proof it worked |
|---|---|---|---|---|
| 1 | Ask the customer, through the project manager, for the database URL and anon key, and for the owner to create two repository variables once the bootstrap has produced the role ARNs | Project lead | Yes, customer contact goes through the project manager | Values received, baseline runnable |
| 2 | Run `npm run baseline` on the demo data and record the numbers | Project lead machine | No (local, review before commit) | `docs/samples/ranking-baseline.md` changes and the plan lists the numbers |
| 3 | Update `loop8/CLAUDE.md` sections 9.1 and 9.2 and the architecture page (decisions 2, 3, 5 and 6) | Project lead | No | Files updated for review |
| 4 | Write and review the bootstrap template and the two trust policies. Draft written on 2026-11-18 in `loop8/infra/bootstrap/bootstrap.yaml`, with the Terraform skeleton, `loop8/.pre-commit-config.yaml` and `docs/best-practices/terraform-and-pipeline.md`. The pre-commit hooks pass on these files | Project lead, with review | No until run | Trust policies read line by line against section 4 |
| 5 | Run the bootstrap with the admin profile | Project lead | Yes | State bucket, OIDC provider and both roles listed with the funding tag. Runbook updated the same day |
| 6 | Write `loop8/infra/` and the workflows, open the pull request, check the printed subject, then merge | Project lead | Yes (pushing, pull request, merge) | Acceptance criteria 2 and 3 |
| 7 | Krish writes his plan for the skeleton, then the skeleton with fake models, by pull request | Krish | Plan reviewed first | Acceptance criterion 5 |
| 8 | Shivang builds the splitter and the artifact loader with a fake `embedText`, then generates real embeddings | Shivang | Real embeddings wait for the access decision | Acceptance criterion 6 |
| 9 | Connect Luna for Fit through the worker and measure variant A, with the manual against AI comparison | Engineers, paid calls started by the project lead | Cost known from the budget | Acceptance criterion 7 |
| 10 | Run the OpenSearch check through `enable_opensearch` | Project lead | Yes | Acceptance criterion 4 |
| 11 | Add Sol for extraction and summaries and measure variants B, C and D | Engineers | Cost known from step 9 | Variants reported with measured numbers |

Issue numbers for steps 3 to 11 are created with the project lead's approval before any branch is opened, as `loop8/CLAUDE.md` section 7 requires.

## 11. Open decisions

1. Where the Terraform lives: this repository (chosen on 2026-11-17) or a separate Loop8 repository.
2. How embeddings are generated: by the project lead, by a workflow under the apply role, or with a time limited Titan policy for the engineers.

## 12. Build record

| Date | Step | What was done and how it was checked |
|---|---|---|
| 2026-11-18 | 5, bootstrap | Read only pre checks with the Loop8 admin role: no GitHub OIDC provider in the account, state bucket name free, `Loop8-ReadOnly` is a plain IAM role, no budgets. A change set was created and reviewed before running: five resources to add, and the trust policies resolved to the exact subjects of section 4. The change set was executed and the stack `mavenscout-bootstrap` reached `CREATE_COMPLETE`. Recorded in the runbook inventory. Still to verify: the subject claim in the first workflow run, and the two repository variables created by the owner |
