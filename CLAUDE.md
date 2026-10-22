# CLAUDE.md

This file provides guidance to Claude Code (and Fable) when working with code in this repository.

## Project

MavenScout — a specialized hiring marketplace connecting international development organizations with vetted consultants and firms for short-term, knowledge-based work. A curated pool of experts, searchable and filterable, with AI ranking against a job description, video/audio screening material, and a lightweight team-collaboration layer for shortlisting. Each consultant's profile doubles as their public professional website.

Read all of these in full before writing any code:
- `docs/MavenScout-PRD.md` — full product spec: features, data model, visibility rules, tier matrix, build order, Decisions table
- `docs/MavenScout-design.md` — brand constraints and design brief

## Before building

Present a detailed plan first: file/folder structure, the Supabase schema, the build order from PRD Section 11, and any assumptions being made. Wait for approval before writing code.

## Seed data (already prepared — do not regenerate)

Two ready-to-run SQL files provide all seed data. Create tables matching the PRD's Section 8 schema, then run these in order rather than inventing seed data:
1. `001_seed_taxonomy.sql` — domain expertise + technical skills taxonomy (two-tier), work arrangements, and the 5 Premium Video Q&A standard questions.
2. `002_seed_profiles.sql` — 15 realistic consultant/firm profiles (individuals + firms, mix of Standard/Premium) with full portfolio items (project name, role, description, results, links, captioned carousel images), plus intro videos for a few.

Location and language are free-text on `profiles` with filter options derived dynamically from the data — not taxonomy tables.

**RLS + seed sequencing (important):** in the schema step, for each table run `CREATE TABLE` → `ENABLE ROW LEVEL SECURITY` → `CREATE POLICY` together, using the policies described in PRD Section 8 — don't create all tables first and add policies later, and don't rely on a project-level auto-RLS trigger. A table with RLS enabled but no policy returns zero rows to the anon key (no error), which reads as "empty database." After the schema + seed run, sanity-check that the directory actually shows the 15 seeded profiles; an empty directory almost always means a missing public-read policy, not a broken query. Because auth is mocked in this build, policies that would depend on a real logged-in user are placeholders to be re-verified during the developer's real-auth pass.

## What is real vs. scaffolded in this build

Getting this distinction right matters — some things are deliberately stubbed for a later developer pass, others are fully real:

- **Authentication — scaffolded (mocked session).** Do not build real Supabase Auth security. Use a mocked "logged in as [Demo Hiring Manager] / [Demo Consultant]" session so account-gated features are demoable. `user_id` FKs stay in the schema as designed. A developer wires real auth later. **Build a dev-only role switcher** (logged out / hiring manager / consultant / admin) so the owner can test every state with no usernames or passwords — this is required for testability (see PRD 7.9).
- **Billing — scaffolded (no live Stripe).** Build the billing/tier UI and wire `is_premium` / `subscription_status` into the app's logic (gating, badges, priority sort, caps), driven by an admin-settable value. The actual "Subscribe"/payment action is non-functional. A developer wires real Stripe later.
- **Video (Video Q&As) and audio (testimonials) — REAL uploads.** These upload real files to Supabase Storage, with a paste-a-URL alternative for video. This is NOT mocked. Native in-browser *recording* (webcam/mic capture) is the only deferred piece (P1); upload-or-URL is the P0 path.
- **AI matching — real UI, placeholder scorer.** The ranking flow follows `docs/MavenScout-match-rework.md` (which supersedes PRD §7.7): JD → suggested requirements, each Nice to have / Important / Required → ranked directory with a score build-up and ~100-word narrative. Extraction and scoring are isolated, clearly-labeled placeholders (`extractRequirements`, `rankPool` in `src/lib/matching/`) that Loop8's engine replaces later — keep them swappable without touching the UI.
- **Account management — real UI, stubbed sensitive operations.** Build the user menu, settings, openings, and billing pages; operations that need real auth/Stripe (password change, real billing history) are clearly stubbed.

## Important constraints

- **This is a from-scratch build.** No prior codebase should be referenced or matched. An earlier prototype of this product exists but is intentionally not in this repo — infer nothing from anything other than the PRD and design brief here.
- **`/admin` is intentionally an open, unprotected route** in this build (PRD 7.9) — expected, not a bug.
- **Security surfaces to flag, not silently harden away:** the audio-testimonial reference-submission page (`/testimonial/:token`) is an unauthenticated upload endpoint, and `/admin` is open. **Most sensitive of all: verification evidence uploads (7.20) are payslips/employment letters — personal + financial documents.** These are acceptable to scaffold but must be flagged for the developer's hardening pass; verification-evidence storage in particular should be stubbed, not genuinely persisting real documents.
- **Visibility rules are load-bearing (PRD 7.2a).** `/site/:handle` (public personal website) hides availability, audio testimonials, and Premium Q&A videos; the general intro video is public. On `/profile/:handle`, audio + Premium Q&A videos + save actions require a free account (sign-up prompt when logged out); browsing, filtering, full profile text, and the intro video are open.
- Three brand logo SVGs (`mavenscout-mark.svg`, `mavenscout-app-icon.svg`, `mavenscout-lockup-horizontal.svg`) are at the repo root — relocate them into wherever static assets live once the project is scaffolded.
- **Mobile matters.** Build for phones as a first-class target, not an afterthought. The tricky interactions — flip cards with in-card video, the filter/availability modals, the ranking drawer and its requirement level controls, image carousel, tabbed profile — must be usable at narrow width, not just the grid reflowing to one column. See the cross-cutting mobile note at the top of PRD Section 7.

## How prescriptive to be

Not everything in the PRD is equally fixed. The data model, the real-vs-scaffolded boundaries above, the tier structure, the visibility rules, and anything in the PRD's Decisions table are product decisions — build them as specified. Anywhere the PRD describes a UI/interaction detail without tying it to an acceptance criterion, use your own judgment if you have a better way to deliver the same capability — see the note at the top of PRD Section 7 for the full framing, and `MavenScout-design.md` for how much latitude exists on visual design specifically.
