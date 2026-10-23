-- 013: profiles & membership (docs/MavenScout-profiles-membership.md §13 step 2).
--
-- Run once in the Supabase SQL editor after 012. Safe to re-run: IF NOT EXISTS
-- on the new columns, and each backfill only touches rows it hasn't done yet.
--
-- ADDITIVE ONLY. Nothing is dropped, so code on main keeps working:
--   - portfolio_items.cover_image stays (main reads it); this branch reads the
--     cover as images[0] and keeps cover_image in step on save;
--   - intro and portfolio-kind video_responses rows stay (this branch no
--     longer reads them).
-- 014_cleanup_profiles_membership.sql removes them after the branch is merged.

-- ---------------------------------------------------------------------------
-- 1. Portfolio video link (§7.2): one YouTube or Vimeo link per item, for all
--    members. Replaces portfolio-attached video uploads. Host is app-checked.
-- ---------------------------------------------------------------------------
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS video_url text;

-- Existing portfolio-attached videos that are already YouTube/Vimeo links
-- carry over. Uploaded files can't become a link; 014 deletes those rows.
UPDATE portfolio_items pi
SET video_url = v.video_url
FROM video_responses v
WHERE v.kind = 'portfolio'
  AND v.portfolio_item_id = pi.id
  AND pi.video_url IS NULL
  AND v.video_url ~* '^https?://([a-z0-9-]+\.)*(youtube\.com|youtu\.be|vimeo\.com)/';

-- ---------------------------------------------------------------------------
-- 2. One image list (§7.2): `images` holds up to 3 {url, caption}, the first
--    is the cover. Put each item's cover_image first (keeping its caption if
--    it was already in the carousel). Items with more than 3 images keep them
--    all here; the app shows the first 3 and the editor asks for a trim.
-- ---------------------------------------------------------------------------
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
  AND images->0->>'url' IS DISTINCT FROM cover_image;

-- ---------------------------------------------------------------------------
-- 3. Submission (§7.1): the profile minimums are checked when a consultant
--    submits for review, and admin Approve waits for a complete profile.
--    NULL = still a draft. Profiles already reviewed count as submitted.
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

UPDATE profiles
SET submitted_at = created_at
WHERE submitted_at IS NULL
  AND approval_status IN ('approved', 'rejected');

-- New columns on existing tables inherit their RLS policies; nothing to add.
