# Handoff: P0 repo setup

Date: 2026-11-04

## Work done

- Cloned `benjiholzman/mavenscout` and branched from `loop8-develop`. The customer's existing code,
  docs, migrations and seed data are untouched.
- Added a Loop8 section to the top of `CLAUDE.md`: what Loop8 owns, the engine rules from the brief,
  commands, branch and PR flow to `loop8-develop`, public-repo rules, writing rules.
- Added `docs/SOW/SOW-MavenScout-GenAI-POC.md`, a scope-only extract of the signed SOW.
- Added `docs/planning/PROJECT_PLAN.md`: phases P0 to P4, current state, the two-stage engine
  proposal, decision rights and open questions.
- Extended `.gitignore` for Loop8 local material (`docs/meetings/`, `docs/context/`,
  `docs/best-practices/`, `.scratch/`), env files, keys and Python artifacts.
- Added the AWS runbook `docs/runbooks/poc-environment.md`, the draft `docs/reports/technical-assessment.md` and
  `docs/planning/test-cases-draft.md`.
- Linked the new docs from `docs/README.md`.
- Verified `npm ci && npm run build` passes.

## Decisions and why

- **No Terraform, CloudFormation or GitHub Actions in this repo.** SOW section 9 says the customer
  receives no IaC and no CI/CD, and this branch is merged into the customer's `main` at handoff.
  The POC environment (SOW section 13) is provisioned by Loop8 and documented in a runbook.
- **Commercial and legal SOW sections are not committed.** The repo is public.
- **Loop8 best-practice guides are local only.** They are internal Loop8 standards; copy them into
  `docs/best-practices/` locally if wanted (gitignored).
- **The customer's `CLAUDE.md` is kept.** Loop8 guidance is prepended, not substituted.

## Gotchas

- The repo is **public** and owned by the customer's personal account. Loop8 collaborators have
  write, not admin, so repo settings (environments, variables, branch protection) need the customer.
- `main` is the customer's. All Loop8 PRs target `loop8-develop`.
- The `loop8-handoff` tag does not exist yet. Build against `loop8-develop` until it does.
- `npm run build` warns about an 849 kB bundle chunk. Pre-existing, not ours to fix.

## Next steps (P1)

1. Run `npm run baseline` against a Supabase project with the demo data and record the placeholder
   numbers.
2. Get the cost and latency target per ranking from the customer (via the PM).
3. Confirm the open questions in `PROJECT_PLAN.md` (SOW components vs the Fit rule, conversational
   agent, region).
4. AWS access to the MavenScout account, then the architecture and technical assessment report.
