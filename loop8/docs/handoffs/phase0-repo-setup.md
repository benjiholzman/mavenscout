# Handoff: P0 repo setup

| | |
|---|---|
| Status | Final for P0, updated 2026-11-09 |
| Phase | P0 |
| Task | Repo setup |
| Owner | Loop8 engineering |
| Date | 2026-11-04 |
| Sources | Repository state and decisions |

Date: 2026-11-04, updated 2026-11-09

## Work done

1. Cloned `benjiholzman/mavenscout` and branched from `loop8-develop`. The customer's existing code, docs, migrations and seed data are untouched.
2. Created the `loop8/` folder, which holds everything Loop8 writes: `loop8/CLAUDE.md` (engagement rules, loaded from the root `CLAUDE.md` with one import line), the SOW scope extract, the delivery plan, the architecture blueprint and its diagrams, the Flows and Costs document sent to the customer, the technical assessment draft, the AWS runbook and this handoff.
3. Extended `.gitignore` for Loop8 internal material (`loop8/internal/`, `CLAUDE.local.md`, `.claudetask`, `.scratch/`), env files, keys and Python artifacts.
4. Verified `npm ci && npm run build` passes.

## Decisions and why

1. **No Terraform, CloudFormation or GitHub Actions in this repo.** SOW section 9 says the customer receives no IaC and no CI/CD. The POC environment (SOW section 13) is provisioned by Loop8 and documented in a runbook.
2. **`loop8-develop` is the source of truth and `main` is never touched.** All Loop8 work lands on `loop8-develop` through pull requests. How the customer receives the final code is agreed at handoff.
3. **Everything of ours lives under `loop8/`.** Internal notes, work hours and the Loop8 best practices are in `loop8/internal/`, which is gitignored.
4. **Commercial and legal SOW sections are not committed.** The repo is public.
5. **The customer's `CLAUDE.md` is kept.** One import line pulls in `loop8/CLAUDE.md`, so the customer's file is not rewritten.

## Gotchas

1. The repo is **public** and owned by the customer's personal account. Loop8 collaborators have
   write, not admin, so repo settings (environments, variables, branch protection) need the customer.
2. `main` is the customer's. All Loop8 pull requests target `loop8-develop`.
3. The `loop8-handoff` tag does not exist yet. Build against `loop8-develop` until it does.
4. `npm run build` warns about an 849 kB bundle chunk. Pre-existing, not ours to fix.

## Next steps (P1)

1. With an administrator of the customer account, submit the Anthropic use case form and request the Bedrock quota increases (critical path).
2. Run `npm run baseline` against a Supabase project with the demo data and record the placeholder numbers.
3. Get the customer's answers to the three questions in the Flows and Costs document (wait time, approval to enable the AI models, score breakdown) through the project manager.
4. Run the short OpenSearch test, then fix the architecture in the technical assessment report.
