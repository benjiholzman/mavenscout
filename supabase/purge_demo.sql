-- Purge ALL demo data: every profile with is_demo = true.
--
-- That is the 100 synthetic demo-* profiles (007) AND the original 15 seeded
-- profiles (002, flagged by 006). Every child row cascades: portfolio items,
-- videos, audio testimonials, verification evidence, taxonomy requests,
-- opening entries (with their notes/scores), match results, and video
-- response requests.
--
-- ⚠ This includes amara-diallo, the dev role switcher's demo-consultant
--   identity (UUID hardcoded in src/lib/session.ts), and every candidate saved
--   in the seeded "Sahel Resilience Program" opening. After a purge the
--   consultant role has no profile behind it until real data exists. Hiring
--   managers, openings and job descriptions are kept (they hold no demo flag).
--
-- Storage objects (uploaded videos/audio) are not deleted by this query.

DELETE FROM profiles WHERE is_demo;
