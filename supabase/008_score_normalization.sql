-- 008: preference weighting replaces the +20 cap (docs/MavenScout-match-rework.md §5.3).
--
-- Run once in the Supabase SQL editor on a database that already ran 000–007.
-- Safe to re-run: the column uses IF NOT EXISTS, and the delete only touches
-- runs scored under the old formula (results without `scoring`), which new
-- runs never produce.
-- On a fresh project, 000 already creates the column, so the ALTER is a no-op.

-- 1. match_results.scoring ------------------------------------------------------
-- { weight, earned, possible }: how preferences were weighed for this result.
--   weight   = min(possible, PREFERENCE_CAP_POINTS) / 100   (0 = no applicable rows)
--   earned   = Σ points earned by applicable Nice to have / Important rows
--   possible = Σ full points of those rows (not-applicable rows excluded)
--   total    = (1 − weight) × fit_score + 100 × weight × earned ÷ possible
-- Stored so a saved run shows the same build-up even if config.ts changes.
-- adjustments_capped (the old +20 cap flag) stays as a legacy column, like
-- sub_scores; new code no longer writes it.

ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS scoring jsonb;

-- 2. Drop rankings scored under the old formula --------------------------------
-- Their totals (Fit + capped adjustments, clamped at 100) can't be shown in
-- the new build-up. This includes the Sahel opening's ranking and any ad-hoc
-- runs. Re-create the Sahel ranking through the UI as described in
-- docs/DEVELOPER-HANDOFF.md. match_results rows cascade;
-- video_response_requests.job_description_id is set to NULL, so video
-- requests themselves are kept.

DELETE FROM job_descriptions jd
WHERE EXISTS (
  SELECT 1 FROM match_results mr
  WHERE mr.job_description_id = jd.id AND mr.scoring IS NULL
);
