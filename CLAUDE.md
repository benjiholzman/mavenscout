# CLAUDE.md

This file provides guidance to Claude Code (and Fable) when working with code in this repository.

## Project

MavenScout — a specialized hiring marketplace connecting international development organizations with vetted individual consultants (firm listings are hidden behind `FIRMS_ENABLED`; firms take part as hiring organizations) for short-term, knowledge-based work. A curated pool of experts, searchable and filterable, with AI ranking against a job description, video/audio screening material, and a lightweight team-collaboration layer for shortlisting. Each consultant's profile doubles as their public professional website.

Read all of these in full before writing any code:
- `docs/MavenScout-PRD.md` — full product spec: features, data model, visibility rules, tier matrix, build order, Decisions table
- `docs/MavenScout-profiles-membership.md` — profiles, verification, audio testimonials, Member / Featured Member, the unified expertise list, the canonical organizations list. Supersedes PRD §7.3, 7.5, 7.6, 7.8, 7.14, 7.19, 7.20 and the matching Decisions rows wherever they conflict
- `docs/MavenScout-match-rework.md` — the ranking flow. Supersedes PRD §7.7, with the changes in profiles-membership §11 on top
- `docs/MavenScout-design.md` — brand constraints and design brief

## Before building

Present a detailed plan first: file/folder structure, the Supabase schema, the build order from PRD Section 11 (for profiles/membership work, the build order in that spec's §13), and any assumptions being made. Wait for approval before writing code.

## Seed data (already prepared — do not regenerate)

Two ready-to-run SQL files provide all seed data. Create tables matching the PRD's Section 8 schema, then run these in order rather than inventing seed data:
1. `001_seed_taxonomy.sql` — domain expertise + technical skills taxonomy (two-tier), work arrangements, and the 5 Premium Video Q&A standard questions.
2. `002_seed_profiles.sql` — 15 realistic consultant/firm profiles (individuals + firms, mix of Standard/Premium) with full portfolio items (project name, role, description, results, links, captioned carousel images), plus intro videos for a few.

These predate the profiles/membership spec (two-list taxonomy, firms, Standard/Premium, intro videos) and are kept as history; don't edit them. That spec's §13 step 5 re-seed is done: the demo data is now `scripts/demo-seed/profiles/*.mjs`, built by `npm run demo:build` into `supabase/018_reseed_demo_*.sql` (see `docs/DEVELOPER-HANDOFF.md`, *Demo data*). Change demo profiles there, not in the SQL or by hand in the database.

Location stays the existing free-text field on `profiles` for now; structured locations (country + city via Mapbox, UN M49 sub-regions) and the map view come after the Loop8 handoff. Built now, in profiles-membership §13 step 1: the canonical organizations table (§8), a canonical language list with Fluent/Working proficiency, and the unified expertise list with tiers (§6).

**RLS + seed sequencing (important):** in the schema step, for each table run `CREATE TABLE` → `ENABLE ROW LEVEL SECURITY` → `CREATE POLICY` together, using the policies described in PRD Section 8 — don't create all tables first and add policies later, and don't rely on a project-level auto-RLS trigger. A table with RLS enabled but no policy returns zero rows to the anon key (no error), which reads as "empty database." After the schema + seed run, sanity-check that the directory actually shows the 15 seeded profiles; an empty directory almost always means a missing public-read policy, not a broken query. Because auth is mocked in this build, policies that would depend on a real logged-in user are placeholders to be re-verified during the developer's real-auth pass.

## What is real vs. scaffolded in this build

Getting this distinction right matters — some things are deliberately stubbed for a later developer pass, others are fully real:

- **Authentication — scaffolded (mocked session).** Do not build real Supabase Auth security. Use a mocked "logged in as [Demo Hiring Manager] / [Demo Consultant]" session so account-gated features are demoable. `user_id` FKs stay in the schema as designed. A developer wires real auth later. **Build a dev-only role switcher** (logged out / hiring manager / consultant / admin) so the owner can test every state with no usernames or passwords — this is required for testability (see PRD 7.9).
- **Billing — scaffolded (no live Stripe).** Hiring managers are free; consultants pay to be listed as a **Member** or **Featured Member** (UI names; the internal `is_premium` field may stay). Build the billing/membership UI and wire `is_premium` / `subscription_status` into the app's logic (gating, the Featured badge, caps, Featured shown first in unranked browsing only), driven by an admin-settable value. Membership never affects AI rank, and "Has video Q&As" is a filter / Required row only, never a scored preference. The actual "Subscribe"/payment action is non-functional. A developer wires real Stripe later.
- **Video (Video Q&As) and audio (testimonials) — REAL uploads.** These upload real files to Supabase Storage. This is NOT mocked. In-browser recording is now P0 alongside upload, for both testimonials and Video Q&As. Portfolio video is a YouTube/Vimeo link field, not an upload.
- **AI matching — real UI, placeholder scorer.** The ranking flow follows `docs/MavenScout-match-rework.md` (which supersedes PRD §7.7), plus the changes in profiles-membership §11 (transcripts never feed Fit, relevance not volume, tiered expertise): JD → suggested requirements, each Nice to have / Important / Required → ranked directory with a score build-up and ~100-word narrative. Extraction and scoring are isolated, clearly-labeled placeholders (`extractRequirements`, `rankPool` in `src/lib/matching/`) that Loop8's engine replaces later — keep them swappable without touching the UI.
- **Account management — real UI, stubbed sensitive operations.** Build the user menu, settings, openings, and billing pages; operations that need real auth/Stripe (password change, real billing history) are clearly stubbed.

## Important constraints

- **This is a from-scratch build.** No prior codebase should be referenced or matched. An earlier prototype of this product exists but is intentionally not in this repo — infer nothing from anything other than the PRD, the specs and the design brief here.
- **`/admin` is intentionally an open, unprotected route** in this build (PRD 7.9) — expected, not a bug.
- **Security surfaces to flag, not silently harden away:** the referee testimonial page (`/testimonial/:token`) is an unauthenticated upload endpoint, gated only by a 6-digit code sent to the referee's institutional email — and in development that email is mocked and the code is shown on screen. `/admin` is open. The ID/selfie provider and the AI verification review are placeholders. **Most sensitive of all: verification evidence uploads (profiles-membership §3) are employment letters/contracts and degree/certification documents — personal documents.** The spec deletes them after review; in this build their storage stays stubbed, not genuinely persisting real documents. All of these are acceptable to scaffold but must be flagged for the developer's hardening pass.
- **Visibility rules are load-bearing (PRD 7.2a, as amended by profiles-membership).** There is no intro video. `/site/:handle` (public personal website) hides availability, audio testimonials, and Video Q&As. On `/profile/:handle`, audio testimonials, Video Q&As, saving and ranking require a free hiring-manager account (sign-up prompt when logged out; sign-up needs an institutional email, spec §9); browsing, filtering and full profile text are open.
- **Removed — don't build these, even though the superseded PRD sections still describe them** (profiles-membership §2.2): the general "Tell us about yourself" intro video and its flip-card face, the separate Audio Testimonials tab (testimonials sit inline on employer entries and portfolio items), the "Verified" badge and "Verified only" filter (everyone listed is verified), and the Premium application with evidence uploads.
- Three brand logo SVGs (`mavenscout-mark.svg`, `mavenscout-app-icon.svg`, `mavenscout-lockup-horizontal.svg`) are at the repo root — relocate them into wherever static assets live once the project is scaffolded.
- **Mobile matters.** Build for phones as a first-class target, not an afterthought. The tricky interactions — flip cards, the filter/availability modals, the ranking drawer and its requirement level controls, image carousel, tabbed profile, and the referee's phone-first recording page — must be usable at narrow width, not just the grid reflowing to one column. See the cross-cutting mobile note at the top of PRD Section 7.

## How prescriptive to be

Not everything in the PRD is equally fixed. The data model, the real-vs-scaffolded boundaries above, the Member / Featured Member structure, the visibility rules, the PRD's Decisions table as amended by the two specs above, and the specs' decided rules are product decisions — build them as specified. Anywhere the PRD describes a UI/interaction detail without tying it to an acceptance criterion, use your own judgment if you have a better way to deliver the same capability — see the note at the top of PRD Section 7 for the full framing, and `MavenScout-design.md` for how much latitude exists on visual design specifically.
