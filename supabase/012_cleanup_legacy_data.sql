-- 012: remove the legacy structures replaced by 009–011
-- (docs/MavenScout-profiles-membership.md §13 step 1).
--
-- ⚠ RUN ONLY AFTER THE data-foundations BRANCH IS MERGED AND DEPLOYED.
-- 009–011 were additive so code on main kept working during the branch; this
-- file removes what main still reads (profiles.languages, profiles.expertise,
-- profiles.skills and the old Domain Expertise / Technical Skills taxonomies).
-- Code from before the merge breaks once it has run.
--
-- Safe to re-run: steps that read the old columns only run while they exist,
-- and the rest use IF EXISTS / drop-and-add.
--
-- Kept on purpose: taxonomy_items.legacy_names (saved rankings still name old
-- items and are read through it), work_history[].logo_url (manual logos for
-- organizations not on the list), and saved rankings themselves (their rows
-- and scores display as they were scored).

DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'tiered_expertise')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'spoken_languages') THEN
    RAISE EXCEPTION '012 needs 010 and 011 first (profiles.spoken_languages / profiles.tiered_expertise are missing)';
  END IF;
END
$guard$;

-- 1. Stragglers: profiles created or edited on main during the branch have
--    old-style data only. Migrate them once more, with the same rules.
DO $sync$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'languages') THEN
    EXECUTE $q$
      UPDATE profiles p
      SET spoken_languages = (
        SELECT coalesce(jsonb_agg(jsonb_build_object('name', d.name, 'proficiency', 'fluent') ORDER BY d.ord), '[]'::jsonb)
        FROM (
          SELECT DISTINCT ON (trim(u.l)) trim(u.l) AS name, u.ord
          FROM unnest(p.languages) WITH ORDINALITY AS u(l, ord)
          WHERE trim(u.l) <> ''
          ORDER BY trim(u.l), u.ord
        ) d
      )
      WHERE p.spoken_languages = '[]'::jsonb AND cardinality(p.languages) > 0
    $q$;
    EXECUTE $q$
      INSERT INTO languages (name)
      SELECT DISTINCT l->>'name' FROM profiles, jsonb_array_elements(spoken_languages) AS l
      ON CONFLICT (name) DO NOTHING
    $q$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'expertise')
     AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'ms_migrate_expertise') THEN
    EXECUTE $q$
      UPDATE profiles SET tiered_expertise = ms_migrate_expertise(id)
      WHERE tiered_expertise = '[]'::jsonb AND (expertise <> '[]'::jsonb OR skills <> '[]'::jsonb)
    $q$;
  END IF;
END
$sync$;

-- 2. Requests made against the old lists join the unified list's queue
--    (the admin picks the group when approving).
UPDATE taxonomy_requests SET type = 'expertise', proposed_parent = NULL
WHERE type IN ('domain_expertise', 'technical_skills');

-- 3. The old columns.
ALTER TABLE profiles
  DROP COLUMN IF EXISTS languages,
  DROP COLUMN IF EXISTS expertise,
  DROP COLUMN IF EXISTS skills;

-- 4. The old taxonomies (their items go with them, ON DELETE CASCADE).
DELETE FROM taxonomy_categories WHERE type IN ('domain_expertise', 'technical_skills');

ALTER TABLE taxonomy_categories DROP CONSTRAINT IF EXISTS taxonomy_categories_type_check;
ALTER TABLE taxonomy_categories ADD CONSTRAINT taxonomy_categories_type_check
  CHECK (type IN ('work_arrangement', 'expertise'));
ALTER TABLE taxonomy_requests DROP CONSTRAINT IF EXISTS taxonomy_requests_type_check;
ALTER TABLE taxonomy_requests ADD CONSTRAINT taxonomy_requests_type_check
  CHECK (type IN ('expertise'));

-- 5. The migration helpers from 011.
DROP FUNCTION IF EXISTS ms_migrate_expertise(uuid);
DROP FUNCTION IF EXISTS ms_norm(text);
