# Terraform and pipeline practices

| | |
|---|---|
| Status | Active, draft until the first apply |
| Phase | P2 |
| Task | Rules for the Terraform, the bootstrap template and the GitHub Actions pipeline |
| Owner | Guillermo Sandoval |
| Date | 2026-11-18 |
| Sources | AWS Prescriptive Guidance for Terraform on GitHub Actions, and the infrastructure practices Loop8 uses in its other projects (bootstrap templates, trust policies, pre-commit and Checkov setup), `loop8/docs/planning/poc-start-plan.md` |

These rules apply to everything under `loop8/infra/` and `.github/workflows/`. The repository is public, which shapes several of them.

## 1. Access and trust

1. Use IAM roles and the GitHub OIDC provider. No access keys, no IAM users, no secrets in GitHub.
2. Trust policies use `StringEquals` on the subject claim, never a wildcard. This repository presents the immutable subject `repo:benjiholzman@270381471/mavenscout@1288851291:...`, so the owner and repository IDs are part of every trust policy. Repositories older than 2026-07-15 can still present the old form, so confirm with the GitHub API (`gh api repos/OWNER/REPO/actions/oidc/customization/sub`) before copying a policy from another project.
3. Two roles. The plan role is read only and may be assumed from pull requests. The apply role may be assumed only from pushes to `loop8-develop`.
4. Start with an empty policy and add actions by service, on resources scoped by name prefix. The prefix of the engine's resources is `mavenscout-engine-`. The pipeline roles use `mavenscout-gha-`, which the apply role cannot touch.
5. The apply role may attach only the engine's own policies and two named AWS Lambda execution policies, so it cannot attach an administrator policy to a role it creates.
6. Secret values never go through Terraform or its state. Terraform creates an empty secret container and the value is set by a person.
7. Review IAM Access Analyzer findings after the first weeks of use and remove actions the roles never needed.

## 2. State

1. State lives in a private, encrypted, versioned S3 bucket with public access blocked and a deny rule for non TLS requests.
2. Locking uses the native S3 lock file (`use_lockfile`), so no DynamoDB table is needed.
3. Nobody runs Terraform against the shared state from a laptop. Changes go through a pull request and the pipeline.
4. The state bucket keeps its data when the bootstrap stack is deleted. Deleting it is a manual step at decommissioning.

## 3. Writing the Terraform

1. Pin the Terraform version and the provider major version. Commit `.terraform.lock.hcl`.
2. Set the funding tag as a provider default tag so no resource is created without it. The tag is `aws-apn-id-916873233657` (the Loop8 key) with the value in `loop8/CLAUDE.md` section 9, and it is never changed or dropped. Resources created outside Terraform, such as the bootstrap stack and service linked roles that AWS creates on first use, are tagged too, and the check at the end of the work lists anything without it.
3. Anything that bills by the hour sits behind a variable that defaults to false. `enable_opensearch` is the first one.
4. No account ID, role ARN, secret or customer data in any file. Use `data.aws_caller_identity` or `${AWS::AccountId}` instead.
5. Lay the code out as Loop8 does in its other infrastructure repositories: one module per concern under `modules/`, each with `main.tf`, `variables.tf`, `outputs.tf`, `versions.tf` and a short README, and an offline `terraform test` with a mocked provider where there is logic to check. The root calls the modules. There is one environment, so there is no `envs/` layer. Keep each module small and the resources simple, because this is a POC with a 30 day teardown.
6. Every resource name starts with `mavenscout-engine-` so the apply role's scope matches it.

## 4. The pipeline

1. On a pull request: format check, validate, Checkov, and a plan posted on the pull request.
2. On a merge to `loop8-develop`: apply, using the apply role. The review of the plan in the pull request is the approval.
3. The first run prints the subject claim of the token before anything is applied, to confirm it matches the trust policy.
4. The role ARNs come from repository variables, not from the workflow files.
5. A workflow change in a pull request runs with the plan role before anyone reviews it. Only people with write access can do that, and the plan role is read only, but read only still covers the metadata and data of the account. Keep the data in this account synthetic.
6. No production environment, no staging and no extra approval gates. The pull request is the gate.

## 5. Spending safety

1. The budget, the alarm and the deny actions are part of the first apply, before any paid model is called.
2. Budget actions lag the real spend by hours. The CloudWatch alarm on Bedrock token metrics covers model calls in minutes.
3. The bootstrap parameter `AllowOpenSearch` is false by default and adds an explicit deny for OpenSearch Serverless. Setting it to true is a deliberate act of the project lead, for the build check only.

## 6. Pre-commit

1. The configuration is `loop8/.pre-commit-config.yaml`, so the customer's repository root is untouched. Install it once per clone with `pre-commit install -c loop8/.pre-commit-config.yaml`.
2. It runs `terraform fmt` and `validate`, `tflint`, the providers lock, `cfn-lint` on the bootstrap template, Checkov, markdownlint, and checks for private keys and AWS credentials.
3. Two local checks enforce rules of this project: no literal account ID in an ARN under `loop8/infra/` or `.github/`, and no em dashes or en dashes in Loop8 documents and files.
4. Checkov 3.3.30 cannot parse the immutable subject, so it runs through `loop8/infra/scripts/checkov_github_oidc.py`, used in other Loop8 infrastructure repositories. Remove the adapter when Checkov supports the format.
5. Skipped Checkov rules are listed with their reasons in `loop8/infra/.checkov.yaml`. Add a skip only with a reason written next to it.
