-- 019: preferences-only ranking (docs/MavenScout-match-rework.md §11).
--
-- Run once in the Supabase SQL editor on a database that already ran 000–018.
-- Additive and safe to re-run: IF NOT EXISTS, and existing runs default to 'jd'.
-- On a fresh project, 000 already creates the column, so this is a no-op.
--
-- job_descriptions.mode — how a run was scored:
--   'jd'          → a job description was read; rankPool (the engine) scored
--                   Fit + preferences, with bands and a narrative.
--   'preferences' → no job description; scored app-side as the share of
--                   preference points met. raw_text = '' and extracted = NULL;
--                   match_results.band and fit_score are NULL. The engine is
--                   never called for these runs.

ALTER TABLE job_descriptions
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'jd';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_descriptions_mode_check') THEN
    ALTER TABLE job_descriptions
      ADD CONSTRAINT job_descriptions_mode_check CHECK (mode IN ('jd', 'preferences'));
  END IF;
END $$;
