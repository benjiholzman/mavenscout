-- 014: remove the structures replaced by 013
-- (docs/MavenScout-profiles-membership.md §13 step 2).
--
-- ⚠ RUN ONLY AFTER THE profiles-membership BRANCH IS MERGED AND DEPLOYED.
-- 013 was additive so code on main kept working during the branch; this file
-- removes what that code still reads (portfolio_items.cover_image, intro and
-- portfolio-kind video_responses). Code from before the merge breaks once it
-- has run.
--
-- Safe to re-run: the straggler sync only touches rows it hasn't done, and
-- the rest uses IF EXISTS / drop-and-add.
--
-- Seed files: 002_seed_profiles.sql, the 007 demo seeds and
-- scripts/demo-seed write cover_image and intro videos. They predate this
-- spec and are replaced by the step 5 re-seed (018_reseed_demo_*.sql); don't re-run them after 014.
--
-- Storage: SQL can't delete Storage objects. Before running, list any
-- uploaded intro / portfolio videos and remove those files from the 'videos'
-- bucket in the dashboard (at the time of writing there were none: the four
-- intro videos are YouTube links):
--
--   SELECT kind, profile_id, video_path FROM video_responses
--   WHERE kind IN ('intro', 'portfolio') AND video_path IS NOT NULL;

DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio_items' AND column_name = 'video_url')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'submitted_at') THEN
    RAISE EXCEPTION '014 needs 013 first (portfolio_items.video_url / profiles.submitted_at are missing)';
  END IF;
END
$guard$;

-- 1. Stragglers: items saved by code from before the merge may have a cover
--    that isn't first in `images`, and portfolio video links added as
--    video_responses. Sync them once more, with 013's rules.
DO $sync$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio_items' AND column_name = 'cover_image') THEN
    EXECUTE $q$
      UPDATE portfolio_items
      SET images =
        jsonb_build_array(
          coalesce(
            (SELECT e FROM jsonb_array_elements(images) AS e WHERE e->>'url' = cover_image LIMIT 1),
            jsonb_build_object('url', cover_image, 'caption', NULL)
          )
        )
        || coalesce(
          (SELECT jsonb_agg(e ORDER BY o)
           FROM jsonb_array_elements(images) WITH ORDINALITY AS t(e, o)
           WHERE e->>'url' IS DISTINCT FROM cover_image),
          '[]'::jsonb
        )
      WHERE coalesce(cover_image, '') <> ''
        AND images->0->>'url' IS DISTINCT FROM cover_image
    $q$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_responses' AND column_name = 'portfolio_item_id') THEN
    EXECUTE $q$
      UPDATE portfolio_items pi
      SET video_url = v.video_url
      FROM video_responses v
      WHERE v.kind = 'portfolio'
        AND v.portfolio_item_id = pi.id
        AND pi.video_url IS NULL
        AND v.video_url ~* '^https?://([a-z0-9-]+\.)*(youtube\.com|youtu\.be|vimeo\.com)/'
    $q$;
  END IF;
END
$sync$;

-- 2. The intro video (removed for everyone) and portfolio-attached videos
--    (now portfolio_items.video_url). Only Video Q&A answers remain.
DELETE FROM video_responses WHERE kind IN ('intro', 'portfolio');

ALTER TABLE video_responses DROP CONSTRAINT IF EXISTS video_responses_kind_check;
ALTER TABLE video_responses ADD CONSTRAINT video_responses_kind_check CHECK (kind IN ('question'));
ALTER TABLE video_responses DROP COLUMN IF EXISTS portfolio_item_id;

-- 3. The cover is images[0].
ALTER TABLE portfolio_items DROP COLUMN IF EXISTS cover_image;
