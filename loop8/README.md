# Loop8 workspace: MavenScout ranking engine POC

| | |
|---|---|
| Status | Living index |
| Phase | P0 to P4 |
| Task | Everything Loop8 writes and builds for this POC |
| Owner | Guillermo Sandoval |
| Date | 2026-11-13 |
| Sources | `loop8/CLAUDE.md`, the documents listed below |

This folder holds everything Loop8 creates in this repository. `loop8-develop` is the source of truth for Loop8's work and `main` is never touched. The rules for working here are in [CLAUDE.md](CLAUDE.md), which the root `CLAUDE.md` loads. The customer's own documents stay in `docs/`.

## Documents

| Document | What it is |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Engagement rules: branches, approvals, AWS rules, writing rules, how to work |
| [docs/sow/SOW-MavenScout-GenAI-POC.md](docs/sow/SOW-MavenScout-GenAI-POC.md) | Scope extract of the signed SOW |
| [docs/planning/PROJECT_PLAN.md](docs/planning/PROJECT_PLAN.md) | Delivery plan: phases, current state, engine direction, open questions |
| [docs/planning/poc-start-plan.md](docs/planning/poc-start-plan.md) | Plan for starting the engine build: decisions of 2026-11-17, Terraform and a simple GitHub Actions pipeline, spending limit, acceptance criteria and ordered steps |
| [docs/planning/test-cases-draft.md](docs/planning/test-cases-draft.md) | Draft of harder vocabulary mismatch test cases |
| [docs/planning/walking-skeleton-plan.md](docs/planning/walking-skeleton-plan.md) | Plan for the walking skeleton: the asynchronous job pipeline with a stub engine (blueprint step 7) |
| [docs/planning/engine-deploy-plan.md](docs/planning/engine-deploy-plan.md) | Plan to deploy the walking skeleton in the customer account with Terraform and the pipeline, replacing runbook Part D |
| [docs/planning/engine-secret-read-plan.md](docs/planning/engine-secret-read-plan.md) | Plan to let the engineers read the engine secrets through the role they already assume |
| [docs/planning/nova-temporary-models-plan.md](docs/planning/nova-temporary-models-plan.md) | Plan to use Amazon Nova Lite and Nova Pro temporarily while GPT-6 and Claude 5.5 models are blocked, and to let the engineers call them |
| [docs/planning/worker-engine-connect-plan.md](docs/planning/worker-engine-connect-plan.md) | Plan to connect the semantic engine to the worker in AWS: model access, the Supabase secret, the index artifact, settings and the 150% budget cut |
| [docs/architecture/index.html](docs/architecture/index.html) | The engine blueprint, a bilingual web page (open it in a browser). Rules, math, architecture, request lifecycle, pipeline, technology choices, cost, risks, starting plan. Diagram sources are in `docs/architecture/diagrams/` |
| [docs/architecture/interactive-resources.md](docs/architecture/interactive-resources.md) | Catalog of the published web page for the engine blueprint: its link, versions, companion files and how to keep it in sync |
| [docs/client-proposal/MavenScout-AI-Ranking-Proposal.en.md](docs/client-proposal/MavenScout-AI-Ranking-Proposal.en.md) | The Flows and Costs document sent to the customer, with its [PDF](docs/client-proposal/Flows-and-Costs.pdf), flowchart and charts |
| [docs/reports/technical-assessment.md](docs/reports/technical-assessment.md) | Technical assessment (SOW deliverable 1): findings, inputs and outputs, cost, architecture, differences from the SOW diagram |
| [docs/runbooks/poc-environment.md](docs/runbooks/poc-environment.md) | AWS POC environment runbook: read-only checks and their findings, create steps, teardown, inventory |
| [docs/handoffs/phase0-repo-setup.md](docs/handoffs/phase0-repo-setup.md) | Handoff for P0 |
| [infra/](infra/) | Terraform for the POC environment and the one bootstrap template (`infra/bootstrap/bootstrap.yaml`, draft, not deployed). Pre-commit checks are in `.pre-commit-config.yaml` |
| [docs/best-practices/documentation-generation.md](docs/best-practices/documentation-generation.md) | Rules for every document Loop8 writes: language, punctuation, plans, diagrams, web pages |
| [docs/best-practices/terraform-and-pipeline.md](docs/best-practices/terraform-and-pipeline.md) | Rules for the Terraform, the bootstrap template, the GitHub Actions pipeline and the pre-commit checks |

## Local only

`loop8/internal/` is gitignored and never committed. It holds work hours, project context and session notes. Each team member keeps their own copy. Three files outside it are also gitignored: `CLAUDE.local.md`, `.claudetask` and `.scratch/`.

## Checking documents

Markdown is checked with markdownlint using the configuration in this folder:

```bash
npx markdownlint-cli --config loop8/.markdownlint.json "loop8/docs/**/*.md" "loop8/*.md"
```
