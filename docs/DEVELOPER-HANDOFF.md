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
| Database | `supabase/000_schema.sql` → `001` → `002` → `003` → `004`, run in order in the Supabase SQL editor. 000 includes tables + RLS + storage buckets + grants; 001–003 are seed data; 004 fills portfolio organization/years and work-history logo links on the seeded rows. A fresh project bootstraps from just these five files. An existing database that already ran 000–003 only needs 004 (its `ADD COLUMN IF NOT EXISTS` is a no-op on fresh projects, where 000 already creates the columns). |
| Verification baseline | Every PRD Definition-of-Done item (Section 13) was verified in-browser at desktop and 375px before handoff. The Playwright scripts lived in a temp scratchpad and are **not** committed — if you want a regression suite, the DoD checklist is the spec to automate against. |

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
| AI scoring | Deterministic keyword placeholder | `src/lib/matching/` (see Loop8 section) |
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

Everything lives in `src/lib/matching/`; replacing the engine touches nothing else.

- **The contract** (consumed by the UI and persisted in `job_descriptions` /
  `match_results`):
  - In: `{ profile, portfolio, transcripts }`, `{ raw_text, hiring_organization }`,
    `weights: { [component]: { active: boolean, value: 0–5 } }`
  - Out: `{ total_score: 0–100, sub_scores: MatchSubScore[], narrative: string }`
  - `sub_scores[].org_tier` must be `'same' | 'peer' | 'none'` — the placeholder only
    computes `same`; **peer-group reasoning is the engine's job** (PRD 7.7).
- Components: 3 merit (always active, defaults 5/3/3) + 5 preferences (off by default,
  2 when added). Slider *ratios* are what matter. Organizational History stays
  off-by-default — that's an ethics guardrail (PRD 7.7), not a UX accident.
- `computeMatchScore.ts` is sync/local; a remote Loop8 call slots into `rankPool()` in
  `run.ts` (already async, already batches candidate evidence).
- Narratives are templated placeholders (~100 words); the engine supplies real ones.
- Percentile normalization across the candidate pool is noted in the PRD as an
  engine-side option — not implemented in the placeholder.

## Demo data & placeholders to replace

- Fixed demo UUIDs (`aaaaaaaa-…`, `bbbbbbbb-…`, `cccccccc-…`) come from
  `003_seed_demo_accounts.sql` and are referenced in `session.tsx`.
- Intro videos are YouTube placeholder URLs from the seed; Amara Diallo additionally
  has: a test-PDF résumé, one published audio testimonial with a placeholder tone clip
  ("Jean-Baptiste Kouassi"), a submitted async video response (YouTube URL), and the
  Sahel opening holds a persisted full-pool AI ranking. All are safe to replace/delete;
  they exist so every feature demos without setup.
- The owner plans to upload licensed stock clips for videos (PRD Decisions table).

## Known deliberate non-goals (don't "fix" these)

Per PRD Non-Goals/Decisions: no in-platform messaging, no interview scheduling, no
offer tracking, no per-item visibility controls, no multi-seat firm accounts, no
platform localization, single flat taxonomy per sector. The ATS surface intentionally
ends at post-interview note + score.
