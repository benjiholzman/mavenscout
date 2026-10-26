# MavenScout — Ranking Engine Brief for Loop8

Oct 26, 2026 · @Benji

## Purpose

The ranking feature's frame is built and working end to end. We're asking Loop8 to build the intelligence behind it: an engine that understands a job description and judges each consultant's fit, replacing two clearly labelled placeholder functions.

What exists today, all on `main`:

- A hiring manager sets their priorities, optionally pastes a job description (JD) or Terms of Reference (ToR), and ranks the directory against them.
- The scoring rules, score display and persistence are decided and built.
- A synthetic pool of 98 listed profiles and a baseline harness with five sample ToRs, so engine quality can be measured, not argued.

What's placeholder: understanding. Fit and requirement extraction are keyword matching today. That is the part that determines whether the rankings are actually good, and it's the part we want Loop8 to own.

## How ranking works today

Ranking is a mode of the directory, not a separate page. Must haves filter the pool before anything is scored; every candidate left gets a Fit score plus a weighted preference share.

The pipeline, with the two engine-owned steps in bold:

1. The manager sets priorities in the "Set your priorities" modal (and the filter bar).
2. Optionally, they paste a JD and click "Read job description": **`extractRequirements`** reads it once.
3. The app filters the pool by every Must have.
4. **`rankPool`** scores each remaining candidate: Fit, plus an outcome for each preference row.
5. The app combines Fit with the preferences into a total, bands it and ranks.
6. The app shows the ranked grid with each score's build-up, and saves the run.

Everything except steps 2 and 4 stays in the app, including the Must have filter, combining Fit with preferences, and the score build-up. A ranking without a JD skips the engine entirely: it ranks by the preferences alone, scored app-side.

**The requirements model.** A manager builds requirement rows in eight areas: Expertise (up to 5 items), Career level, Languages (up to 3, each with a minimum level), Employers (up to 3, each Now / Before / Either, optionally counting peer organizations), Location, Availability, Work arrangement, and Profile media (has Video Q&As, has an audio testimonial). Each row is at one of three strengths: **Nice to have**, **Important** or **Must have**. A row that isn't added means no preference.

- The directory filter bar and the Must have rows are one shared state: setting a filter creates a Must have row, and vice versa.
- After reading the JD, extraction pre-fills the locations and languages it states as Nice to have rows, which the manager can keep, change or clear. Expertise isn't pre-filled; it informs Fit only. Extraction never sets Must have.
- Each expertise item, language and employer is its own row at its own strength ("French: Must have; English: Nice to have"). Several Must haves in one area mean "any of".

**Scoring.** For each candidate who passes every Must have:

```latex
w = \frac{\min(2.5 \times \text{possible}, 20)}{100}, \qquad \text{Total} = (1 - w)\,\text{Fit} + 100\,w\,\frac{\text{earned}}{\text{possible}}
```

- **Fit** (0 to 100) is the engine's holistic judgement of fit to the JD. The manager can't adjust it.
- Each preference row is worth its strength's points: Nice to have 1, Important 3, times partial credit where it applies. *Possible* is the sum of applicable rows; *earned* is what the candidate meets. Rows that don't apply (career level for a firm) are left out.
- Partial credits: expertise tagged Strong 0.75, Working knowledge 0.4, an untagged text mention 0.4, a related item in the same group 0.3; career level one step away 0.4; a peer organization 0.6; location in the parent area 0.5, or the same continent 0.2; availability slightly late, or Working where Fluent was asked, 0.5.
- So each point carries 2.5% of the score, up to 20%. One Nice to have row moves a total by at most about 2.5 points; with no preference rows, Total = Fit.

**Bands:** Strong 80+, Good 65 to 79, Partial 50 to 64, Weak below 50. **Ties** break by higher Fit, then fresher availability, then profile id. **Membership level never affects rank.** (Has Video Q&As and has an audio testimonial can be priorities, but only because the manager chose them.)

**Display.** Each ranked card gets a header with its rank, match %, a progress bar and "x of y met", which opens a per-priority breakdown inside the card. An "About this result" modal shows the full build-up: the Fit part, each row's own points ("3 of 3 pts"), the preference subtotal, and the total, with rounding that always adds up. A ~100-word narrative is placeholder text grounded in the same numbers.

All tunable numbers (points, the per-point weight and its 20% cap, bands, credits) live in `src/lib/matching/config.ts`.

## Your scope

Loop8 owns the engine's judgement and the infrastructure it runs on. Each item below is placeholder today.

| Area | Placeholder today | What the real engine needs to do |
| --- | --- | --- |
| Fit | Keyword overlap between the JD's salient terms and the profile, blended with tags, then a calibration curve | Judge whether someone's actual experience suits the work, across bio, portfolio, work history, education and certifications (not video or audio transcripts) |
| Extraction | Literal phrase matching of expertise names and aliases, locations and languages | Understand what the ToR asks for. Map "refugee livelihoods" to Refugee Support. Tell "the programme covers Nigeria" apart from "must be based in Nigeria" |
| Evidence beyond tags | Text mention counts as partial credit | Credit relevant work described in a profile's own words, since tags are limited (3 Core, 5 Strong, up to 10 Working knowledge) |
| Peer organizations | Organizations of the same type on the canonical list count as peers | Suggest better peers (ADB, AfDB, IDB as peers of the World Bank) and match messy org names |
| Narratives | A template that quotes the scores | A genuinely useful ~100-word explanation, never contradicting the numbers |
| Calibration | Tuned on one sample ToR so on-topic profiles land at Fit 70+ | Calibrate Fit so bands mean something across real JDs (see open questions) |
| Infrastructure | Runs in the browser on loaded profiles | Run server-side on AWS. Fast and affordable across about 3,000 profiles, with a known cost per ranking |

One idea worth exploring: extraction could flag suggestions where the ToR itself says "required" or "essential", so the manager can choose to make them Must haves. Extraction should still never set Must have on its own.

**Rule: Fit judges capability for the work only.** Scoring has two lanes. Fit answers "can this person do the work?" from the whole profile. Priorities answer "do they meet the practical conditions?" and are set visibly by the manager. Fit must not score the practical conditions handled by priorities: location, language proficiency, availability, career level, work arrangement and employers (organization names never score in Fit). When a JD states them ("fluency in English", "based in Nairobi"), extraction routes them to priorities instead, where the manager can keep, change or require them. Exception: when a language or place is itself the expertise (a translation role, deep country knowledge), it counts as substance. Fit may value experience working in a region, but not where the candidate is based. This keeps the manager in control, avoids double counting, and keeps every score explainable.

**Profile data the engine reads** (full detail in `docs/MavenScout-profiles-membership.md`):

- **Relevance, not volume.** Featured Members can show up to 10 portfolio items against 3 for Members. Fit must judge each candidate's most relevant evidence the same way for everyone, so extra items help only by offering more chances of a close fit. Add a baseline test: the same profile with 3 vs 10 items (7 off-topic) must not rank higher.
- **No transcripts in Fit.** Video Q&A and audio testimonial transcripts are display-only.
- **One expertise list with tiers.** About 140 items in 15 browsing groups, tagged as Core (3), Strong (5) or Working knowledge (up to 10). Each item also has a hidden kind (sector, cross-cutting theme, or method & skill): several Must have expertise rows mean OR within a kind and AND across kinds. Must haves match Core and Strong only (unless the manager includes Working knowledge).
- **Individuals only.** Firm listings are hidden, so the engine doesn't need to score firms for now.
- **Structured data.** Employers come from a canonical organizations list (names, aliases, country offices, organization types); languages come from a canonical list with Fluent / Working proficiency. Location is still free text with a continent → region → country → city tree for picking; structured locations (UN M49 regions) come later.

## The engine contract

The UI only touches the engine through two functions in `src/lib/matching/`. Replace what's behind them and the rest of the app keeps working. The full types are in match rework spec §4 and §6, and in `src/lib/matching/types.ts`.

| Function | Input | Output | Called |
| --- | --- | --- | --- |
| `extractRequirements` | JD text, plus the expertise list and the location and language options | Suggested expertise items, locations and languages with mention counts; a hiring organization if found | Once, when the manager clicks "Read job description" |
| `rankPool` | A job description id, the requirement rows, and the pool that passed every Must have | One `MatchResult` per candidate: rank, total, band, Fit, per-row outcomes and points, scoring weights, narrative | Once per JD run, and again for newly eligible candidates only |

Rules the contract depends on:

1. **Read the JD once.** Extraction runs once and its output is stored with the job description. Scoring must not re-send the full JD text per candidate; a 15,000-character ToR would otherwise multiply cost across hundreds of candidates.
2. **Must haves filter before scoring.** Candidates who fail any Must have are never scored and add no cost. This filter stays in the app today (`src/lib/requirements/`) and is the natural place for a server-side query.
3. **Scores don't depend on the pool.** When a manager loosens a Must have after a run, only the newly eligible candidates are scored and merged. If your engine normalizes across the pool, this has to become a full re-run; tell us before building it that way.
4. **Return the parts, not just the total.** The display shows the Fit part, each preference row's outcome and points, and the subtotal. The additive structure is what makes every score explainable.

**Persistence.** Each run writes a `job_descriptions` row (JD, extraction, requirements, and `mode`: `'jd'` or `'preferences'`) and one `match_results` row per candidate, including a `scoring` object with the weights used, so saved runs still display correctly if config changes. Unsaved ad-hoc runs are replaced by the manager's next run; runs saved to an opening are kept. Migrations run through 019 (see `DEVELOPER-HANDOFF.md` for the order).

## Decision rights

Everything inside the engine is yours to change; the numbers that shape how rankings feel need sign-off; the fairness and transparency rules need a conversation first.

| Tier | What it covers |
| --- | --- |
| Yours to change | Everything inside `extractRequirements` and `rankPool`: models, prompts, retrieval, embeddings, how Fit is computed, how evidence is found, narratives, infrastructure |
| Propose, Benji signs off | Values in `config.ts`: Nice to have and Important points, the per-point weight and 20% cap, band thresholds, partial-credit multipliers, calibration constants |
| Ask first | The additive structure (Fit part plus preference share). Must haves filtering before scoring. Extraction never setting Must have. Membership never affecting rank. Employers never pre-filled |

The "ask first" rules aren't arbitrary. They exist because a hiring manager needs to trust and explain a ranking, and because favouring who-you-know or paid placement would undermine the product. If any of them gets in the way of a better engine, raise it and we'll talk it through.

## Measuring quality

The placeholder puts all 14 expected candidates in the top 5 across five sample ToRs, but that score is inflated, and beating it on harder cases is the real target.

**The harness.** `npm run baseline` scores each sample ToR against the live pool in memory and rewrites `docs/samples/ranking-baseline.md`. It only reads from the database. It runs three checks per ToR:

1. **Fixed requirements (primary):** scores against a fixed set of manager rows from `docs/samples/expectations.json`, so ranking quality is measured on stable inputs.
2. **End to end:** extraction, then every suggestion added at Nice to have.
3. **Extraction recall:** suggested terms against the terms it should have found.

It also checks decoys (profiles that should not reach the top 10), tie pairs, employer scopes, expertise tiers and language levels.

| Measure | Placeholder result (Oct 26, 2026) |
| --- | --- |
| Expected profiles in top 10 (fixed / end to end) | 14/14 / 14/14 |
| Expected profiles in top 5 (fixed / end to end) | 14/14 / 14/14 |
| Test-case checks passed (fixed / end to end) | 13/14 / 10/14 |
| Extraction recall | 53/62 terms (85%) |
| Ties at the top | None in any ToR |

**Why the score flatters the placeholder.** The synthetic profiles and the five ToRs were written together, in the same vocabulary. Keyword matching does well when the words line up. Real consultants describe their work in their own words, which is exactly where a keyword matcher fails.

**What we'd like you to add.** Harder test cases where profiles describe relevant work in different language from the ToR: "household panel surveys" for Survey Design, "cash transfer targeting" for Social Protection, a case study that never names the sector. That's where a real engine should clearly beat the placeholder, and it's how we'll both know the engine is earning its keep. Add them to `expectations.json` so they run with every change.

The synthetic profiles are flagged `is_demo` and are fictional people; real organizations appear only in work histories.

## Open questions

These are calibration and design questions we'd like your view on once you've worked with the engine; none blocks the start.

- **Strong matches become rare with many preference rows.** With many Nice to have / Important rows, the earned-to-possible ratio falls, because few candidates meet most of a long list. Under the earlier 3 / 8 points, a 12-row Sahel ranking topped out at 77, so nobody reached Strong. The current 1 / 3 points reach the 20% cap at 8 points, so this likely still applies. Should bands, the cap or the formula change once we see how many rows real managers add?
- **Band thresholds.** 80 / 65 / 50 were confirmed against the placeholder's score distribution on the expected profiles. Your Fit will distribute differently, so propose thresholds from your own baseline runs.
- **Fit counted twice.** Fit already rewards matching the JD's expertise, so an expertise row counts it again. That's intended when a manager adds a row deliberately; worth checking it doesn't over-reward when many rows are added. (This is also why extraction doesn't pre-fill expertise rows yet.)
- **Where the work is vs where the person must be.** Extraction currently pre-fills every location the ToR mentions. Real extraction should separate the two.
- **Structured locations.** Location will move to country + city with UN M49 regions. Plan for the location value shape to change.
- **Cost and latency targets.** What does a ranking of the full pool cost and how long does it take? We'd like a target per run before you choose an architecture.
- **Scope of work.** Part of the original "build the ranking feature" now exists. Let's confirm the statement of work focuses on Fit, extraction, evaluation and infrastructure.

## Getting started

Start with a walkthrough call, then read the repo in this order.

**Timing.** The profile changes listed under "Your scope" have landed on `main`. One step remains before the `loop8-handoff` tag: making a fresh Supabase project build cleanly from the repo (see the Loop8 section of `DEVELOPER-HANDOFF.md`). Build the engine against that tag. The first days are best spent on architecture, AWS setup, cost and latency targets, and the harder test cases, none of which depend on it.

1. `docs/MavenScout-match-rework.md`: the detailed ranking spec. §4 (extraction) and §6 (contract and types) are the engine contract. Read it alongside `docs/MavenScout-profiles-membership.md` (§6 expertise tiers, §11 ranking changes).
2. `docs/DEVELOPER-HANDOFF.md`: setup, the migration run order, the Loop8 section, and how to re-create the Sahel sample ranking.
3. Pull requests on `benjiholzman/mavenscout`: #1 (match rework), #2 (demo data and baseline), #3 (score normalization), #4 (data foundations: organizations, languages, expertise list) and #11 (the priorities modal and the current scoring), for what changed and why.
4. `src/lib/matching/`: `extract.ts`, `fit.ts`, `score.ts`, `config.ts` and `types.ts`.
5. `docs/samples/`: the five sample ToRs, `expectations.json` and the latest baseline report.

Then run `npm run baseline` to reproduce the placeholder's numbers before changing anything.

Next steps:

- [ ] Walkthrough call: the UI, the scoring rules, and the decision tiers
- [ ] Confirm the statement of work against "Your scope"
- [ ] Loop8 proposes an architecture, with cost and latency per ranking
- [ ] Loop8 adds harder vocabulary-mismatch test cases to the baseline
- [ ] First engine version measured against the baseline, before and after
