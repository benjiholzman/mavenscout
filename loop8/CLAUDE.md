# Loop8 engagement guide: MavenScout ranking engine POC

This file governs all of Loop8's work in this repository. It is loaded from the root `CLAUDE.md`. The rest of the root `CLAUDE.md` is the customer's own guide to the app and still applies to any app code Loop8 touches. When the two disagree about how Loop8 works, this file wins.

## 1. Where Loop8 works

1. `loop8-develop` is the source of truth for everything Loop8 builds and writes. Work lands there through pull requests.
2. `main` belongs to the customer. Never commit to it, push to it, open a pull request against it or merge into it. How the customer receives the final code is decided at handoff and is not assumed here.
3. Everything Loop8 creates lives under `loop8/`. Code that the app has to load (the two engine functions in `src/lib/matching/`) is the only exception, and any change outside `loop8/` needs a reason written in its issue.
4. The repository is public. Never commit secrets, API keys, AWS account IDs, client personal data, commercial terms, meeting notes or internal Loop8 notes. Internal material lives in `loop8/internal/`, which is gitignored.

## 2. Read before planning any work

1. `loop8/docs/sow/SOW-MavenScout-GenAI-POC.md`: scope, deliverables, success criteria and out of scope.
2. `loop8/docs/planning/PROJECT_PLAN.md`: phases, current state, decided design, open questions.
3. `docs/MavenScout — Ranking Engine Brief for Loop8.md`: the contract, decision rights and the baseline to beat.
4. `docs/MavenScout-match-rework.md` sections 2.2, 4 and 6, and the Loop8 section of `docs/DEVELOPER-HANDOFF.md`.
5. `loop8/docs/architecture/index.html`: the engine design (open it in a browser). It is the detailed version of the plan.

## 3. What Loop8 owns

1. The engine behind `extractRequirements` and `rankPool` in `src/lib/matching/`, running server-side on AWS: reading the job description, profile embeddings and vector search, Fit, component scores and narratives.
2. The UI touches the engine only through those two functions. Keep it that way.
3. Values in `src/lib/matching/config.ts` need customer sign-off. Propose them from our own baseline runs.
4. "Ask first" rules, never changed without the customer agreeing: the additive score structure (Fit plus a preference share), Must haves filter before scoring, extraction never sets a Must have, membership never affects rank, employers are never prefilled.
5. Fit judges capability only. Never score location, language level, availability, career level, work arrangement or employer names in Fit. Never feed video or audio transcripts into Fit. Judge relevance, not the volume of portfolio items. A candidate's score must not depend on the rest of the pool.

## 4. Measure, do not argue

1. Run `npm run baseline` before and after every engine change.
2. Add harder vocabulary mismatch cases to `docs/samples/expectations.json` so they run every time (drafts in `loop8/docs/planning/test-cases-draft.md`).
3. Any cost or latency number written in a document is marked as an estimate until it has been measured, and says where it came from.

## 5. Phases

| Phase | SOW week | Objective |
|---|---|---|
| P0 | Setup | Repo, branch flow, AWS onboarding |
| P1 | 1 | Discovery and technical assessment, architecture, cost per ranking |
| P2 | 2 | Job description parsing and candidate matching engine |
| P3 | 3 | Confidence scoring, component breakdown, narratives |
| P4 | After | Validation against the baseline, documentation, demo, handoff |

Work phase by phase. Do not attempt several phases at once. At the end of each phase write a handoff document in `loop8/docs/handoffs/` covering work done, challenges, gotchas and next steps.

## 6. Commands

```bash
npm ci               # install
npm run dev          # local app (needs .env from .env.example)
npm run build        # type-check and build; must pass before any pull request
npm run baseline     # ranking quality harness, rewrites docs/samples/ranking-baseline.md
```

There is no test runner, linter or CI in this repository. Do not claim tooling exists beyond the above.

## 7. Change procedure

1. Every change starts with a GitHub issue on `benjiholzman/mavenscout` with the problem, context and acceptance criteria. For a bug, write the root cause, the plan and the impact analysis in the issue before touching code.
2. Branch `feature/<issue-number>-short-description` off `loop8-develop`.
3. Small, focused commits, one logical change each, imperative messages, `Closes #<n>`.
4. One pull request per deliverable with base `loop8-develop`: `gh pr create --base loop8-develop`.
5. Merge after `npm run build` passes (when code changed) and review is complete. No force pushes to shared branches.
6. After each commit, review it as a senior engineer would, for correctness and consistency.

## 8. Approval gates

1. Do not push, open pull requests, create issues, merge or delete branches without explicit approval from the project lead.
2. Commit locally only, and only after the project lead has reviewed the changes. Keep unrelated changes in separate commits.
3. No deployment to AWS, and no change to the customer's AWS account, without explicit approval. Read-only checks are allowed.
4. Nothing is sent to the customer without the project manager. Chad handles all customer communication.

## 9. AWS rules

1. SOW section 9: the customer receives no Infrastructure as Code and no CI/CD. Do not add `terraform/`, CloudFormation, CDK or `.github/workflows/` to this repository.
2. The temporary POC environment in the customer's AWS account (SOW section 13, decommissioned 30 days after the demo) is created with the AWS CLI and recorded in `loop8/docs/runbooks/poc-environment.md`. Update the runbook the same day a resource is created.
3. The customer pays the AWS cost of the POC (SOW section 13.3), so every cost figure we give is a number the customer reads and decides on.
4. Every AWS resource carries this tag. It is the AWS Partner Central funding attribution. Do not change or drop it.

   ```text
   aws-apn-id = pc:8m1j53s4l98quhnwq6wgbhf0l
   ```

5. Ask the user to authenticate when credentials expire. Never guess a profile or account.

## 10. Writing rules

1. Documentation is written in English, in plain words, the way one person explains something to another. No analogies. Be honest about what is unknown.
2. No em dashes, en dashes or double hyphens as punctuation anywhere (code, comments, documents, commits, messages). Double hyphens are allowed only for command line flags inside code. Do not rewrite the customer's existing files to remove theirs.
3. No hyphen bullet lists in narrative documents. Use short paragraphs, numbered lists or tables.
4. Every Loop8 document opens with a metadata block: status, phase, task, owner, date, sources.
5. No secret values in any file. Names of keys, files and resources only.
6. Plans are written before the work starts, in a fixed order: what the task is for, what the design already decided, what will be built, assumptions, impact analysis, acceptance criteria, remaining steps. A build record is written after the step is validated.
7. Diagrams are made with draw.io when it is installed. Keep the `.drawio` source and its `.png` export together in a `diagrams/` folder next to the document.
8. Ground anything written for the customer in real project data. If something is unknown or not feasible, say so plainly.
9. Never include AI attribution in any git or GitHub artifact: no `Co-Authored-By` trailer for AI, no "Generated with" footer in pull requests, no mention of AI tooling in commits, pull requests, issues or code comments. Remove the default footer from `gh pr create`.
10. The full set of documentation rules is in `loop8/docs/best-practices/documentation-generation.md`.

## 11. How to work

1. Think before coding. State assumptions. If something is unclear, stop and ask. If several readings exist, present them instead of picking one silently.
2. Simplicity first. The minimum code that solves the problem, nothing speculative. If a simpler approach exists, say so.
3. Surgical changes. Touch only what the task needs, match the existing style and mention unrelated problems instead of fixing them. Every changed line traces to the request.
4. Goal driven. Turn each task into a check that can be verified, then loop until it passes.
5. POC mentality: working beats perfect, but the cost and failure design is part of "working".
6. Keep progress notes in `loop8/internal/` (gitignored). Keep this file and `PROJECT_PLAN.md` current as the project evolves.

## 12. Layout of `loop8/`

| Path | What it holds | Tracked |
|---|---|---|
| `loop8/README.md` | Index of everything below | Yes |
| `loop8/docs/sow/` | Scope extract of the signed SOW | Yes |
| `loop8/docs/planning/` | Delivery plan and test case drafts | Yes |
| `loop8/docs/architecture/` | The engine blueprint (HTML page) and its draw.io diagrams | Yes |
| `loop8/docs/client-proposal/` | Flows and costs document sent to the customer | Yes |
| `loop8/docs/reports/` | Technical assessment (SOW deliverable 1) | Yes |
| `loop8/docs/runbooks/` | AWS POC environment runbook | Yes |
| `loop8/docs/best-practices/` | Loop8 documentation rules | Yes |
| `loop8/docs/handoffs/` | End of phase handoffs | Yes |
| `loop8/internal/` | Work hours, project context, session notes | No, gitignored |
