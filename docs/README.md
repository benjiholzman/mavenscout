# MavenScout docs

| Document | What it covers |
|---|---|
| [MavenScout-PRD.md](MavenScout-PRD.md) | The product spec: features, visibility rules, data model (§8), build order (§11) and the Decisions table. §7.7 describes ranking as built. Still the baseline for anything the specs below don't change. |
| [MavenScout-profiles-membership.md](MavenScout-profiles-membership.md) | Profiles, verification, audio testimonials, Video Q&As, Member / Featured Member, the unified expertise list, the canonical organizations list, hiring-manager accounts, individuals-only listings, and the build order up to the Loop8 handoff. |
| [MavenScout-match-rework.md](MavenScout-match-rework.md) | The detailed ranking spec: the "Set your priorities" modal (eight areas at Nice to have / Important / Must have, optional JD), Must haves as the filter bar, scoring, the card rank header and score build-up, and the engine contract. |
| [expertise-list-draft.md](expertise-list-draft.md) | The unified expertise list as approved (profiles-membership §6): 140 items in 15 browsing groups, each with its kind, the old items it absorbs, search aliases and scope notes. |
| [MavenScout-design.md](MavenScout-design.md) | Brand constraints (accent color, logo assets) and design brief. |
| [DEVELOPER-HANDOFF.md](DEVELOPER-HANDOFF.md) | Where the scaffolded seams are (real auth, Stripe, the security hardening checklist), how Loop8's engine replaces the placeholder matcher, and the demo data to replace. |
| [samples/](samples/) | Sample terms of reference for ranking, the expected results they're checked against (`expectations.json`), and the ranking baseline report generated from them by `npm run baseline` (`ranking-baseline.md`). |

## Precedence

The profiles & membership spec **overrides the PRD sections marked as superseded** (§7.3, 7.5, 7.6, 7.8, 7.14, 7.19, 7.20), along with the matching rows of the PRD Decisions table. Each of those sections carries a note at its top. Where a spec is silent, the PRD still applies.

Ranking is current in all three places: PRD §7.7 and its Decisions rows describe it as built, and the match-rework spec is the detailed version (Profiles & membership §11 adds the Fit inputs, tiered expertise and hidden firms). If they ever disagree, the match-rework spec wins.
