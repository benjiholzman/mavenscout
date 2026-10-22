-- 006: is_demo flag for removable demo data.
--
-- Run once in the Supabase SQL editor on a database that already ran 000–005,
-- BEFORE the 007_seed_demo_profiles_*.sql files (they check for this column).
-- Safe to re-run: the column uses IF NOT EXISTS, the flag update is a no-op the
-- second time, and the location fixes only match the old values.
-- On a fresh project, 000 already creates the column, so the ALTER is a no-op.

-- 1. The flag -----------------------------------------------------------------
-- true = seeded demo data. supabase/purge_demo.sql deletes every flagged
-- profile (and, by cascade, everything hanging off it).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_demo bool NOT NULL DEFAULT false;

-- 2. The original 15 seeded profiles (002) are demo data too ------------------

UPDATE profiles SET is_demo = true
WHERE is_demo = false
  AND handle IN (
    $$amara-diallo$$, $$dr-priya-nair$$, $$james-okafor$$, $$sofia-reyes$$,
    $$lena-hoffmann$$, $$tariq-hassan$$, $$mei-ling-chen$$, $$dr-kwame-asante$$,
    $$fatima-al-rashid$$, $$rohan-mehta$$, $$ifeoma-obi-and-associates$$,
    $$pablo-vargas$$, $$northstar-advisory-group$$, $$ecoclimate-partners$$,
    $$dr-sunita-patel$$
  );

-- 3. Location convention: "City, Country" with common English country names --
-- (scripts/demo-seed/vocab.mjs holds the canonical list). Two of the original
-- 15 used abbreviations.

UPDATE profiles SET location = $$Washington DC, United States$$
WHERE handle = $$northstar-advisory-group$$ AND location = $$Washington DC, USA$$;

UPDATE profiles SET location = $$London, United Kingdom$$
WHERE handle = $$ecoclimate-partners$$ AND location = $$London, UK$$;
