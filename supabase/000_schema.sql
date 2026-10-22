-- ============================================================================
-- MavenScout — schema + RLS (run FIRST, before 001/002/003)
-- ============================================================================
-- Conventions:
--   * Each table is one block: CREATE TABLE → ENABLE ROW LEVEL SECURITY →
--     CREATE POLICY. No project-level auto-RLS trigger is assumed.
--   * AUTH IS MOCKED IN THIS BUILD (PRD 7.9): every client request uses the
--     anon key, so any policy referencing auth.uid() would silently return
--     zero rows / block every write and make the app read as "empty database".
--     Therefore every table gets PERMISSIVE DEV POLICIES, each annotated with
--     a "PROD:" comment stating the intended production policy from PRD §8.
--     The developer's real-auth pass replaces these placeholders wholesale.
--   * PRD-visibility (approved + active only in the directory, login gates,
--     /site stripping) is enforced in app-level queries this build.
--   * Enum-ish fields are text + CHECK (easier to evolve than PG enums).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- taxonomy_categories
-- ---------------------------------------------------------------------------
CREATE TABLE taxonomy_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 'expertise' = the unified list's browsing groups (011); the other two
  -- expertise types are LEGACY, kept for main and removed by 012.
  type       text NOT NULL CHECK (type IN ('domain_expertise','technical_skills','work_arrangement','expertise')),
  name       text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0
);
ALTER TABLE taxonomy_categories ENABLE ROW LEVEL SECURITY;
-- PROD: SELECT for everyone; INSERT/UPDATE/DELETE admin-only.
CREATE POLICY "dev_read_taxonomy_categories"  ON taxonomy_categories FOR SELECT USING (true);
CREATE POLICY "dev_write_taxonomy_categories" ON taxonomy_categories FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- taxonomy_items
-- ---------------------------------------------------------------------------
CREATE TABLE taxonomy_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES taxonomy_categories(id) ON DELETE CASCADE,
  name        text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  -- Unified expertise items (011): kind drives matching (OR within a kind, AND
  -- across kinds); aliases are search terms; legacy_names are the old item
  -- names folded in. NULL / empty for work arrangements.
  kind         text CHECK (kind IN ('sector','theme','method')),
  aliases      text[] NOT NULL DEFAULT '{}',
  legacy_names text[] NOT NULL DEFAULT '{}'
);
ALTER TABLE taxonomy_items ENABLE ROW LEVEL SECURITY;
-- PROD: SELECT for everyone; writes admin-only.
CREATE POLICY "dev_read_taxonomy_items"  ON taxonomy_items FOR SELECT USING (true);
CREATE POLICY "dev_write_taxonomy_items" ON taxonomy_items FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- interview_questions — the 5 Premium standard Video Q&A questions (PRD 7.5).
-- (The general "Tell us about yourself" intro is kind='intro' on
--  video_responses with a fixed UI label — it is NOT stored here.)
-- ---------------------------------------------------------------------------
CREATE TABLE interview_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  sort_order    int  NOT NULL DEFAULT 0,
  active        bool NOT NULL DEFAULT true
);
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
-- PROD: SELECT for everyone; writes admin-only.
CREATE POLICY "dev_read_interview_questions"  ON interview_questions FOR SELECT USING (true);
CREATE POLICY "dev_write_interview_questions" ON interview_questions FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- profiles — consultants and firms (one row per profile, PRD §8)
-- NOTE: user_id is a plain nullable uuid this build (no FK to auth.users —
-- auth is mocked and seeds set it NULL). Developer adds the FK + NOT NULL
-- semantics in the real-auth pass; column name/type won't change.
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       uuid,
  consultant_type               text NOT NULL CHECK (consultant_type IN ('Individual','Small Firm','Large Firm')),
  handle                        text NOT NULL UNIQUE,
  name                          text NOT NULL,
  headline                      text NOT NULL,                -- ~120 chars, app-enforced
  location                      text,                         -- free-form; filter options derived dynamically
  career_level                  text CHECK (career_level IN ('early_career','mid_career','senior')),  -- individuals only, NULL for firms
  year_founded                  int,                          -- firms only; app computes "X years in business"
  contracting_work_eligibility  text,                         -- ~300 chars, app-enforced; LOGIN-GATED display (PRD 7.18)
  work_types                    text[] NOT NULL DEFAULT '{}',
  part_time_availability        jsonb NOT NULL DEFAULT '{"status":"unavailable","from":null,"until":null}',
  full_time_availability        jsonb NOT NULL DEFAULT '{"status":"unavailable","from":null,"until":null}',
  availability_updated_at       timestamptz,
  photo_url                     text,
  cover_image_url               text,
  resume_path                   text,                         -- Supabase Storage path in the 'resumes' bucket (PDF upload)
  resume_url                    text,                         -- OR an external link — exactly one populated, app-enforced (same pattern as video_responses)
  detailed_bio                  text,
  expertise                     jsonb NOT NULL DEFAULT '[]',  -- LEGACY [{name, tier: primary|secondary, level}]; replaced by tiered_expertise (011), dropped by 012
  skills                        jsonb NOT NULL DEFAULT '[]',  -- LEGACY, same shape; dropped by 012
  tiered_expertise              jsonb NOT NULL DEFAULT '[]',  -- [{name, tier: core|strong|working}] from the unified list (011); 3/5/≤10 app-enforced
  accreditations                jsonb NOT NULL DEFAULT '[]',  -- [{name, issuing_organization, year, credential_id_or_url}]
  languages                     text[] NOT NULL DEFAULT '{}', -- LEGACY free-form list; replaced by spoken_languages (010), dropped by 012
  spoken_languages              jsonb NOT NULL DEFAULT '[]',  -- [{name, proficiency: fluent|working}] from `languages` table (010), max 10 app-enforced
  work_history                  jsonb NOT NULL DEFAULT '[]',  -- [{organization, organization_id?, role, start_year, end_year, logo_url, description}], max 10 app-enforced
  education_history             jsonb NOT NULL DEFAULT '[]',  -- [{institution, degree_or_course, start_year, end_year, logo_url}], max 5
  additional_experience         jsonb NOT NULL DEFAULT '[]',  -- [{organization, role, start_year, end_year, description}], max 5
  website_name                  text DEFAULT 'Personal website',
  website_url                   text,
  social_links                  jsonb NOT NULL DEFAULT '[]',  -- [{platform, label, url}], tier cap (2/5) app-enforced
  is_premium                    bool NOT NULL DEFAULT false,
  verification_status           text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','pending','verified')),
  custom_domain                 text,                         -- reserved; no live DNS integration this build
  subscription_status           text NOT NULL DEFAULT 'none' CHECK (subscription_status IN ('active','past_due','canceled','paused','none')),
  approval_status               text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  is_demo                       bool NOT NULL DEFAULT false,  -- seeded demo data (006); removed by purge_demo.sql
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- PROD: SELECT where approval_status='approved' AND subscription_status='active'
--       for anon/public; owner (auth.uid() = user_id) reads own row in any state;
--       admin reads all. Writes: owner updates own row; admin all; no public writes.
-- DEV:  permissive — admin queue, onboarding, and the editor all run on the anon
--       key while auth is mocked. Directory queries filter approved+active in app code.
CREATE POLICY "dev_read_profiles"  ON profiles FOR SELECT USING (true);
CREATE POLICY "dev_write_profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- keep updated_at honest on every UPDATE
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- taxonomy_requests — candidate-submitted new-item requests (PRD 7.14)
-- ---------------------------------------------------------------------------
CREATE TABLE taxonomy_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('domain_expertise','technical_skills','expertise')),  -- 'expertise' = unified list (011)
  proposed_name   text NOT NULL,
  proposed_parent text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE taxonomy_requests ENABLE ROW LEVEL SECURITY;
-- PROD: owner inserts/reads own; admin all.
CREATE POLICY "dev_read_taxonomy_requests"  ON taxonomy_requests FOR SELECT USING (true);
CREATE POLICY "dev_write_taxonomy_requests" ON taxonomy_requests FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- languages — canonical language list (profiles-membership §13 step 1).
-- Seeded by 010; profiles.spoken_languages names come from it.
-- ---------------------------------------------------------------------------
CREATE TABLE languages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,  -- standard English name: 'Haitian Creole', 'K''iche'''
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
-- PROD: SELECT for everyone; INSERT/UPDATE/DELETE admin-only.
CREATE POLICY "dev_read_languages"  ON languages FOR SELECT USING (true);
CREATE POLICY "dev_write_languages" ON languages FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- organizations — canonical organizations list (profiles-membership §8).
-- Seeded by 009; employers and clients link to it (portfolio_items.
-- organization_id, work_history[].organization_id) or stay free text.
-- ---------------------------------------------------------------------------
CREATE TABLE organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  aliases    text[] NOT NULL DEFAULT '{}',  -- short and former names: 'WB', 'IBRD', 'DFID'
  domains    text[] NOT NULL DEFAULT '{}',  -- web/email domains, primary first
  logo_url   text,                          -- explicit logo; NULL = from domains[0] via Brandfetch; '' = initials (orgLogoUrl)
  type       text NOT NULL CHECK (type IN ('multilateral','bilateral_donor','un_agency','ngo','government','private_firm','academic','foundation')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- PROD: SELECT for everyone; INSERT/UPDATE/DELETE admin-only.
CREATE POLICY "dev_read_organizations"  ON organizations FOR SELECT USING (true);
CREATE POLICY "dev_write_organizations" ON organizations FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- portfolio_items (PRD 7.2 / §8)
-- ---------------------------------------------------------------------------
CREATE TABLE portfolio_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  organization text,                          -- client/funder shown beside the dates
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,  -- set when picked from the list (009)
  start_year   int,
  end_year     int,                           -- NULL = ongoing; = start_year for a single year
  role         text NOT NULL,
  description  text NOT NULL,
  results      text,
  cover_image  text,
  images       jsonb NOT NULL DEFAULT '[]',  -- [{url, caption}] — carousel
  links        jsonb NOT NULL DEFAULT '[]',  -- [{label, url}], max 3 app-enforced
  sort_order   int NOT NULL DEFAULT 0
);
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
-- PROD: public SELECT (rides on parent profile's visibility); owner/admin writes.
CREATE POLICY "dev_read_portfolio_items"  ON portfolio_items FOR SELECT USING (true);
CREATE POLICY "dev_write_portfolio_items" ON portfolio_items FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- verification_evidence — ⚠ MOST SENSITIVE DATA IN THE APP (PRD 7.20).
-- Payslips / employment letters. In THIS build the upload is STUBBED:
-- file_path holds a placeholder string only — NO real file is persisted and
-- NO storage bucket exists for evidence. The developer's security pass must
-- design real storage (private bucket, strict access, retention policy)
-- before this feature touches real documents.
-- ---------------------------------------------------------------------------
CREATE TABLE verification_evidence (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_path   text NOT NULL,   -- STUB: placeholder path, no real file behind it this build
  explanation text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE verification_evidence ENABLE ROW LEVEL SECURITY;
-- PROD: owner inserts; ONLY owner + admin read; nobody else. Never public.
CREATE POLICY "dev_read_verification_evidence"  ON verification_evidence FOR SELECT USING (true);
CREATE POLICY "dev_write_verification_evidence" ON verification_evidence FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- video_responses — intro (public) / standard-question + portfolio (gated) (PRD 7.5)
-- Exactly one of video_url (pasted) / video_path (Storage upload) is populated —
-- app-enforced. duration_seconds = 0 means "URL-pasted, duration unknown".
-- ---------------------------------------------------------------------------
CREATE TABLE video_responses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind              text NOT NULL CHECK (kind IN ('intro','question','portfolio')),
  question_id       uuid REFERENCES interview_questions(id),   -- set when kind='question'
  portfolio_item_id uuid REFERENCES portfolio_items(id) ON DELETE SET NULL,  -- set when kind='portfolio'
  video_url         text,
  video_path        text,
  transcript        text,             -- feeds Demonstrated Experience matching (PRD 7.7)
  duration_seconds  int NOT NULL DEFAULT 0,   -- 2-min cap enforced client-side on upload
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE video_responses ENABLE ROW LEVEL SECURITY;
-- PROD: SELECT — intro rows public; question/portfolio rows require a logged-in
--       account (PRD 7.2a gating is a UI+RLS pair). Owner/admin writes.
-- DEV:  permissive; the 7.2a gate is enforced in app rendering this build.
CREATE POLICY "dev_read_video_responses"  ON video_responses FOR SELECT USING (true);
CREATE POLICY "dev_write_video_responses" ON video_responses FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- audio_testimonials (PRD 7.6)
-- ⚠ The reference-direct path (/testimonial/:token) INSERTs from an
-- unauthenticated context BY DESIGN. Before real deployment the developer
-- must harden: validate submission_token server-side, cap file type/size,
-- rate-limit, and scope the storage bucket policy.
-- ---------------------------------------------------------------------------
CREATE TABLE audio_testimonials (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  portfolio_item_id uuid REFERENCES portfolio_items(id) ON DELETE SET NULL,
  reference_name    text,
  reference_org     text,
  reference_title   text,
  relationship      text,
  reference_date    date,             -- month/year (day stored as 1)
  verification_url  text,             -- referee's institutional bio / LinkedIn etc.
  audio_path        text,             -- Supabase Storage path (real upload this build)
  transcript        text,             -- feeds Demonstrated Experience matching
  duration_seconds  int NOT NULL DEFAULT 0,  -- 2-min cap enforced client-side
  source            text NOT NULL CHECK (source IN ('reference_direct','candidate_upload')),
  submission_token  text UNIQUE,      -- set for the reference-direct path; NULL once you want the link dead
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','removed')),
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audio_testimonials ENABLE ROW LEVEL SECURITY;
-- PROD: SELECT published rows for logged-in accounts only (7.2a); owner sees own
--       in any status; admin all. INSERT: token-validated anon insert for the
--       reference-direct path (hardened), owner insert for candidate uploads.
CREATE POLICY "dev_read_audio_testimonials"  ON audio_testimonials FOR SELECT USING (true);
CREATE POLICY "dev_write_audio_testimonials" ON audio_testimonials FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- hiring_managers (PRD §8)
-- ---------------------------------------------------------------------------
CREATE TABLE hiring_managers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid,                  -- plain uuid this build; FK to auth.users in real-auth pass
  name         text NOT NULL,
  organization text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hiring_managers ENABLE ROW LEVEL SECURITY;
-- PROD: self read/write; reviewers' names readable by co-reviewers for attribution; admin all.
CREATE POLICY "dev_read_hiring_managers"  ON hiring_managers FOR SELECT USING (true);
CREATE POLICY "dev_write_hiring_managers" ON hiring_managers FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- openings — the organizing object of the HM workspace (PRD 7.4)
-- ---------------------------------------------------------------------------
CREATE TABLE openings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_manager_id uuid NOT NULL REFERENCES hiring_managers(id) ON DELETE CASCADE,
  name              text NOT NULL,
  description       text,
  deadline          date,
  is_default        bool NOT NULL DEFAULT false,  -- the always-present quick-save opening
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE openings ENABLE ROW LEVEL SECURITY;
-- PROD: owner + granted reviewers read/write per role; share-token path reads via
--       a security-definer function or filtered view, not raw table access.
CREATE POLICY "dev_read_openings"  ON openings FOR SELECT USING (true);
CREATE POLICY "dev_write_openings" ON openings FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- opening_entries — a candidate saved into an opening (PRD 7.4)
-- list_tag: top_pick (short list) implies favorite (long list) — app-enforced.
-- outreach_tag is an independent axis.
-- ---------------------------------------------------------------------------
CREATE TABLE opening_entries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_id           uuid NOT NULL REFERENCES openings(id) ON DELETE CASCADE,
  profile_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  list_tag             text NOT NULL DEFAULT 'favorite' CHECK (list_tag IN ('favorite','top_pick')),
  outreach_tag         text CHECK (outreach_tag IN ('contacted','interview_scheduled','interview_completed')),
  post_interview_note  text,
  post_interview_score int CHECK (post_interview_score BETWEEN 0 AND 5),
  added_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opening_id, profile_id)
);
ALTER TABLE opening_entries ENABLE ROW LEVEL SECURITY;
-- PROD: opening owner + granted reviewers; share-token read path as above.
CREATE POLICY "dev_read_opening_entries"  ON opening_entries FOR SELECT USING (true);
CREATE POLICY "dev_write_opening_entries" ON opening_entries FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- candidate_notes_scores — one row per (candidate-in-opening, author) (PRD 7.4)
-- Team average/ranking = aggregate of score across authors per opening_entry_id.
-- ---------------------------------------------------------------------------
CREATE TABLE candidate_notes_scores (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_entry_id uuid NOT NULL REFERENCES opening_entries(id) ON DELETE CASCADE,
  author_id        uuid NOT NULL REFERENCES hiring_managers(id) ON DELETE CASCADE,
  note             text,
  score            int CHECK (score BETWEEN 0 AND 5),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opening_entry_id, author_id)
);
ALTER TABLE candidate_notes_scores ENABLE ROW LEVEL SECURITY;
-- PROD: INSERT/UPDATE only by granted reviewers or the owner (the "participate"
--       permission, PRD 7.4); read follows the opening's visibility.
CREATE POLICY "dev_read_candidate_notes_scores"  ON candidate_notes_scores FOR SELECT USING (true);
CREATE POLICY "dev_write_candidate_notes_scores" ON candidate_notes_scores FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER candidate_notes_scores_updated_at BEFORE UPDATE ON candidate_notes_scores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- opening_shares — read-only view links; revoked_at set ⇒ the URL 404s (PRD 7.4)
-- ---------------------------------------------------------------------------
CREATE TABLE opening_shares (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_id  uuid NOT NULL REFERENCES openings(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz
);
ALTER TABLE opening_shares ENABLE ROW LEVEL SECURITY;
-- PROD: owner manages; anon may resolve a non-revoked token (that's the feature).
CREATE POLICY "dev_read_opening_shares"  ON opening_shares FOR SELECT USING (true);
CREATE POLICY "dev_write_opening_shares" ON opening_shares FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- opening_reviewers — explicit "participate" grants (PRD 7.4)
-- Enforcement is mocked this build; the table carries the grants now so
-- nothing reshapes when real auth lands.
-- ---------------------------------------------------------------------------
CREATE TABLE opening_reviewers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_id  uuid NOT NULL REFERENCES openings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES hiring_managers(id) ON DELETE CASCADE,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opening_id, reviewer_id)
);
ALTER TABLE opening_reviewers ENABLE ROW LEVEL SECURITY;
-- PROD: owner grants; reviewers read their own grants.
CREATE POLICY "dev_read_opening_reviewers"  ON opening_reviewers FOR SELECT USING (true);
CREATE POLICY "dev_write_opening_reviewers" ON opening_reviewers FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- job_descriptions — a ranking run (match rework spec §6.3). opening_id NULL =
-- transient ad-hoc directory ranking (not kept unless saved to an opening).
-- ---------------------------------------------------------------------------
CREATE TABLE job_descriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_manager_id   uuid NOT NULL REFERENCES hiring_managers(id) ON DELETE CASCADE,
  opening_id          uuid REFERENCES openings(id) ON DELETE CASCADE,
  raw_text            text NOT NULL,
  requirements        jsonb,          -- Requirement[]: grid rows the run was scored against (must-haves included)
  extracted           jsonb,          -- ExtractedRequirements: what extractRequirements read from the JD
  hiring_organization text,           -- legacy (pre-rework); the org now lives in the Org History row
  weights             jsonb DEFAULT '{}',  -- legacy (pre-rework slider weights); no longer written
  created_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY;
-- PROD: owner + granted reviewers of the linked opening.
CREATE POLICY "dev_read_job_descriptions"  ON job_descriptions FOR SELECT USING (true);
CREATE POLICY "dev_write_job_descriptions" ON job_descriptions FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- match_results — per-candidate output of a ranking run (match rework spec
-- §5.3, §6.1): total = (1 − w) × fit_score + 100 × w × earned ÷ possible, with
-- w = min(possible, 20) / 100 stored in `scoring`. narrative: ~100 words
-- (templated placeholder this build — real text comes with Loop8).
-- ---------------------------------------------------------------------------
CREATE TABLE match_results (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_description_id uuid NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  profile_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_score        int NOT NULL,    -- 0–100
  rank               int,             -- rank at run time
  band               text,            -- 'strong' | 'good' | 'partial' | 'weak'
  fit_score          int,             -- 0–100, the engine's holistic fit
  adjustments        jsonb,           -- Adjustment[]: one per Slight/Strong row
  scoring            jsonb,           -- {weight, earned, possible} (008)
  adjustments_capped bool,            -- legacy (pre-008 +20 cap); no longer written
  must_haves_passed  jsonb,           -- [{requirement_id, label}]
  sub_scores         jsonb DEFAULT '[]',  -- legacy (pre-rework component scores)
  narrative          text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_description_id, profile_id)
);
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
-- PROD: follows job_descriptions visibility; share-token viewers may read.
CREATE POLICY "dev_read_match_results"  ON match_results FOR SELECT USING (true);
CREATE POLICY "dev_write_match_results" ON match_results FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- video_response_requests — async "why this role" requests (PRD 7.17, P1 UI;
-- table ships now so the model is complete). Max 3 outstanding per opening
-- app-enforced. Candidate notification (email) is STUBBED this build.
-- ---------------------------------------------------------------------------
CREATE TABLE video_response_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_id         uuid NOT NULL REFERENCES openings(id) ON DELETE CASCADE,
  job_description_id uuid REFERENCES job_descriptions(id) ON DELETE SET NULL,
  profile_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_by       uuid NOT NULL REFERENCES hiring_managers(id) ON DELETE CASCADE,
  prompt             text NOT NULL DEFAULT 'Why do you want this role, and why do you believe you''d excel in it?',
  status             text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','submitted','declined')),
  video_url          text,
  video_path         text,
  duration_seconds   int,             -- 5-min cap enforced client-side
  created_at         timestamptz NOT NULL DEFAULT now(),
  submitted_at       timestamptz
);
ALTER TABLE video_response_requests ENABLE ROW LEVEL SECURITY;
-- PROD: requesting manager + the asked candidate only.
CREATE POLICY "dev_read_video_response_requests"  ON video_response_requests FOR SELECT USING (true);
CREATE POLICY "dev_write_video_response_requests" ON video_response_requests FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- Storage buckets — videos + audio are REAL uploads this build (PRD 7.5/7.6).
-- Deliberately NO bucket for verification evidence (stubbed — see table note).
-- ⚠ DEV policies below allow anon read/upload to both buckets. The developer's
--   hardening pass must scope these (esp. the unauthenticated testimonial path:
--   token validation, MIME/size caps, rate-limiting).
-- ============================================================================
-- 'resumes' holds candidate CV PDFs. Public-read in dev like the others;
-- PROD: résumés are personal documents — the hardening pass should make this
-- bucket private and serve downloads via short-lived signed URLs, scoped to
-- logged-in hiring accounts.
INSERT INTO storage.buckets (id, name, public) VALUES
  ('videos', 'videos', true),
  ('audio-testimonials', 'audio-testimonials', true),
  ('resumes', 'resumes', true);

CREATE POLICY "dev_storage_read"   ON storage.objects FOR SELECT
  USING (bucket_id IN ('videos','audio-testimonials','resumes'));
CREATE POLICY "dev_storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('videos','audio-testimonials','resumes'));
CREATE POLICY "dev_storage_update" ON storage.objects FOR UPDATE
  USING (bucket_id IN ('videos','audio-testimonials','resumes'));
CREATE POLICY "dev_storage_delete" ON storage.objects FOR DELETE
  USING (bucket_id IN ('videos','audio-testimonials','resumes'));

-- ============================================================================
-- Table-level privileges — required in addition to the RLS policies above.
-- This project does not auto-grant privileges on tables created in the SQL
-- editor, so without these every anon request fails with 42501 "permission
-- denied" before RLS is even evaluated. GRANT ALL matches the permissive dev
-- policies (auth is mocked, anon does the writes); the developer's real-auth
-- pass should narrow these alongside the policies.
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
