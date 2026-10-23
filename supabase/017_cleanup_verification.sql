-- 017: remove profiles.verification_status
-- (docs/MavenScout-profiles-membership.md §2.2, §3; §13 step 4).
--
-- ⚠ RUN ONLY AFTER THE verification BRANCH IS MERGED AND DEPLOYED.
-- verification_status was the removed "Verified" badge's field, set by hand in
-- the admin Tiers tab. Verification now comes from verification_checks (016):
-- per-item labels, worked out from the audit record. Nothing in the merged
-- code reads or writes the column (src/, scripts/, .design-sync/previews);
-- code from before the merge still shows it in the Tiers tab, so that breaks
-- once this has run.
--
-- Nothing to migrate: the old values ('unverified' / 'pending' / 'verified')
-- were never checks, so they don't become labels.
--
-- Seed files: 002_seed_profiles.sql and the 007 demo seeds write the column.
-- They predate this spec and are replaced by the step 5 re-seed (018); don't re-run
-- them after 017.
--
-- Safe to re-run (IF EXISTS).

DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_checks') THEN
    RAISE EXCEPTION '017 needs 016 first (verification_checks is missing)';
  END IF;
END
$guard$;

ALTER TABLE profiles DROP COLUMN IF EXISTS verification_status;
