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
| Run | `npm install && npm run dev` — needs `.env` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (see `.env.example`). `npm run dev:lan` serves HTTPS on the local network (self-signed certificate) for testing on a phone: browsers allow the microphone and `crypto.subtle` only on secure origins |
| Database | `supabase/000_schema.sql` → `001` → `002` → `003` → `004` → `005` → `006` → `007_seed_demo_profiles_1` … `_4` → `008` → `009` → `010` → `011`, run in order in the Supabase SQL editor; then `012` once the `data-foundations` branch is merged (never before: it drops what older code reads); then `013`; `014` once the `profiles-membership` branch is merged; then `015`, `016`; `017` once the `verification` branch is merged; then the demo re-seed `018_reseed_demo_0` → `_4`. 000 includes tables + RLS + storage buckets + grants; 001–003 are seed data; 004 fills portfolio organization/years and work-history logo links on the seeded rows; 005 adds the match-rework columns (`job_descriptions.requirements/extracted`; `match_results.rank/band/fit_score/adjustments/adjustments_capped/must_haves_passed`) and deletes pre-rework rankings; 006 adds `profiles.is_demo` (flags the original 15 and normalizes their country names); the four 007 files add 100 synthetic `demo-*` profiles (generated — see *Demo data* below); 008 adds `match_results.scoring` for the preference-weighted total and deletes rankings scored under the old additive formula; 009 adds the canonical `organizations` list (200 seeded) and `portfolio_items.organization_id`; 010 adds the canonical `languages` list and `profiles.spoken_languages` (Fluent/Working), backfilled at Fluent, plus logo fixes for four organizations; 011 adds the unified expertise list (140 items in 15 groups, each with a kind, aliases and the old names it absorbs) and `profiles.tiered_expertise`, filled by `ms_migrate_expertise`. 009–011 are additive (old columns and taxonomies untouched); 012 re-migrates any stragglers, then drops `profiles.languages/expertise/skills`, the old taxonomies and the migration helpers. 013 adds portfolio video links, the single portfolio image list and `profiles.submitted_at`; 014 removes `portfolio_items.cover_image` and the intro and portfolio video rows. 015 (additive) adds the testimonial flow: a stable `id` on every `work_history` entry, the request, referee, code and lifecycle columns on `audio_testimonials`, the `testimonial_events` audit table, `profiles.email` and `profiles.testimonial_grace_until`, and `hiring_managers.email` / `updates_opt_in`. 016 adds hiring-manager sign-up and the `verification_checks` audit table; 017 drops `profiles.verification_status`. 018 is the step 5 demo re-seed (see *Demo data* below): part 0 adds `hiring_managers.is_demo`, parts 1–4 are generated. A fresh project bootstraps from these files. An existing database only needs the migrations it hasn't run — 004 and 005 use `ADD COLUMN IF NOT EXISTS`, so they're no-ops on fresh projects, where 000 already creates the columns. |
| Verification baseline | Every PRD Definition-of-Done item (Section 13) was verified in-browser at desktop and 375px before handoff. The Playwright scripts lived in a temp scratchpad and are **not** committed — if you want a regression suite, the DoD checklist is the spec to automate against. The match rework's acceptance criteria (`docs/MavenScout-match-rework.md` §10) were verified the same way at desktop (1280px) and 375px in October 2026, plus scripted checks of the filter-bar ↔ requirements round-trip (22 filter combinations matched the pre-rework directory except the intended career-level change), the scoring math, and the displayed rounding (20,000 random cases, re-run for the preference-weighted total); those scripts are not committed either. |

## What is mocked vs. real (the load-bearing distinction)

**Real, keep as-is:** all Supabase reads/writes, video/audio/résumé uploads to Storage,
membership logic driven by `is_premium`/`subscription_status` (`src/lib/membership.ts`),
the visibility rules (`src/lib/visibility.ts`), the listing rule (`src/lib/listing.ts`),
the profile minimums (`src/lib/completeness.ts`), openings/notes/shares data model,
in-browser recording.

**Membership (profiles-membership §2).** UI names are **Member** and **Featured
Member**; `is_premium` means "chose Featured". Featured *status* (`isFeatured`) also
needs every active standard Video Q&A answered. Until then the profile shows, is
capped and is placed as a Member. The loaders set a derived
`Profile.video_qnas_complete`; it is not a column and must never be written back.
Membership never affects AI rank, and "Has video Q&As" (requirement kind `video_qna`)
is Required-only by construction (`isRequiredOnly` in `lib/requirements/model.ts`).

**Audio testimonials (profiles-membership §4; `src/lib/testimonials/`).** The
consultant requests one per employer entry (Featured Members: per portfolio item
too) from the editor's Audio testimonials section; the integrity rules
(`integrity.ts`) block addresses not on the organizations list, controlled
domains, the consultant's own email and shared mailboxes, and hold the link for
admin review on a name/address mismatch, a newly added organization or a failed
pre-check (the referee volume flag doesn't hold it). The consultant sends the
link personally. The referee confirms their institutional email with a code on
`/testimonial/:token`, reviews the details, records (AAC/MP4 preferred; WebM is
converted to WAV on the device, `lib/audioFormat.ts`, so every browser plays it),
consents and submits; the consultant publishes. The required testimonial (the
only published one on an employer entry) can only be replaced; others can be
removed; the referee can withdraw at any time on `/testimonial/withdraw/:token`,
which starts a 30-day grace period if it was the required one (`isListed` drops
the profile when it lapses). Every step writes `testimonial_events`.
Transcripts never feed ranking. A published employer-entry testimonial is a
profile minimum (`lib/completeness.ts`) for each level that
`TESTIMONIAL_REQUIRED` in `src/lib/config.ts` marks (both, today); the same
setting drives the replace-only rule, the grace period and the listing check
(`testimonialRequired` in `lib/testimonials/rules.ts`), and the "every expert is
vouched for" copy lives in `lib/testimonials/copy.ts`.
`TESTIMONIAL_DEADLINE_DAYS` (unset by default) lets a verified profile be approved
without its testimonial and gives it that many days to publish one, using the same
`testimonial_grace_until` column as the withdrawal grace period; while it's set the
copy stops claiming every expert is vouched for. The directory's "Has audio
testimonial" filter (requirement kind `audio_testimonial`) is Required-only like
`video_qna`, and flip cards show "Testimonial from [organization]" from teaser rows
(`TEASER_COLUMNS` in `lib/testimonials/display.ts`: no emails or transcripts).

**Hiring-manager accounts (profiles-membership §9; `src/lib/managers.ts`).** Sign-up
needs a work email whose domain is in `organizations.domains` (`orgForDomain`), then
a 6-digit code (mocked: shown on screen). Hirers without one request an exception
that an admin approves in /admin → Hiring managers. `hiring_managers.account_status`
is the state; the session pins the signed-up row (`ms_manager_id`) and only an
`active` account unlocks saving, ranking, Video Q&As and testimonials
(`useSession().hasAccess`; `isLoggedIn` is just "signed in"). Referees' one-click
accounts are created active. A signed-up manager still works in the demo manager's
openings (`DEMO_HIRING_MANAGER_ID`) until real auth gives each account its own.

**Verification (profiles-membership §3, §10; `src/lib/verification/`).** Required:
name + photo, most recent employer, most recent degree, every certification.
`verification_checks` (016) is the append-only audit record: ID-provider results,
admin decisions, bio edit requests. An item's label is its latest decision while the
item's checked fields still match the stored fingerprint (`items.ts`), so editing
removes the label with no write; an employer is also Confirmed by a published
testimonial whose referee's organization is the entry's (§4.4). `state.ts` gives
each item's status and the gates: Submit needs the consultant's part done
(`lib/verification/gaps.ts`), admin Approve needs every item labelled. After
approval, losing a required label (or a newer job/degree) opens a 30-day window
(`VERIFICATION_RULES.recheckDays`, `profiles.verification_recheck_until`, rules in
`window.ts`); `isListed` drops the profile once it lapses. Editor saves, admin
decisions (`decisions.ts`) and testimonial publish/remove/withdraw (`withRecheck`)
keep it in step. Every admin decision deletes that item's evidence and keeps only
its kind, type and size in the audit row; an unverifiable certification is removed
from the profile. Profiles show Confirmed / Document reviewed / Pending check
(certifications) with a legend; /about#verification explains them.

**Firms are hidden** behind `FIRMS_ENABLED = false` (`src/lib/config.ts`, spec §1):
excluded from the directory, search, ranking and the baseline pool through
`isListed`; the Type filter, Type requirement row and firm onboarding options are
hidden. Firm code, columns and data stay. Direct `/profile` and `/site` links to a
firm still open (e.g. firms already saved in openings). There is no sitemap yet;
when one is added, build it from `isListed`.

**Mocked/stubbed, yours to wire:**

| Area | Current state | Where |
|---|---|---|
| Auth | localStorage role switcher, no real identity | `src/lib/session.tsx`, `src/components/layout/DevRoleSwitcher.tsx` |
| Billing | Admin-settable `subscription_status`; Subscribe disabled | `src/pages/Billing.tsx`, admin Tier tab |
| Outbound email | ALL of it is stubbed: contact relay, async video-request notifications, "email this list" (mailto:). Testimonial emails (the referee's code, the consultant's new-testimonial and withdrawal notices, the referee's published notice with the withdraw link) are `email_mocked` events in `testimonial_events` (`email_suppressed_demo` for demo profiles, which must never be sent; see the hardening checklist), listed in admin's Mock outbox; the referee's code is shown on screen. Real sending needs SPF/DKIM/DMARC on the sending domain (spec §4.6 rule 9) | `ContactModal.tsx`, `lib/testimonials/outbox.ts`, `VideoRequestsPanel.tsx`, `SharePanels.tsx` |
| Testimonial pre-check | Placeholder `precheckReferee`: checks the request against itself (full name, title, current organization = email domain's organization). The real one searches public records (spec §4.2) | `src/lib/testimonials/precheck.ts` |
| Speech-to-text | Placeholder `transcribeAudio` returns labelled text instantly; the referee can edit it | `src/lib/testimonials/transcribe.ts` |
| Testimonial code check | Generated, hashed and compared in the browser | `src/lib/testimonials/code.ts`, `referee.ts` |
| Verification evidence | **Storage stubbed by design**: the upload form records the file's name, type and size against a `stub://` path and never stores the document; the admin sees "not stored in this build". Deleting after review deletes the row | `src/lib/verification/store.ts`, `decisions.ts` |
| ID + selfie check | Placeholder `runPlaceholderIdCheck`: the consultant picks pass or fail. The real provider (Stripe Identity, Persona) posts its result server-side; store only the result | `src/lib/verification/store.ts` |
| AI verification review | Placeholder `reviewProfile`: fixed rules (dates, registers, bio claims vs work history), reads no documents, searches nothing, decides nothing. Swap for the real agent behind the same input/output | `src/lib/verification/aiReview.ts` |
| Manager sign-up code | Generated, hashed and compared in the browser and shown on screen, like the referee's code | `src/lib/managers.ts` |
| Membership choice | The editor's Membership & review section sets `is_premium` directly; no payment is taken | `src/components/onboarding/MembershipSection.tsx` |
| AI matching | Placeholder JD extraction + placeholder Fit and preference adjustments (deterministic keyword matching) behind the real contract | `src/lib/matching/` (see Loop8 section; spec `docs/MavenScout-match-rework.md`) |
| Account ops | Email/password change forms render disabled | `src/pages/Account.tsx` |
| Brandfetch | Fully built; organization logos come from the organizations list through one hook (`orgLogoUrl`: explicit `logo_url`, else Brandfetch by primary domain). Dormant until a client id exists. Spec §8 wants logos in Supabase Storage: copy each into Storage and set `logo_url` | `src/lib/organizations.ts`, `src/lib/brandfetch.ts` (env var or localStorage `ms_brandfetch_client_id`) |
| Custom domains | Featured Members can save `profiles.custom_domain` in the editor; no DNS integration. Every personal site, custom domains included, keeps the "Listed on MavenScout" footer (spec §2.1) | `Onboarding.tsx` links section, `SitePage.tsx` |

## Pass 1 — Real authentication (Supabase Auth)

1. **Replace the session internals.** `src/lib/session.tsx` is the single mock: swap its
   internals for Supabase Auth (`supabase.auth.onAuthStateChange` → derive `role` from a
   profile/hiring_manager lookup on `user_id`). The `useSession()` surface
   (`{ role, isLoggedIn, hasAccess, manager, setRole→signOut }`) is what ~20 components consume — keep it and
   nothing else changes shape.
2. **Delete the switcher.** `DevRoleSwitcher.tsx` + its single mount in `AppLayout.tsx`.
   Nothing else references it.
3. **Identity constants.** `DEMO_HIRING_MANAGER_ID` / `getEditorProfileId()` in
   `session.tsx` stand in for "the current user's row." Replace call sites with lookups
   keyed on `auth.uid()`: openings/notes writes (`lib/openings.ts`,
   `SaveCandidateFlow.tsx`), editor profile resolution (`useEditorProfile.ts`), video
   requests (`lib/videoRequests.ts`), signup draft creation (`Signup.tsx` — also set
   `user_id` on insert). The manager pin (`ms_manager_id`, `signInAsManager`) becomes
   the signed-in user's `hiring_managers` row; keep `hasAccess` = an `active` account.
   Admin decisions record `DEMO_ADMIN_NAME`; record the real admin instead.
   Manager sign-up (`lib/managers.ts`) becomes a real Supabase Auth sign-up: send and
   verify the code server-side, and check the email domain against `organizations`
   on the server too.
4. **Foreign keys.** `profiles.user_id` and `hiring_managers.user_id` are plain nullable
   uuids (a real FK would have broken seeding). Add
   `REFERENCES auth.users(id)` once real users exist.
5. **RLS — the big one.** Every table in `000_schema.sql` has permissive
   `dev_read_*`/`dev_write_*` policies with a `-- PROD:` comment stating the intended
   policy. Replace them table by table; the comments are the spec. Special cases:
   - `profiles`: public SELECT only for `approved + active`; owner reads own row any
     state; admin all. App code already filters directory queries the same way — after
     RLS lands, that becomes defense in depth.
   - `audio_testimonials`: the referee pages (`/testimonial/:token`,
     `/testimonial/withdraw/:token`) are unauthenticated *by design*. Replace their raw
     table access (every function in `lib/testimonials/referee.ts` and the withdraw
     path in `lifecycle.ts`) with security-definer RPCs or edge functions keyed on the
     token, and close the table to anon. `testimonial_events` should be written only
     by those server-side steps; managers' listens likewise.
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
  `is_premium`. Everything downstream (publication gating, Featured treatment, browse
  placement, all caps) already keys off those two fields plus the Video Q&A count —
  no UI changes needed.
- Wire the disabled "Subscribe — coming soon" button and the editor's level choice
  (`MembershipSection.tsx`) to Stripe Checkout. Spec §2.2: a Featured Member is listed
  as a Member straight away, and **the higher fee starts only once all 5 Video Q&As
  are in** (`isFeatured`), so the price change follows the videos, not the choice.
- Replace the sample billing-history rows with real invoice data.
- The admin Tier tab's manual toggles were the billing stand-in; keep them as an
  operator override or remove.

## Security hardening checklist (flagged surfaces, PRD 7.6/7.20)

- [ ] **LAUNCH BLOCKER — personal data readable and the code check client-side.**
      Under the dev RLS, anyone with the anon key can read `profiles.email`, the
      referees' emails, names and titles in `audio_testimonials`, `hiring_managers.email`
      and every `testimonial_events` row (fingerprints included). The referee's
      "Confirm it's me" code is generated in the browser and checked against
      `code_hash`, which is readable too (a 6-digit hash is trivially brute-forced),
      so it proves nothing yet. Before launch: generate, email and verify codes
      server-side (single-use, ~10 minutes, attempt and send limits are already
      modelled in the columns), and close these reads with RLS.
- [ ] `/testimonial/:token` and `/testimonial/withdraw/:token` — unauthenticated
      pages **by design**. Validate tokens server-side, cap MIME/size at the storage
      policy, rate-limit, and consider expiring request tokens. The one-click
      manager account on the thank-you screen inserts `hiring_managers` from the
      browser; make it a real sign-up with the already-confirmed email.
- [ ] Testimonial audio is "streaming only" in the UI alone (no download control or
      context menu): the `audio-testimonials` bucket is public. Make it private and
      serve short-lived signed URLs to signed-in managers; log listens server-side.
- [ ] Testimonial audit fingerprints are browser-reported; capture the IP/network
      server-side (spec §4.6 rule 7).
- [ ] Recordings must be deleted when a consultant leaves (spec §4.7): deleting a
      profile cascades the rows but not the Storage objects.
- [ ] Storage buckets (`videos`, `audio-testimonials`, `resumes`) — currently public
      read + anon write. Scope writes to owners; make `resumes` private (signed URLs).
- [ ] **Verification evidence — the most sensitive data in the app** (employment
      letters, contracts, degree certificates; spec §3). Storage is deliberately
      **stubbed**: design it fresh — private bucket, admin-only access, delete after
      review. Do not simply "enable" uploads into the current dev posture.
- [ ] Profile minimums and the review gate (`lib/completeness.ts`) are app-side only;
      enforce them server-side (submission and approval) with real auth.
- [ ] **Hiring-manager sign-up.** The email code is client-side (as above for
      referees), so the institutional-email gate proves nothing yet; any account row
      can be set `active` with the anon key. Exception requests (name, email,
      organization, reason) and `hiring_managers.email` are readable under the dev
      RLS. Approved exceptions never confirmed their email: confirm it on approval.
- [ ] **Verification.** `verification_checks` (item snapshots, admin notes) and
      `verification_evidence` (file names, explanations) are readable and writable
      with the anon key, so labels can be forged. Admin decisions, ID-provider results
      and the re-check window must be written server-side only; public pages need just
      outcome + fingerprint per item (`useProfile` already selects only those
      columns). The ID/selfie provider and the AI review are placeholders.
- [ ] `/admin` — real access control (see Pass 1).
- [ ] Contact relay (`ContactModal.tsx`) — when wiring real email, keep the PRD rule:
      candidate addresses are never exposed to the client; relay server-side.
- [ ] **MUST KEEP — no email for demo data.** Nothing is ever sent (codes, notices,
      withdraw links, contact relays) for a testimonial or profile with
      `profiles.is_demo = true`. Demo referees have made-up addresses at real
      organization domains (e.g. `k.mensah@worldbank.org`), and such an address could
      belong to a real person. Today `sendMockEmail` (`lib/testimonials/outbox.ts`)
      logs these as `email_suppressed_demo` and fails closed when the profile can't be
      read. When real email is wired, enforce the same rule in the server-side sender
      too; a client-side check alone isn't enough.
- [ ] Grants: `000_schema.sql` ends with `GRANT ALL … TO anon` — narrow alongside RLS.

## Loop8 — swapping in the real matching engine

The contract is **§4 (extraction) and §6 (types, persistence) of
`docs/MavenScout-match-rework.md`**, which supersedes PRD §7.7. It's typed in
`src/lib/matching/types.ts`; replacing the engine touches nothing outside
`src/lib/matching/`.

- **Data the engine reads (profiles-membership §6, §8, §11; `data-foundations`):**
  - Expertise is **one list** (`taxonomy_items` under `taxonomy_categories` of type
    `expertise`): each item has a browsing group, a **kind** (sector / theme /
    method), `aliases` and `legacy_names`. Profiles tag items in
    `tiered_expertise` as Core (3) / Strong (5) / Working knowledge (≤10); the
    counts are `EXPERTISE_TIER_LIMITS` in `src/lib/config.ts`.
  - Requirement rows: kind `skill` and category-level rows are gone; an expertise
    row is `{ name, includeWorking? }`. Several Required expertise rows are **OR
    within a kind, AND across kinds**, counting Core + Strong (plus Working
    knowledge when the manager includes it) — `matchesExpertiseSelection` in
    `src/lib/expertise.ts`. Language rows carry `min` (`working` | `fluent`;
    Fluent satisfies Working).
  - `ExtractedRequirements` is `{ expertise, locations, languages,
    hiring_organization }` — one expertise list of items, no `skills`, no `level`.
    Runs saved before the list are read through `upgradeLegacyRequirements` /
    `upgradeLegacyExtracted` (nothing stored is rewritten).
  - Preference credits (`CREDIT` in `config.ts`): Core 1, Strong 0.75, Working 0.4,
    untagged mention 0.4; a row takes the better of its tag and text credit.
  - Fit inputs exclude video and audio transcripts (§11).
- **Two entry points, both placeholders today:**
  - `extractRequirements(jdText, ctx) → ExtractedRequirements` (`extract.ts`) — reads
    the JD **once** and returns *suggestions* (items from the unified expertise
    list with mention counts and a slight/strong lean, locations, languages,
    optional hiring org).
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
  recent `availability_updated_at` → id. Membership level never affects rank.
- **What stays app-side** (don't move it into the engine):
  - The requirements grid / filter-bar state (`src/lib/requirements/`). Required
    rows are evaluated by `applyMustHaves()` (`mustHaves.ts`), which reuses the
    directory filter logic exactly. It runs in the browser on the loaded pool
    today; it's the one place to turn into a database query when the pool grows.
  - The displayed build-up (`display.ts`: rows show their own points; Fit part +
    preferences = total, exactly) and persistence
    (`persist.ts`).
- **Org History:** the tiered `met` / `partial` (peer org) / `not_met` shape is the
  contract. Organization identity comes from the canonical organizations list
  (`src/lib/organizations.ts`: name, alias or country office, so "IBRD" = "World
  Bank Group"), with name matching for organizations not on it; peers count only
  if the manager types them — **suggesting peer organizations is the engine's job**. The row is only ever
  added deliberately (ethics note in the spec).
- **Loosening after a run** scores only the newly eligible candidates
  (`scoreNewcomers` in `persist.ts`). If the engine normalizes scores across the
  pool (e.g. percentile scaling), that has to become a full re-run — see the comment
  there.
- The placeholder Fit is calibrated in `config.ts` (`FIT_CALIBRATION`) against the
  sample ToR in `docs/samples/` — on-topic profiles ~75, related ~55, unrelated
  13–37. Real calibration is the engine's job.
- **Known gaps in the placeholder Fit** (profiles-membership §11), left for the
  engine rather than patched in the placeholder:
  - **Inputs.** §11's Fit inputs are bio, portfolio items, work history, education,
    certifications and expertise tags, never video or audio transcripts. The
    placeholder reads headline, bio, portfolio items and accreditations (`fit.ts`
    `evidenceText`); it does not read work history or education.
  - **Relevance, not volume.** Fit should judge each candidate's most relevant
    evidence the same way for everyone, so more items help only by offering more
    chances of a close fit. The placeholder scores the share of the JD's salient
    terms found anywhere in the candidate's pooled text, so every extra portfolio
    item can only add matches: the same profile with 10 items (7 off-topic) scores at
    least as high as with its 3 on-topic ones. §11 asks for a baseline test of
    exactly that case (3 vs 10 items must not rank higher); it isn't in
    `expectations.json` yet because the placeholder would fail it.
- **Open calibration question: "Strong" becomes rare with many preference rows.**
  Bands are fixed at Strong ≥ 80 / Good ≥ 65 / Partial ≥ 50 (`BAND_THRESHOLDS`),
  kept after the preference weighting because on the five sample ToRs they separate
  expected profiles from everyone else cleanly (Strong admits only expected
  profiles plus two clearly on-topic ones in tor-01 — a nutrition evaluator and,
  end to end, a research and evaluation firm working in health at exactly 80 — and only
  one expected profile per run falls below Good; see "Score distribution by
  role" in `docs/samples/ranking-baseline.md`). But with many Nice to have / Important
  rows, w hits the 20% cap and the earned ÷ possible ratio falls, because few
  candidates meet most of a long list: the Sahel ranking (Add all: 12 rows, 46 points
  possible) tops out at 77, so nobody there is Strong, although its #1 has Fit 83.
  The UI nudges managers ("Adding many preferences spreads their weight; keep the
  ones that matter" under Add all), but the engine should decide whether bands
  should account for the number of rows (or the ratio should be normalized), and
  re-check against the baseline.
- **Baseline to beat:** `npm run baseline` scores five sample ToRs
  (`docs/samples/tor-0*.txt`) against the live pool with the current engine and
  rewrites `docs/samples/ranking-baseline.md`: whether the expected profiles land in
  the top 5 / top 10 with fixed manager rows and end to end (extraction → Add all),
  deliberate test cases (wrong location, untagged evidence, current vs former staff,
  tie pairs, decoys), profile variants (one profile as Core / Strong / Working on an
  item; a Required language at Working under Fluent only) and extraction recall. Expectations live
  in `docs/samples/expectations.json`. The harness is read-only (SELECTs and in-memory
  `scorePool`); run it after every engine change.
- Narratives are templated (~100 words, grounded in the shown numbers); the engine
  supplies real ones.

## Demo data & placeholders to replace

- Fixed demo UUIDs (`aaaaaaaa-…`, `bbbbbbbb-…`, `cccccccc-…`) come from
  `003_seed_demo_accounts.sql` and are referenced in `session.tsx`.
- **The demo data is the step 5 re-seed** (profiles-membership §13 step 5):
  `supabase/018_reseed_demo_0.sql` → `_1` … `_4`, run after 017. Part 0 adds
  `hiring_managers.is_demo`, flags the demo managers and removes a test account;
  parts 1–4 are generated by `npm run demo:build` from
  `scripts/demo-seed/profiles/*.mjs` (edit those, never the SQL). The build validates
  every profile with the app's own rules before writing anything: completeness
  (bio, 3 Core / 5 Strong / ≤10 Working, languages, portfolio per level, the employer
  testimonial), verification labels, testimonial confirmation lines and referee email
  rules, Featured status and the listing rule. A baseline guard keeps each profile's
  role in `docs/samples/expectations.json` (no ToR item added as a tag to an existing
  profile, Required languages stay Fluent, tie pairs identical). The parts are
  idempotent: they upsert the profiles on id and replace their portfolio items,
  testimonials, Video Q&As and verification rows with fixed ids.
- **What it contains:** 98 listed individuals (the 92 that existed, ids and handles
  kept, plus six for tor-05), all `is_demo`. 24 are Featured Members with all five
  Video Q&A answers; every profile has a published testimonial on an employer entry
  (Featured: several, some on portfolio items) from a fictional referee at a real
  organization's domain, gender-matched randomuser.me photos (never repeated), and
  verification checks so labels show. Demo states for admin: four certifications
  Pending check (credential ID, in the queue), two with link-only evidence awaiting
  review, one profile in a re-check window (a new 2026 employer not yet checked). The
  23 firm profiles are untouched (hidden, `FIRMS_ENABLED = false`).
- **Demo media** (`scripts/demo-seed/media.mjs`, ffmpeg): six speech-free tone clips
  for testimonials (`audio-testimonials/demo/`) and five Video Q&A title cards marked
  "DEMO ANSWER — no real person" (`videos/demo/`), shared by every demo row; no real
  person's voice or likeness. `--upload` puts them in Storage; `--clean` lists (with
  `--yes`, deletes) leftover test uploads in demo profiles' folders. Transcripts are
  fictional and labelled "[Demo testimonial…]" / "[Demo answer]".
- **Demo email is never sent** — see the hardening checklist: demo referees have
  made-up addresses at real organization domains. Demo consultants' own emails use
  the reserved `example.org`.
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
- **Fresh projects:** `000_schema.sql` has the current shape, so the pre-spec seeds
  (`002`, the four `007` files, `scripts/demo-seed/build-007.mjs`, frozen) no longer
  load on it. They are kept as history. A fresh project needs the demo profiles
  created before 003's openings and 018 can run; until a fresh-install seed exists,
  copy the demo rows from an existing project.
- **Purging demo data:** `supabase/purge_demo.sql` deletes every `is_demo` hiring
  manager (cascading their openings, notes, shares, reviewer grants and rankings) and
  every `is_demo` profile (cascading portfolio, media rows, testimonials and their
  audit trail, verification rows, opening entries and match results). That includes
  `amara-diallo` and the `aaaaaaaa-…` managers behind the dev role switcher, which then
  has no rows to act as. Clear Storage first with
  `node scripts/demo-seed/media.mjs --clean --remove-demo --yes`. Run it only when real
  profiles and accounts replace the demo set.

## Known deliberate non-goals (don't "fix" these)

Per PRD Non-Goals/Decisions: no in-platform messaging, no interview scheduling, no
offer tracking, no per-item visibility controls, no multi-seat firm accounts, no
platform localization, single flat taxonomy per sector. The ATS surface intentionally
ends at post-interview note + score.
