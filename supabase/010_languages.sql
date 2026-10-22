-- 010: canonical language list, and the languages each expert speaks with a
-- proficiency (docs/MavenScout-profiles-membership.md §13 step 1).
--
-- Run once in the Supabase SQL editor after 009. Safe to re-run: IF NOT EXISTS
-- throughout, policies dropped and re-created, inserts ON CONFLICT DO NOTHING,
-- and the backfill only fills profiles whose spoken_languages is still empty.
--
-- ADDITIVE ONLY. profiles.languages (text[]) is left exactly as it is, so code
-- on main keeps working; this branch reads and writes the new
-- profiles.spoken_languages instead. 012_cleanup_legacy_data.sql drops
-- profiles.languages after the branch is merged.

-- ---------------------------------------------------------------------------
-- languages — the canonical list experts pick from. Seeded wide (140 names,
-- including every language already in profile data); admins add more.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS languages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,  -- standard English name: 'Haitian Creole', 'K''iche'''
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
-- PROD: SELECT for everyone; INSERT/UPDATE/DELETE admin-only.
DROP POLICY IF EXISTS "dev_read_languages"  ON languages;
DROP POLICY IF EXISTS "dev_write_languages" ON languages;
CREATE POLICY "dev_read_languages"  ON languages FOR SELECT USING (true);
CREATE POLICY "dev_write_languages" ON languages FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON languages TO anon, authenticated;

INSERT INTO languages (name) VALUES
  ($$Afar$$), ($$Afrikaans$$), ($$Albanian$$), ($$Amharic$$), ($$Arabic$$), ($$Armenian$$), ($$Aymara$$), ($$Azerbaijani$$),
  ($$Balochi$$), ($$Bambara$$), ($$Belarusian$$), ($$Bemba$$), ($$Bengali$$), ($$Bislama$$), ($$Bosnian$$), ($$Bulgarian$$),
  ($$Burmese$$), ($$Cantonese$$), ($$Catalan$$), ($$Cebuano$$), ($$Chichewa$$), ($$Croatian$$), ($$Czech$$), ($$Danish$$),
  ($$Dari$$), ($$Dinka$$), ($$Dutch$$), ($$Dyula$$), ($$Dzongkha$$), ($$English$$), ($$Estonian$$), ($$Ewe$$),
  ($$Fijian$$), ($$Filipino$$), ($$Finnish$$), ($$Fon$$), ($$French$$), ($$Fula$$), ($$Ga$$), ($$Georgian$$),
  ($$German$$), ($$Greek$$), ($$Guaraní$$), ($$Gujarati$$), ($$Haitian Creole$$), ($$Hausa$$), ($$Hebrew$$), ($$Hindi$$),
  ($$Hmong$$), ($$Hungarian$$), ($$Igbo$$), ($$Ilocano$$), ($$Indonesian$$), ($$Italian$$), ($$Japanese$$), ($$Javanese$$),
  ($$K'iche'$$), ($$Kannada$$), ($$Kanuri$$), ($$Kaqchikel$$), ($$Kazakh$$), ($$Khmer$$), ($$Kikuyu$$), ($$Kinyarwanda$$),
  ($$Kirundi$$), ($$Korean$$), ($$Krio$$), ($$Kurdish$$), ($$Kyrgyz$$), ($$Lao$$), ($$Latvian$$), ($$Lingala$$),
  ($$Lithuanian$$), ($$Luganda$$), ($$Luo$$), ($$Macedonian$$), ($$Malagasy$$), ($$Malay$$), ($$Malayalam$$), ($$Mandarin$$),
  ($$Mandinka$$), ($$Māori$$), ($$Marathi$$), ($$Mongolian$$), ($$Mooré$$), ($$Nahuatl$$), ($$Nepali$$), ($$Norwegian$$),
  ($$Nuer$$), ($$Odia$$), ($$Oromo$$), ($$Pashto$$), ($$Persian$$), ($$Polish$$), ($$Portuguese$$), ($$Punjabi$$),
  ($$Q'eqchi'$$), ($$Quechua$$), ($$Rohingya$$), ($$Romanian$$), ($$Russian$$), ($$Samoan$$), ($$Sango$$), ($$Saraiki$$),
  ($$Serbian$$), ($$Shona$$), ($$Sindhi$$), ($$Sinhala$$), ($$Slovak$$), ($$Slovenian$$), ($$Solomon Islands Pijin$$), ($$Somali$$),
  ($$Soninke$$), ($$Sotho$$), ($$Spanish$$), ($$Swahili$$), ($$Swedish$$), ($$Tajik$$), ($$Tamazight$$), ($$Tamil$$),
  ($$Telugu$$), ($$Tetum$$), ($$Thai$$), ($$Tibetan$$), ($$Tigrinya$$), ($$Tok Pisin$$), ($$Tongan$$), ($$Tsonga$$),
  ($$Tswana$$), ($$Turkish$$), ($$Turkmen$$), ($$Twi$$), ($$Ukrainian$$), ($$Urdu$$), ($$Uzbek$$), ($$Vietnamese$$),
  ($$Wolof$$), ($$Xhosa$$), ($$Yoruba$$), ($$Zulu$$)
ON CONFLICT (name) DO NOTHING;

-- Any language already written on a profile joins the list, so nothing in the
-- data falls outside it.
INSERT INTO languages (name)
SELECT DISTINCT trim(l) FROM profiles p, unnest(p.languages) AS l
WHERE trim(l) <> ''
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- profiles.spoken_languages — [{name, proficiency: 'fluent' | 'working'}],
-- names from the list above, max 10 app-enforced (spec §7.1). Fluent satisfies
-- a Working requirement. Backfilled from profiles.languages, every language at
-- Fluent (nothing in the data says otherwise), in the original order.
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spoken_languages jsonb NOT NULL DEFAULT '[]';

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
WHERE p.spoken_languages = '[]'::jsonb AND cardinality(p.languages) > 0;

-- ---------------------------------------------------------------------------
-- 009 follow-up: logo overrides found when checking every seeded logo.
-- '' = show initials, for domains Brandfetch maps to another brand (europa.eu
-- returns the EIT's logo; mfat.govt.nz a photo). WWF's and Global Affairs
-- Canada's own domains have no Brandfetch logo, so use one that does. Only
-- fills logos no admin has set.
-- ---------------------------------------------------------------------------
UPDATE organizations SET logo_url = ''
WHERE name IN ('European Union', 'New Zealand Ministry of Foreign Affairs and Trade') AND logo_url IS NULL;
UPDATE organizations SET logo_url = 'https://cdn.brandfetch.io/worldwildlife.org'
WHERE name = 'WWF' AND logo_url IS NULL;
UPDATE organizations SET logo_url = 'https://cdn.brandfetch.io/canada.ca'
WHERE name = 'Global Affairs Canada' AND logo_url IS NULL;
