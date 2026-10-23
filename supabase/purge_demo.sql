-- Purge ALL demo data: every profile and hiring manager with is_demo = true.
--
-- Profiles: the demo individuals re-seeded by 018 (the original 15 from 002,
-- the demo-* profiles from 007 and the six added in 018) and the hidden firm
-- profiles. Every child row cascades: portfolio items, Video Q&As, audio
-- testimonials and their audit events, verification checks and evidence,
-- taxonomy requests, opening entries (with their notes and scores), match
-- results and video response requests.
--
-- Hiring managers (018 adds the flag): the role switcher's demo hiring
-- manager, the two colleague reviewers, and referees' one-click accounts
-- made from demo profiles' testimonials. Their openings (with entries,
-- notes, scores, shares and reviewer grants), job descriptions, rankings and
-- video requests cascade.
--
-- ⚠ After a purge the dev role switcher has no rows behind it: the consultant
--   role's profile (amara-diallo, UUID hardcoded in src/lib/session.tsx) and
--   the hiring-manager and reviewer roles (aaaaaaaa-…-0001 to -0003) are gone,
--   so saving, ranking and openings fail until real accounts exist (or the
--   three hiring_managers rows from 003_seed_demo_accounts.sql are re-inserted).
--
-- Storage objects are not deleted by this query. Clear them first, while the
-- demo profiles still exist, in the dashboard or with
--   node scripts/demo-seed/media.mjs --clean --remove-demo --yes
-- (uploads in the folders named after demo profile ids, and the demo clips
-- under audio-testimonials/demo/ and videos/demo/; without --yes it only lists).

BEGIN;

DO $purge$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hiring_managers' AND column_name = 'is_demo') THEN
    DELETE FROM hiring_managers WHERE is_demo;
  END IF;
END $purge$;

DELETE FROM profiles WHERE is_demo;

COMMIT;
