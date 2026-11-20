# Plan: temporary Amazon Nova models for the engine

| | |
|---|---|
| Status | Nova Lite and Nova Pro applied on 2026-11-20 (pull request 57). Nova 2 Lite is added for comparison by issue 58. The calls by the engineers and the baseline are pending |
| Phase | P2 (engine wiring, models) |
| Task | Use Amazon Nova Lite and Nova Pro temporarily so the work is not blocked while GPT-6 Luna, GPT-6 Sol, Claude Haiku 5.5 and Claude Sonnet 5.5 are unavailable in the account, and let the engineers call them through the role they already assume |
| Owner | Guillermo Sandoval |
| Date | 2026-11-20 |
| Sources | `loop8/infra/variables.tf`, `loop8/infra/modules/bedrock-invoke`, `loop8/infra/modules/cost-guard`, `loop8/docs/planning/PROJECT_PLAN.md`, `loop8/docs/planning/engine-secret-read-plan.md`, `loop8/docs/runbooks/poc-environment.md` A6 and B3c, AWS Service Quotas read on 2026-11-20 |

All cost figures in this document are estimates. None has been measured in this account, and the Nova prices are not written here because they have not been confirmed on the AWS price page.

## 1. What this task is for

Four models are rejected by Bedrock in this account with `not available for this account`: GPT-6 Luna, GPT-6 Sol, Claude Haiku 5.5 and Claude Sonnet 5.5. The support case was answered on 2026-11-19. AWS support says the models need an enablement by the AWS sales team, which support cannot do. The sales request is open, and nobody can say when it will be resolved. The customer review is on 2026-11-23.

On 2026-11-20 one call to each Amazon Nova model worked from the account with the admin role: Nova Pro, Nova Lite and Nova 2 Lite. Nova Premier has reached the end of its life. Amazon models are not sold through AWS Marketplace and need no sales enablement. This plan uses Nova so the engineers can keep building and measuring, and keeps GPT-6 in the plan as the target if it is unblocked.

## 2. What the design already decided

1. Models are settings by role, not code. The roles are Fit, extraction and summaries, and embeddings (`PROJECT_PLAN.md`).
2. Titan Text Embeddings V2 stays for embeddings. It works and is not part of the block.
3. Fit runs once for every candidate above the threshold, so a small and cheap model is used for it. Extraction and summaries are a few calls per ranking, so a larger model is used for them. This is the reason Luna is in the Fit role and Sol in the text role.
4. `Loop8-ReadOnly` cannot be changed. The engineers assume the role `mavenscout-engine-titan-invoke` with the profile `mavenscout-titan`, and the policy `mavenscout-engine-bedrock-invoke` is the only thing that decides which models they can call.
5. The apply role is not widened. The change only edits default values of existing variables, so the pipeline applies it with the permissions it already has.
6. The budget actions already cover the role, and the budget is 350 dollars a month.

## 3. What will be built

Temporary mapping, valid until GPT-6 is unblocked and measured.

| Role | Target model | Temporary model | Inference profile |
|---|---|---|---|
| Embeddings | Titan Text Embeddings V2 | Titan Text Embeddings V2, no change | not used |
| Fit, one call per candidate | GPT-6 Luna | Amazon Nova Lite | `us.amazon.nova-lite-v1:0` |
| Extraction of requirements and summaries | GPT-6 Sol | Amazon Nova Pro, or Nova Lite in variant A | `us.amazon.nova-pro-v1:0`, or `us.amazon.nova-lite-v1:0` in variant A |

Nova 2 Lite is a newer generation than Nova Lite and is added by issue 58 as a comparison model for Fit, so the engineers can run the baseline with both. On 2026-11-20 the same Fit style prompt gave a fit of 95 on Nova Lite, Nova Pro and Nova 2 Lite, with latencies of 0.5 s, 1.2 s and 0.7 s. Nova 2 Lite used 161 input tokens against 121 for the same text and showed no reasoning tokens. One easy case does not separate the models, and the baseline decides. Nova 2 Lite allows 200 requests per minute, half of Nova Lite, and that limit is not adjustable. Nova Micro is text only and the weakest, and Nova Premier is retired, so neither is added. Nova 2 Pro does not exist in the account, only its Preview quota is listed.

| Part | What |
|---|---|
| `invoke_profile_model_ids` in `loop8/infra/variables.tf` | Adds `amazon.nova-lite-v1:0` and `amazon.nova-pro-v1:0`. The module `bedrock-invoke` then allows `bedrock:InvokeModel` on the profile of the account and on the foundation model in us-east-1, us-east-2 and us-west-2, the three regions both profiles route to (read from the account on 2026-11-20). One action only, as before |
| `bedrock_alarm_models` in `loop8/infra/variables.tf` | Adds one input token alarm per hour for Nova Lite (20,000,000) and Nova Pro (5,000,000), one for the profile id and one for the model id, as done for Luna and Sol. The values are estimates and follow the Fit and text load of Luna and Sol |
| Module code | No change. The module is generic and its offline tests already cover several models and regions |
| Runbook | B3c lists the four models the role can call. The inventory rows for the policy and the alarms are updated. A change log line records the reason |
| Project plan | Notes that Nova Lite and Nova Pro are temporary models and that GPT-6 stays the target |

## 4. Assumptions

1. The engineer role reaches Nova through the `us.` profile only. A call with the model id alone is not supported for these models and is not needed.
2. The quotas are enough. Service Quotas on 2026-11-20 show, for the cross region profile, 8,000,000 tokens and 400 requests per minute for Nova Lite and 2,000,000 tokens and 50 requests per minute for Nova Pro. A ranking of 100 to 200 candidates is about 0.5 to 1 million Fit tokens, which is an assumption of 5,000 tokens per call that is not measured. The request limit is not adjustable, so the worker must limit concurrency and retry on throttling.
3. The dimension CloudWatch uses for profile calls is the profile id or the model id. Both are alarmed, as for Luna and Sol, and the first real call shows which one reports.
4. Nova Lite is good enough for Fit. This is not known. The baseline decides it, and if Nova Lite ranks worse than the target, Fit moves to Nova Pro and the cost per ranking rises.
5. The Nova prices are not confirmed yet. The cost per ranking in documents for the customer stays marked as an estimate until the AWS price page is read and a call is measured.

## 5. Impact analysis

1. Access: every person who can assume `mavenscout-engine-titan-invoke` can call Nova Lite and Nova Pro in the account. Today that is anyone who can assume `Loop8-ReadOnly`. The permission is one action on four named resources per model, not a wildcard.
2. Cost: an IAM policy change is free. Alarms cost a small amount each (estimate about 0.10 dollars a month each, 4 alarms). Model usage is billed per token to the customer account and is covered by the 350 dollar budget and its actions. The Nova prices are lower than the GPT-6 reference used in the plan, which is not confirmed here.
3. Customer: the plan and the cost figures sent to the customer on 2026-11-16 assume Luna and Sol, which the customer accepted. Using Nova changes the quality and the cost per ranking, so the change has to be explained to the customer by the project manager before the review on 2026-11-23. Nothing is sent to the customer from here.
4. Quality: a result measured with Nova cannot be reported as a result of GPT-6. Every baseline run records which model ran.
5. Reversal: removing the two ids from the defaults in a pull request removes the permissions and the alarms. No data is touched.
6. The apply role is not widened and `bootstrap.yaml` does not change.

## 6. Acceptance criteria

1. The plan on the pull request shows only IAM policy and alarm changes: the policy `mavenscout-engine-bedrock-invoke` changed in place and 4 alarms added, with 0 destroys. The apply succeeds.
2. `aws iam simulate-principal-policy` for the role `mavenscout-engine-titan-invoke` returns `allowed` for `bedrock:InvokeModel` on the Nova Lite and Nova Pro profiles and on their foundation models in the three regions, and, after issue 58, on the Nova 2 Lite profile in the same regions. This is a read only check.
3. An engineer calls Nova Lite and Nova Pro with `AWS_PROFILE=mavenscout-titan` through the `us.` profiles and gets an answer. The tokens used are recorded.
4. A call that asks Nova Pro for JSON from a real job description returns valid JSON, and a Fit style call on Nova Lite returns a score the worker can parse.
5. `npm run baseline` runs with Nova Lite in the Fit role and records the model names in its output.
6. `terraform fmt`, `terraform validate` and the module tests pass offline, the pipeline stays green and the next plan has no pending changes.

## 7. Remaining steps

| # | Step | Who | Needs approval | Proof it worked |
|---|---|---|---|---|
| 1 | Review this plan | Project lead | Yes | Plan accepted |
| 2 | Local change, `terraform fmt`, `validate` and module tests | Claude | No (local only) | Tests pass, diff reviewed by the project lead |
| 3 | Issue, branch, commit and pull request to `loop8-develop` | Project lead | Yes (issue, push, pull request) | Criterion 1 |
| 4 | Merge, which runs the apply | Project lead | Yes (merge, and the apply changes the customer account) | Criterion 1 |
| 5 | Run the simulate check | Project lead | No (read only) | Criterion 2 |
| 6 | Tell Shivang and Krish which models they can call and with which profile ids | Project lead | No | Criterion 3 |
| 7 | JSON and Fit style test calls, then the baseline with Nova Lite | Engineers | No | Criteria 4 and 5 |
| 8 | Tell the customer about the temporary models through Chad | Project lead and project manager | Yes | Customer informed before 2026-11-23 |
| 9 | Update the runbook inventory and add the build record below | Project lead | Yes (commit and pull request) | Inventory rows |

## 8. Build record

| Date | Step | What was done and how it was checked |
|---|---|---|
| 2026-11-20 | 2, local change | `invoke_profile_model_ids` and `bedrock_alarm_models` in `variables.tf` got Nova Lite and Nova Pro. `terraform fmt -check` is clean, `terraform validate` passes in the root and `terraform test` passes 5 of 5 runs in the module `bedrock-invoke`. Committed on the branch `feature/56-nova-temporary-models` |
| 2026-11-20 | 3 and 4, pull request and apply | Issue 56 and pull request 57 merged (merge commit 3f9456f). The plan on the pull request showed 4 to add, 1 to change, 0 to destroy. The apply finished with 4 added, 1 changed, 0 destroyed |
| 2026-11-20 | 5, simulation | `aws iam simulate-principal-policy` for `mavenscout-engine-titan-invoke` returned `allowed` for `bedrock:InvokeModel` on the Nova Lite and Nova Pro profiles and on their foundation models in us-east-1, us-east-2 and us-west-2, and `implicitDeny` for Nova 2 Lite. Acceptance criterion 2 is met for these two models |
| 2026-11-20 | 6, pending | An engineer has not called the models with `AWS_PROFILE=mavenscout-titan` yet. Criteria 3, 4 and 5 are open. This record is updated when the engineers answer |
| 2026-11-20 | Nova 2 Lite, local change | Issue 58 adds `amazon.nova-2-lite-v1:0` to `invoke_profile_model_ids` and two token alarms (profile id and model id, 20,000,000 input tokens per hour, estimate) to `bedrock_alarm_models`. Not applied until its pull request is merged |
