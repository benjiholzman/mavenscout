-- 005: match rework (docs/MavenScout-match-rework.md §6.3).
--
-- Run once in the Supabase SQL editor on a database that already ran 000–004.
-- Safe to re-run: columns use IF NOT EXISTS, the NOT NULL drops are no-ops the
-- second time, and the delete only touches legacy rows.
-- On a fresh project, 000 already creates the columns, so the ALTERs are no-ops.
--
-- (The spec names this file 004_match_rework.sql; 004 was already taken by
-- 004_portfolio_org_and_logos.sql, so it runs as 005.)

-- 1. job_descriptions: the requirements model replaces weights ----------------
-- requirements: Requirement[] — the grid rows (must-haves included) the run was
--   scored against; also what reloads the filter bar from ?ranking=<id>.
-- extracted: ExtractedRequirements — what extractRequirements read from the JD.
-- hiring_organization and weights stay for legacy rows; new code stops writing
-- them (the org name now lives inside the Organizational History row).

ALTER TABLE job_descriptions
  ADD COLUMN IF NOT EXISTS requirements jsonb,
  ADD COLUMN IF NOT EXISTS extracted    jsonb;

ALTER TABLE job_descriptions ALTER COLUMN weights DROP NOT NULL;

-- 2. match_results: additive score breakdown -----------------------------------
-- total_score = clamp(fit_score + capped adjustments, 0, 100).
-- rank: rank at run time (the directory renumbers by position when must-haves
--   are tightened afterwards). band: 'strong' | 'good' | 'partial' | 'weak'.
-- adjustments: Adjustment[] (one per Slight/Strong row). must_haves_passed:
--   [{requirement_id, label}]. sub_scores stays for legacy rows only.

ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS rank               int,
  ADD COLUMN IF NOT EXISTS band               text,
  ADD COLUMN IF NOT EXISTS fit_score          int,
  ADD COLUMN IF NOT EXISTS adjustments        jsonb,
  ADD COLUMN IF NOT EXISTS adjustments_capped bool,
  ADD COLUMN IF NOT EXISTS must_haves_passed  jsonb;

ALTER TABLE match_results ALTER COLUMN sub_scores DROP NOT NULL;

-- 3. Drop legacy rankings --------------------------------------------------------
-- Rankings made under the old slider model (no requirements) can't be shown in
-- the new breakdown. This includes the Sahel opening's ranking, which the app
-- created at runtime (it was never in the seed files). Re-create it by opening
-- "Senior M&E Consultant — Sahel Resilience Program" → Rank candidates, as
-- described in docs/DEVELOPER-HANDOFF.md.
-- match_results rows cascade; video_response_requests.job_description_id is set
-- to NULL (ON DELETE SET NULL), so video requests themselves are kept.

DELETE FROM job_descriptions WHERE requirements IS NULL;
