# MavenScout — Developer Handoff

This build is the complete PRD scope (all P0s + the three P1 fast-follows) with three
things deliberately **scaffolded, not production-built**: authentication, billing, and a
handful of security surfaces. This document is the map for the passes that make it real.
Read it alongside `docs/MavenScout-PRD.md` (especially 7.8, 7.9, 7.20, and Section 8's
RLS notes) — the PRD defines *what* was intended; this defines *where the seams are*.

## Orientation

| | |
|---|---|
| Stack | React 18 + TypeScript + Vite, Tailwind 3, Framer Motion, React Router 6, Supabase (Postgres + Storage) |
| Run | `npm install && npm run dev` — needs `.env` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (see `.env.example`) |
| Database | `supabase/000_schema.sql` → `001` → `002` → `003` → `004` → `005` → `006` → `007_seed_demo_profiles_1` … `_4` → `008`, run in order in the Supabase SQL editor. 000 includes tables + RLS + storage buckets + grants; 001–003 are seed data; 004 fills portfolio organization/years and work-history logo links on the seeded rows; 005 adds the match-rework columns (`job_descriptions.requirements/extracted`; `match_results.rank/band/fit_score/adjustments/adjustments_capped/must_haves_passed`) and deletes pre-rework rankings; 006 adds `profiles.is_demo` (flags the original 15 and normalizes their country names); the four 007 files add 100 synthetic `demo-*` profiles (generated — see *Demo data* below); 008 adds `match_results.scoring` for the preference-weighted total and deletes rankings scored under the old additive formula. A fresh project bootstraps from these files. An existing database only needs the migrations it hasn't run — 004 and 005 use `ADD COLUMN IF NOT EXISTS`, so they're no-ops on fresh projects, where 000 already creates the columns. |
| Verification baseline | Every PRD Definition-of-Done item (Section 13) was verified in-browser at desktop and 375px before handoff. The Playwright scripts lived in a temp scratchpad and are **not** committed — if you want a regression suite, the DoD checklist is the spec to automate against. The match rework's acceptance criteria (`docs/MavenScout-match-rework.md` §10) were verified the same way at desktop (1280px) and 375px in October 2026, plus scripted checks of the filter-bar ↔ requirements round-trip (22 filter combinations matched the pre-rework directory except the intended career-level change), the scoring math, and the displayed rounding (20,000 random cases, re-run for the preference-weighted total); those scripts are not committed either. |

## What is mocked vs. real (the load-bearing distinction)

**Real, keep as-is:** all Supabase reads/writes, video/audio/résumé uploads to Storage,
tier logic driven by `is_premium`/`subscription_status`, the visibility rules
(`src/lib/visibility.ts`), openings/notes/shares data model, in-browser recording.

**Mocked/stubbed, yours to wire:**

| Area | Current state | Where |
|---|---|---|
| Auth | localStorage role switcher, no real identity | `src/lib/session.tsx`, `src/components/layout/DevRoleSwitcher.tsx` |
| Billing | Admin-settable `subscription_status`; Subscribe disabled | `src/pages/Billing.tsx`, admin Tier tab |
| Outbound email | ALL of it is stubbed: contact relay, testimonial request emails (copy-paste template instead), async video-request notifications, "email this list" (mailto:) | `ContactModal.tsx`, `TestimonialsSection.tsx`, `VideoRequestsPanel.tsx`, `SharePanels.tsx` |
| Verification evidence | Upload UI exists; **no file is persisted** — `file_path` holds a `STUB/…` placeholder | `TierSection.tsx`, `verification_evidence` table |
| AI matching | Placeholder JD extraction + placeholder Fit and preference adjustments (deterministic keyword matching) behind the real contract | `src/lib/matching/` (see Loop8 section; spec `docs/MavenScout-match-rework.md`) |
| Account ops | Email/password change forms render disabled | `src/pages/Account.tsx` |
| Brandfetch | Fully built, dormant until a client id exists | `src/lib/brandfetch.ts` (env var or localStorage `ms_brandfetch_client_id`) |
| Custom domains | `profiles.custom_domain` reserved, no DNS integration (PRD Decisions) | — |

## Pass 1 — Real authentication (Supabase Auth)

1. **Replace the session internals.** `src/lib/session.tsx` is the single mock: swap its
   internals for Supabase Auth (`supabase.auth.onAuthStateChange` → derive `role` from a
   profile/hiring_manager lookup on `user_id`). The `useSession()` surface
   (`{ role, isLoggedIn, setRole→signOut }`) is what ~20 components consume — keep it and
   nothing else changes shape.
2. **Delete the switcher.** `DevRoleSwitcher.tsx` + its single mount in `AppLayout.tsx`.
   Nothing else references it.
3. **Identity constants.** `DEMO_HIRING_MANAGER_ID` / `getEditorProfileId()` in
   `session.tsx` stand in for "the current user's row." Replace call sites with lookups
   keyed on `auth.uid()`: openings/notes writes (`lib/openings.ts`,
   `SaveCandidateFlow.tsx`), editor profile resolution (`useEditorProfile.ts`), video
   requests (`lib/videoRequests.ts`), signup draft creation (`Signup.tsx` — also set
   `user_id` on insert).
4. **Foreign keys.** `profiles.user_id` and `hiring_managers.user_id` are plain nullable
   uuids (a real FK would have broken seeding). Add
   `REFERENCES auth.users(id)` once real users exist.
5. **RLS — the big one.** Every table in `000_schema.sql` has permissive
   `dev_read_*`/`dev_write_*` policies with a `-- PROD:` comment stating the intended
   policy. Replace them table by table; the comments are the spec. Special cases:
   - `profiles`: public SELECT only for `approved + active`; owner reads own row any
     state; admin all. App code already filters directory queries the same way — after
     RLS lands, that becomes defense in depth.
   - `audio_testimonials`: the anon INSERT path is a *feature* (token page) — scope it
     to rows where `submission_token` matches and `audio_path IS NULL`, ideally via a
     security-definer RPC rather than raw table access.
   - `opening_shares` → `/shortlists/:token` read path: anon needs to resolve a
     non-revoked token into an opening's data. A security-definer function or a
     filtered view keeps the base tables closed.
   - `candidate_notes_scores` INSERT/UPDATE: only opening owner + granted
     `opening_reviewers` (the "participate" rule, PRD 7.4). The UI already enforces
     this against the mock; RLS makes it real.
   - Storage: bucket policies are wide open for dev (see 000's final block). Tighten
     per-bucket; make `resumes` **private + signed URLs** (CVs are personal documents).
6. **Login/Signup pages.** Swap the fake submit handlers for real auth calls; the
   two-persona structure and the consultant draft-profile creation flow stay.
7. **Admin.** `/admin` is an open route **by design in this build** (PRD 7.9). Gate it
   on a real admin role (e.g., a `user_roles` table or JWT claim) before any deployment.
8. **Re-verify PRD 7.2a** (the visibility matrix) end-to-end after RLS lands — it's the
   most load-bearing behavior in the product and currently enforced in app code only.

## Pass 2 — Stripe

- `Billing.tsx`'s pause/cancel/resume currently write `subscription_status` directly
  (sanctioned for demo realism, PRD 7.9b). Re-point these at Stripe subscription
  mutations, and let your **webhook** be the only writer of `subscription_status` /
  `is_premium`. Everything downstream (publication gating, Featured treatment, priority
  sort, all tier caps) already keys off those two fields — no UI changes needed.
- Wire the disabled "Subscribe — coming soon" button to Stripe Checkout. Note the PRD's
  product rule: **Premium is applied for, not just bought** — payment should follow the
  admin's verified-Premium approval (see `TierSection.tsx` + admin review queue), not
  bypass it.
- Replace the sample billing-history rows with real invoice data.
- The admin Tier tab's manual toggles were the billing stand-in; keep them as an
  operator override or remove.

## Security hardening checklist (flagged surfaces, PRD 7.6/7.20)

- [ ] `/testimonial/:token` — unauthenticated upload endpoint **by design**. Validate
      the token server-side, cap MIME/size at the storage policy, rate-limit, and
      consider expiring tokens.
- [ ] Storage buckets (`videos`, `audio-testimonials`, `resumes`) — currently public
      read + anon write. Scope writes to owners; make `resumes` private (signed URLs).
- [ ] **Verification evidence — the most sensitive data in the app** (payslips,
      employment letters). Storage is deliberately **stubbed**: design it fresh —
      private bucket, admin-only access, retention/deletion policy, then replace the
      `STUB/…` placeholder writes in `TierSection.tsx`. Do not simply "enable" uploads
      into the current dev posture.
- [ ] `/admin` — real access control (see Pass 1).
- [ ] Contact relay (`ContactModal.tsx`) — when wiring real email, keep the PRD rule:
      candidate addresses are never exposed to the client; relay server-side.
- [ ] Grants: `000_schema.sql` ends with `GRANT ALL … TO anon` — narrow alongside RLS.

## Loop8 — swapping in the real matching engine

The contract is **§4 (extraction) and §6 (types, persistence) of
`docs/MavenScout-match-rework.md`**, which supersedes PRD §7.7. It's typed in
`src/lib/matching/types.ts`; replacing the engine touches nothing outside
`src/lib/matching/`.

- **Two entry points, both placeholders today:**
  - `extractRequirements(jdText, ctx) → ExtractedRequirements` (`extract.ts`) — reads
    the JD **once** and returns *suggestions* (expertise / skills with mention
    counts and a slight/strong lean, locations, languages, optional hiring org).
    The UI shows them as chips; nothing enters the grid until the manager adds it,
    and nothing is ever suggested as Required. Output is stored on
    `job_descriptions.extracted`.
  - `rankPool(jobDescriptionId, requirements, pool) → MatchResult[]` (`score.ts`) —
    receives the stored JD by id (never the full text per candidate) plus the
    requirement rows, and a pool that has **already passed the Required rows**.
    Returns ranked results: `fit_score`, one `Adjustment` per Nice to have /
    Important row (`met | partial | not_met | not_applicable`, points earned),
    `scoring` (`{weight, earned, possible}`), `must_haves_passed`, `band`, `rank`,
    `narrative`.
- **Scoring rule the UI explains to managers** (spec §5.3): preferences carry
  weight equal to their points, up to 20% of the score —
  `w = min(possible, 20) / 100`, `total = (1 − w) × Fit + 100 × w × earned ÷ possible`,
  and `total = Fit` with no applicable preference rows. A Nice to have row is worth
  3 points, Important 8, partials × credit; not-applicable rows count toward
  neither earned nor possible. The pure formula is `total.ts`, shared by the scorer
  and the display. Every tunable number is in `config.ts`. Ties: Fit → more
  recent `availability_updated_at` → id. Premium never affects rank.
- **What stays app-side** (don't move it into the engine):
  - The requirements grid / filter-bar state (`src/lib/requirements/`). Required
    rows are evaluated by `applyMustHaves()` (`mustHaves.ts`), which reuses the
    directory filter logic exactly. It runs in the browser on the loaded pool
    today; it's the one place to turn into a database query when the pool grows.
  - The displayed build-up (`display.ts`: rows show their own points; Fit part +
    preferences = total, exactly) and persistence
    (`persist.ts`).
- **Org History:** the tiered `met` / `partial` (peer org) / `not_met` shape is the
  contract. The placeholder matches names only, and peers only if the manager types
  them; **suggesting peer organizations is the engine's job**. The row is only ever
  added deliberately (ethics note in the spec).
- **Loosening after a run** scores only the newly eligible candidates
  (`scoreNewcomers` in `persist.ts`). If the engine normalizes scores across the
  pool (e.g. percentile scaling), that has to become a full re-run — see the comment
  there.
- The placeholder Fit is calibrated in `config.ts` (`FIT_CALIBRATION`) against the
  sample ToR in `docs/samples/` — on-topic profiles ~75, related ~55, unrelated
  13–37. Real calibration is the engine's job.
- **Baseline to beat:** `npm run baseline` scores five sample ToRs
  (`docs/samples/tor-0*.txt`) against the live pool with the current engine and
  rewrites `docs/samples/ranking-baseline.md`: whether the expected profiles land in
  the top 5 / top 10 with fixed manager rows and end to end (extraction → Add all),
  deliberate test cases (wrong location, specialist vs generalist, untagged evidence,
  current vs former staff, tie pairs, decoys) and extraction recall. Expectations live
  in `docs/samples/expectations.json`. The harness is read-only (SELECTs and in-memory
  `scorePool`); run it after every engine change.
- Narratives are templated (~100 words, grounded in the shown numbers); the engine
  supplies real ones.

## Demo data & placeholders to replace

- Fixed demo UUIDs (`aaaaaaaa-…`, `bbbbbbbb-…`, `cccccccc-…`) come from
  `003_seed_demo_accounts.sql` and are referenced in `session.tsx`.
- Intro videos are YouTube placeholder URLs from the seed; Amara Diallo additionally
  has: a test-PDF résumé, one published audio testimonial with a placeholder tone clip
  ("Jean-Baptiste Kouassi"), a submitted async video response (YouTube URL), and the
  Sahel opening holds a persisted full-pool AI ranking. All are safe to replace/delete;
  they exist so every feature demos without setup.
- **The Sahel ranking is not in the seed files** — the app created it, and
  `005_match_rework.sql` and `008_score_normalization.sql` each delete rankings
  scored under an older formula. To re-create it (or on a
  fresh project): log in as the hiring manager (dev switcher) → My openings →
  *Senior M&E Consultant — Sahel Resilience Program* → **Rank candidates** → paste
  `docs/samples/sahel-me-tor.txt` → **Read job description** → **Add all** → set
  *Monitoring & Evaluation* and *Impact Evaluation* to **Important** → **Run ranking**.
  The run saves to the opening automatically.
- **Ad-hoc rankings** (run from the directory without an opening) are
  `job_descriptions` rows with `opening_id` null. Starting a new ad-hoc run deletes
  that manager's previous unsaved ones, so they don't accumulate; an old ad-hoc URL
  then shows "This ranking is no longer available". With real auth, scope that
  delete to the signed-in manager (it already filters by `hiring_manager_id`).
- The owner plans to upload licensed stock clips for videos (PRD Decisions table).
- **Synthetic demo profiles (`is_demo`).** `007_seed_demo_profiles_{1..4}.sql` add 100
  fictional profiles (handles `demo-*`): 80 individuals, 20 firms, spread across UN M49
  sub-regions, 30 Premium/verified, some with stale availability. They are generated —
  edit `scripts/demo-seed/data/*.mjs` and run `node scripts/demo-seed/build.mjs` (it
  validates taxonomy names, tag caps, canonical countries/languages in
  `scripts/demo-seed/vocab.mjs`, and coverage). Re-running a 007 file is idempotent.
  Locations follow "City, Country" with the common English country names in
  `vocab.mjs`; languages use standard English names.
- **Purging demo data:** `supabase/purge_demo.sql` (`DELETE FROM profiles WHERE
  is_demo`) removes the 100 synthetic profiles *and* the original 15 — including
  `amara-diallo`, the role switcher's demo consultant — and cascades to their
  portfolio, media rows, opening entries and match results. Run it only when real
  profiles replace the demo set.

## Known deliberate non-goals (don't "fix" these)

Per PRD Non-Goals/Decisions: no in-platform messaging, no interview scheduling, no
offer tracking, no per-item visibility controls, no multi-seat firm accounts, no
platform localization, single flat taxonomy per sector. The ATS surface intentionally
ends at post-interview note + score.
