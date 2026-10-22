# MavenScout docs

| Document | What it covers |
|---|---|
| [MavenScout-PRD.md](MavenScout-PRD.md) | The original product spec: features, visibility rules, data model (§8), build order (§11) and the Decisions table. Still the baseline for anything the specs below don't change. |
| [MavenScout-profiles-membership.md](MavenScout-profiles-membership.md) | Profiles, verification, audio testimonials, Video Q&As, Member / Featured Member, the unified expertise list, the canonical organizations list, hiring-manager accounts, individuals-only listings, and the build order up to the Loop8 handoff. |
| [MavenScout-match-rework.md](MavenScout-match-rework.md) | AI ranking: JD → suggested requirements → Nice to have / Important / Required → ranked directory in a drawer, with score build-up and narrative. |
| [expertise-list-draft.md](expertise-list-draft.md) | The unified expertise list as approved (profiles-membership §6): 140 items in 15 browsing groups, each with its kind, the old items it absorbs, search aliases and scope notes. |
| [MavenScout-design.md](MavenScout-design.md) | Brand constraints (accent color, logo assets) and design brief. |
| [DEVELOPER-HANDOFF.md](DEVELOPER-HANDOFF.md) | Where the scaffolded seams are (real auth, Stripe, the security hardening checklist), how Loop8's engine replaces the placeholder matcher, and the demo data to replace. |
| [samples/](samples/) | Sample terms of reference for ranking, the expected results they're checked against (`expectations.json`), and the ranking baseline report generated from them by `npm run baseline` (`ranking-baseline.md`). |

## Precedence

The profiles & membership spec and the match-rework spec **override the PRD sections marked as superseded**, along with the matching rows of the PRD Decisions table:

- **Profiles & membership:** PRD §7.3, 7.5, 7.6, 7.8, 7.14, 7.19, 7.20.
- **Match rework:** PRD §7.7. Profiles & membership §11 then amends the match rework (Fit inputs, tiered expertise, firms hidden).

Each superseded PRD section carries a note at its top and is kept as written for history. Where a spec is silent, the PRD still applies.
