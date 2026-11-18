# loop8/infra

| | |
|---|---|
| Status | Active |
| Phase | P2 |
| Task | Terraform and bootstrap of the POC environment |
| Owner | Guillermo Sandoval |
| Date | 2026-11-18 |
| Sources | `loop8/docs/planning/poc-start-plan.md`, `loop8/docs/best-practices/terraform-and-pipeline.md` |

## Layout

1. `bootstrap/bootstrap.yaml`: one CloudFormation template, run once by the project lead. It creates the Terraform state bucket, the GitHub OIDC provider, a read only plan role and an apply role pinned to the `loop8-develop` branch. It was run on 2026-11-18 and is recorded in the runbook inventory.
2. `main.tf`, `providers.tf`, `variables.tf`, `versions.tf`: the Terraform root. The root only calls modules.
3. `modules/cost-guard/`: the alert topic, the monthly budget, the deny action and the token alarms, with an offline test.
4. `modules/bedrock-invoke/`: the managed policy that allows `bedrock:InvokeModel` on Titan V2, Luna and Sol and the role that carries it, with an offline test. The engineers assume the role, see the runbook B3c.
5. `scripts/`: the Checkov adapter that understands the immutable GitHub subject.
6. `.checkov.yaml`, `.tflint.hcl`: linter settings. The pre-commit file is `loop8/.pre-commit-config.yaml`.

## How a change reaches AWS

1. Open a pull request against `loop8-develop`. The workflow `.github/workflows/terraform.yml` checks format, validates, runs the module tests and Checkov, prints the OIDC subject, and posts the Terraform plan on the pull request using the plan role.
2. Read the plan. It is the review point.
3. After the merge, the same workflow applies the change using the apply role. Only pushes to `loop8-develop` can assume that role.
4. The role ARNs come from the repository variables `AWS_PLAN_ROLE_ARN` and `AWS_APPLY_ROLE_ARN`. If a variable is empty its step is skipped.

## Cost guard

1. The budget is $350 per month, with alerts at 50% and 80% of actual spend and at 100% of the forecast.
2. At 100% of actual spend an explicit deny on model invocation is attached to the engineer roles. Billing data lags by hours, so this is not an instant cap.
3. One alarm per model watches input tokens per hour. Luna and Sol are added to `bedrock_alarm_models` when their model ids are confirmed.
4. Terraform creates the alert topic but no subscription. A person subscribes an address with `aws sns subscribe`, so no email is committed to this public repository.
5. `enable_opensearch` is false. The apply role also has an explicit deny on OpenSearch Serverless until the bootstrap parameter `AllowOpenSearch` is set to true for the build check.

## Local checks

```bash
pre-commit install -c loop8/.pre-commit-config.yaml
pre-commit run -c loop8/.pre-commit-config.yaml --all-files
terraform -chdir=loop8/infra/modules/cost-guard init -backend=false
terraform -chdir=loop8/infra/modules/cost-guard test
```

Do not run `terraform apply` from a laptop against the shared state. Changes go through a pull request.
