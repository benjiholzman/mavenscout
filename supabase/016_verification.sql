-- 016: hiring-manager accounts and verification
-- (docs/MavenScout-profiles-membership.md §3, §9, §10, §13 step 4).
--
-- Run once in the Supabase SQL editor after 015. Safe to re-run: IF NOT EXISTS
-- on every new column, table and index, policies dropped and re-created, and
-- the id backfills only touch entries without an id.
--
-- ADDITIVE ONLY. Nothing is dropped or renamed, so code on main keeps working.
-- Two NOT NULLs on verification_evidence are relaxed (link-only evidence has
-- no file, and the explanation is optional); nothing on main writes nulls.
-- profiles.verification_status (the removed Verified badge's field) stays
-- until 017_cleanup_verification.sql, run after this branch is merged.
--
-- ⚠ SECURITY (dev posture, flagged for the hardening pass): the new columns
-- and tables inherit the permissive dev policies, so manager emails, exception
-- requests, the code hash and the verification audit (item snapshots
-- included) are readable with the anon key, and the manager's email code is
-- checked client-side like the referee's. Evidence storage stays stubbed: no
-- document is ever stored in this build.

-- ---------------------------------------------------------------------------
-- 1. Stable ids on education entries and certifications, so a verification
--    check can point at one (work-history entries got theirs in 015). The
--    editor assigns ids to new entries and keeps them through edits. The
--    updated_at trigger is paused so the backfill doesn't look like edits.
-- ---------------------------------------------------------------------------
ALTER TABLE profiles DISABLE TRIGGER profiles_updated_at;

UPDATE profiles p
SET education_history = (
  SELECT jsonb_agg(
    CASE WHEN e ? 'id' THEN e ELSE e || jsonb_build_object('id', gen_random_uuid()::text) END
    ORDER BY ord
  )
  FROM jsonb_array_elements(p.education_history) WITH ORDINALITY AS t(e, ord)
)
WHERE jsonb_typeof(p.education_history) = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(p.education_history) AS e WHERE NOT e ? 'id');

UPDATE profiles p
SET accreditations = (
  SELECT jsonb_agg(
    CASE WHEN e ? 'id' THEN e ELSE e || jsonb_build_object('id', gen_random_uuid()::text) END
    ORDER BY ord
  )
  FROM jsonb_array_elements(p.accreditations) WITH ORDINALITY AS t(e, ord)
)
WHERE jsonb_typeof(p.accreditations) = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(p.accreditations) AS e WHERE NOT e ? 'id');

ALTER TABLE profiles ENABLE TRIGGER profiles_updated_at;

-- ---------------------------------------------------------------------------
-- 2. profiles: the re-check window. Set when a listed profile's required
--    item (identity, most recent employer, most recent degree) loses its
--    check or a newer job or degree becomes the most recent one; cleared
--    when every required item is checked again. Past it, the profile is
--    unlisted until then (same pattern as testimonial_grace_until).
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_recheck_until timestamptz;

-- ---------------------------------------------------------------------------
-- 3. hiring_managers: institutional-email sign-up (§9). account_status:
--      active              — can save, rank, watch and listen
--      awaiting_code       — signed up, email code not entered yet
--      exception_pending   — no institutional email; admin reviews the request
--      exception_declined  — request declined
--    Existing rows (the demo managers and referees' one-click accounts) are
--    active. organization_id is the organization of the email domain.
-- ---------------------------------------------------------------------------
ALTER TABLE hiring_managers
  ADD COLUMN IF NOT EXISTS organization_id    uuid REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS account_status     text NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active','awaiting_code','exception_pending','exception_declined')),
  ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz,
  -- mocked email code (same pattern as audio_testimonials 015)
  ADD COLUMN IF NOT EXISTS code_hash          text,
  ADD COLUMN IF NOT EXISTS code_expires_at    timestamptz,
  ADD COLUMN IF NOT EXISTS code_attempts      int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS code_sends         int NOT NULL DEFAULT 0,
  -- exception request: hirers without an institutional email
  ADD COLUMN IF NOT EXISTS exception_reason       text,
  ADD COLUMN IF NOT EXISTS exception_website      text,
  ADD COLUMN IF NOT EXISTS exception_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS exception_decided_at   timestamptz,
  ADD COLUMN IF NOT EXISTS exception_decided_by   text,
  ADD COLUMN IF NOT EXISTS exception_note         text; -- admin's note, shown to the requester

CREATE INDEX IF NOT EXISTS hiring_managers_email_idx ON hiring_managers (lower(email));
CREATE INDEX IF NOT EXISTS hiring_managers_status_idx ON hiring_managers (account_status);

-- ---------------------------------------------------------------------------
-- 4. verification_evidence: one row per document or link for one item,
--    awaiting review. STORAGE STAYS STUBBED: file_path is a placeholder and
--    no file is uploaded. After the admin's decision the row is deleted;
--    verification_checks keeps the audit record (no file names).
-- ---------------------------------------------------------------------------
ALTER TABLE verification_evidence
  ADD COLUMN IF NOT EXISTS item_kind text CHECK (item_kind IN ('employer','degree','certification')),
  ADD COLUMN IF NOT EXISTS item_id   text,   -- work_history / education_history / accreditations entry id
  ADD COLUMN IF NOT EXISTS link_url  text,   -- a public document naming them, instead of a file
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_size int,
  ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE verification_evidence ALTER COLUMN file_path DROP NOT NULL;
ALTER TABLE verification_evidence ALTER COLUMN explanation DROP NOT NULL;

CREATE INDEX IF NOT EXISTS verification_evidence_item_idx ON verification_evidence (profile_id, item_kind, item_id);

-- ---------------------------------------------------------------------------
-- 5. verification_checks — the audit record (§3.1): what was checked, how,
--    by whom, when. Append-only: ID-provider results, admin decisions and
--    bio edit requests. An item's label is its latest decision, and holds
--    only while the item's checked fields still hash to item_fingerprint, so
--    editing a checked item removes its label until it is re-checked.
--      item_kind / item_id: identity ('identity'), employer / degree /
--        certification (entry id), bio ('bio')
--      item_summary: the checked item as it read ("MSc Economics, LSE, 2013")
--    Employers confirmed by a matching referee email (§4.4) are worked out
--    from the published testimonial, not stored here.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS verification_checks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_kind        text NOT NULL CHECK (item_kind IN ('identity','employer','degree','certification','bio')),
  item_id          text NOT NULL,
  item_summary     text,
  item_fingerprint text,
  outcome          text NOT NULL CHECK (outcome IN (
                     'provider_passed','provider_failed',        -- ID + selfie provider (placeholder)
                     'confirmed','document_reviewed',            -- labels
                     'unverifiable',                             -- certification removed
                     'edits_requested')),                        -- bio
  method           text CHECK (method IN ('id_provider','registry','degree_service','document','public_document','referee_email','admin_review')),
  detail           jsonb NOT NULL DEFAULT '{}', -- e.g. {note, evidence: [{kind, mime_type, size}], evidence_deleted_at}
  actor            text NOT NULL CHECK (actor IN ('consultant','provider','admin','system')),
  actor_name       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE verification_checks ENABLE ROW LEVEL SECURITY;
-- PROD: no direct client writes; rows are written by the server-side
--       functions for the provider webhook and admin decisions. Admin reads
--       all; the consultant reads their own rows' outcome, method and date
--       (labels) but not admin notes on other items; the public reads only
--       what the labels need (outcome + fingerprint per item).
DROP POLICY IF EXISTS "dev_read_verification_checks"  ON verification_checks;
DROP POLICY IF EXISTS "dev_write_verification_checks" ON verification_checks;
CREATE POLICY "dev_read_verification_checks"  ON verification_checks FOR SELECT USING (true);
CREATE POLICY "dev_write_verification_checks" ON verification_checks FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON verification_checks TO anon, authenticated;

CREATE INDEX IF NOT EXISTS verification_checks_item_idx ON verification_checks (profile_id, item_kind, item_id, created_at);

-- New columns on existing tables inherit their RLS policies; nothing to add.
