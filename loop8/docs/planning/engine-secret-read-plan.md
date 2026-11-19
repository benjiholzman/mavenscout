# Plan: let the engineers read the engine secrets

| | |
|---|---|
| Status | Approved on 2026-11-19, local change done, not committed or applied |
| Phase | P2 (engine wiring, access) |
| Task | Allow the engineers to read the secret `mavenscout/supabase` through the role they already assume, with Terraform and the pipeline |
| Owner | Guillermo Sandoval |
| Date | 2026-11-19 |
| Sources | `loop8/infra/modules/engine-secrets`, `loop8/infra/modules/bedrock-invoke`, `loop8/infra/bootstrap/bootstrap.yaml`, `loop8/docs/runbooks/poc-environment.md` B2 and B3c, `loop8/docs/planning/engine-deploy-plan.md` section 8 |

All cost figures in this document are estimates from public AWS prices. None has been measured in this account.

## 1. What this task is for

The secret `mavenscout/supabase` holds `SUPABASE_URL` and `SUPABASE_ANON_KEY`. The value was uploaded on 2026-11-18, but nobody except the project lead can read it. On 2026-11-19 Shivang tried with `Loop8-ReadOnly` and got `AccessDenied`. He needs the values to run `npm run baseline` and to measure variant A. The engine will need the same access later, so the permission has to exist in Terraform and not as a one time hand over of the values.

## 2. What the design already decided

1. `Loop8-ReadOnly` cannot be changed. The guardrail `Loop8-Security-Guardrails` denies any change to it, and the pipeline role is bound by the same guardrail. The engineers therefore assume the role `mavenscout-engine-titan-invoke` with the profile `mavenscout-titan` (runbook B3c).
2. The apply role can create policies and roles named `mavenscout-engine-*` and attach only policies with that prefix to roles with that prefix. It can manage secrets named `mavenscout/*`. It is not widened by this task.
3. Secret values never go through chat, the repository, the plan or the state. Terraform creates containers and never values.
4. The role is covered by the 100% budget action, which attaches a Bedrock deny to it. That deny does not affect Secrets Manager.

## 3. What will be built

| Part | What |
|---|---|
| Module `engine-secrets` | A new optional input `reader_role_names`, empty by default. When it is not empty, the module creates the managed policy `<name_prefix>-engine-secrets-read` with one action, `secretsmanager:GetSecretValue`, on the ARNs of the secrets the module creates, and attaches it to each role in the list |
| Root `main.tf` | Passes `reader_role_names = [module.bedrock_invoke.role_name]` to `engine_secrets` |
| Module test | New runs in `engine_secrets.tftest.hcl`: the policy name starts with `mavenscout-engine-`, the policy has one action and one resource per secret, and it is not created when the list is empty |
| Module README and runbook | The README describes the new input. Runbook B2 says who can read the secret and how. B3c notes that the role now also reads the Supabase secret. The inventory gets one row for the policy |

Nothing else changes. The role keeps its name `mavenscout-engine-titan-invoke`, because renaming it would break the profile every engineer already has. The name is now narrower than what the role does, and the runbook says so.

## 4. Assumptions

1. The secret uses the default AWS managed key, so reading it needs no KMS permission. This is true for the key `aws/secretsmanager` in the same account. The first read by Shivang is the proof.
2. Only `GetSecretValue` is needed. `DescribeSecret` is used only by the upload script, which the project lead runs.
3. The worker Lambda role does not read the secret in this task. That permission is added in the change that connects Luna, together with the secret header and the 150% budget cut, because the stub worker does not use Supabase.
4. The guardrail does not deny `secretsmanager:GetSecretValue` for roles named `mavenscout-engine-*`. This is not known. If it does, the apply fails on the attachment and the fix is a decision of the project lead, not a change to the guardrail by us.

## 5. Impact analysis

1. Exposure: every person who can assume `mavenscout-engine-titan-invoke` can read the Supabase URL and the anon key. Today that is anyone who can assume `Loop8-ReadOnly`, since the role trusts that role. The anon key is the public publishable key by design, and `SUPABASE_DB_URL` is not set, so a read gives no database owner access. The secrets added later, such as the API header, are not covered unless they are added to this module and the list of readers is reviewed.
2. Scope: the policy lists the secret ARNs of the module only, so it cannot read any other secret in the account.
3. Cost: none. An IAM policy and an attachment are free, and secret reads cost about $0.05 per 10,000 calls (estimate), which is negligible at this volume.
4. Reversal: removing `reader_role_names` in a pull request detaches and deletes the policy. The secret and its value are not touched.
5. The apply role is not widened, and `bootstrap.yaml` does not change.

## 6. Acceptance criteria

1. The plan on the pull request shows 2 additions (policy and attachment), 0 changes and 0 destroys, and the apply succeeds.
2. `aws iam simulate-principal-policy` for the role `mavenscout-engine-titan-invoke` returns `allowed` for `GetSecretValue` on `mavenscout/supabase` and an implicit deny for any other secret name. This is a read only check.
3. Shivang runs the read with `AWS_PROFILE=mavenscout-titan` and prints only the key names of the JSON, not the values. The result is `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
4. `npm run baseline` runs with the values read from the secret and reproduces the measured baseline of 2026-11-18.
5. The module tests pass offline with `terraform test`, the pipeline stays green and the next plan has no pending changes.

## 7. Remaining steps

| # | Step | Who | Needs approval | Proof it worked |
|---|---|---|---|---|
| 1 | Review this plan | Project lead | Yes | Plan accepted |
| 2 | Write the module change, the test and the doc updates locally, run `terraform test` and `terraform validate` | Claude | No (local only) | Tests pass, diff reviewed by the project lead |
| 3 | Issue, branch, commit and pull request to `loop8-develop` | Project lead | Yes (issue, push, pull request) | Criterion 1 |
| 4 | Merge, which runs the apply | Project lead | Yes (merge, and the apply changes the customer account) | Criterion 1 |
| 5 | Run the simulate check | Project lead | No (read only) | Criterion 2 |
| 6 | Tell Shivang in the DM, he reads the secret and runs the baseline | Project lead and Shivang | No | Criteria 3 and 4 |
| 7 | Update the runbook inventory and add the build record below | Project lead | Yes (commit and pull request) | Inventory row |

## 8. Build record

| Date | Step | What was done and how it was checked |
|---|---|---|
| 2026-11-19 | 2, local change | The module `engine-secrets` got the input `reader_role_names`, the policy `mavenscout-engine-secrets-read`, the attachment and the output `read_policy_arn`. The root passes the role of the module `bedrock_invoke`. `terraform fmt -check` is clean, `terraform validate` passes in the module and in the root, and `terraform test` passes 5 of 5 runs in the module (2 existing, 3 new). Nothing is committed, pushed or applied |
