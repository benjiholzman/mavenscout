-- 015: audio testimonial flow (docs/MavenScout-profiles-membership.md §4, §13 step 3).
--
-- Run once in the Supabase SQL editor after 014. Safe to re-run: IF NOT EXISTS
-- on every new column, table and index, policies dropped and re-created, and
-- the work-history backfill only touches entries without an id.
--
-- ADDITIVE ONLY. Nothing is dropped or renamed, and audio_testimonials.status
-- keeps its CHECK (pending / published / removed): the request lifecycle
-- comes from the new timestamps, so code on main keeps working. Old rows
-- (no work_history_entry_id: "general" or candidate uploads) stay as they are
-- and are shown as legacy references until the step 5 re-seed.
--
-- Note: 000_schema.sql still comments audio_testimonials.transcript as
-- feeding matching. It doesn't: transcripts are never used in ranking (§4.1,
-- §11), and the matcher never loads them.
--
-- ⚠ SECURITY (dev posture, flagged for the hardening pass): the new columns
-- inherit the permissive dev policies, so referee emails, profiles.email and
-- the code hash are readable with the anon key, and the referee page checks
-- the code client-side. The real version sends, hashes and verifies the code
-- server-side (security-definer RPC or edge function) and closes these reads.

-- ---------------------------------------------------------------------------
-- 1. Stable ids on work-history entries, so a testimonial can point at one.
--    The editor assigns ids to new entries and keeps them through edits.
--    The updated_at trigger is paused so the backfill doesn't look like edits.
-- ---------------------------------------------------------------------------
ALTER TABLE profiles DISABLE TRIGGER profiles_updated_at;

UPDATE profiles p
SET work_history = (
  SELECT jsonb_agg(
    CASE WHEN e ? 'id' THEN e ELSE e || jsonb_build_object('id', gen_random_uuid()::text) END
    ORDER BY ord
  )
  FROM jsonb_array_elements(p.work_history) WITH ORDINALITY AS t(e, ord)
)
WHERE jsonb_typeof(p.work_history) = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(p.work_history) AS e WHERE NOT e ? 'id');

ALTER TABLE profiles ENABLE TRIGGER profiles_updated_at;

-- ---------------------------------------------------------------------------
-- 2. profiles: the consultant's account email (never shown; §4.6 rejects it
--    as a referee address; real auth will source it from auth.users), and the
--    replacement deadline after the required testimonial is withdrawn (§4.5).
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS testimonial_grace_until timestamptz;

-- ---------------------------------------------------------------------------
-- 3. hiring_managers: email + updates opt-in, for the referee's one-click
--    account (§4.3 step 7). Institutional-email sign-up gating is step 4.
-- ---------------------------------------------------------------------------
ALTER TABLE hiring_managers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE hiring_managers ADD COLUMN IF NOT EXISTS updates_opt_in boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 4. audio_testimonials: request, referee, code, lifecycle, transcript.
--    reference_name / reference_title / reference_org hold the referee's
--    name and CURRENT title and organization; relationship is 'supervisor'
--    or 'client' on new rows.
-- ---------------------------------------------------------------------------
ALTER TABLE audio_testimonials
  -- what it's attached to: an employer entry (profiles.work_history[].id) or,
  -- for Featured Members, a portfolio item (existing portfolio_item_id)
  ADD COLUMN IF NOT EXISTS work_history_entry_id text,
  -- referee
  ADD COLUMN IF NOT EXISTS referee_email   text,
  ADD COLUMN IF NOT EXISTS referee_org_id  uuid REFERENCES organizations(id) ON DELETE SET NULL, -- org of the email domain
  ADD COLUMN IF NOT EXISTS period_start    int,
  ADD COLUMN IF NOT EXISTS period_end      int,   -- NULL = ongoing
  ADD COLUMN IF NOT EXISTS context         text,  -- what they worked on together
  -- pre-check and integrity review (§4.2, §4.6)
  ADD COLUMN IF NOT EXISTS precheck_status text CHECK (precheck_status IN ('passed','review','cleared','rejected')),
  ADD COLUMN IF NOT EXISTS review_flags    jsonb NOT NULL DEFAULT '[]', -- [{code, message}]
  ADD COLUMN IF NOT EXISTS replaces_id     uuid REFERENCES audio_testimonials(id) ON DELETE SET NULL,
  -- "Confirm it's me" code (§4.3 step 2): single-use, ~10 minutes, limited attempts
  ADD COLUMN IF NOT EXISTS code_hash          text,
  ADD COLUMN IF NOT EXISTS code_sent_at       timestamptz,
  ADD COLUMN IF NOT EXISTS code_expires_at    timestamptz,
  ADD COLUMN IF NOT EXISTS code_attempts      int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS code_sends         int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confirm_nonce_hash text, -- binds the confirmation to the referee's browser tab
  -- lifecycle (status stays pending / published / removed)
  ADD COLUMN IF NOT EXISTS opened_at           timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS details_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_at          timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at        timestamptz, -- = recording date
  ADD COLUMN IF NOT EXISTS published_at        timestamptz,
  ADD COLUMN IF NOT EXISTS removed_at          timestamptz,
  ADD COLUMN IF NOT EXISTS withdrawn_at        timestamptz,
  -- transcript (placeholder speech-to-text this build; never used in ranking)
  ADD COLUMN IF NOT EXISTS transcript_source       text CHECK (transcript_source IN ('auto','edited')),
  ADD COLUMN IF NOT EXISTS transcript_confirmed_at timestamptz,
  -- after submission: the referee's own withdraw link (sent only to them; the
  -- consultant holds the submission link), their manager account and opt-in
  ADD COLUMN IF NOT EXISTS withdraw_token     text UNIQUE,
  ADD COLUMN IF NOT EXISTS referee_manager_id uuid REFERENCES hiring_managers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referee_opt_in     boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS audio_testimonials_referee_email_idx ON audio_testimonials (lower(referee_email));
CREATE INDEX IF NOT EXISTS audio_testimonials_entry_idx ON audio_testimonials (profile_id, work_history_entry_id);

-- ---------------------------------------------------------------------------
-- 5. testimonial_events — the audit trail per testimonial (§4.6 rule 7):
--    code sent/confirmed, details edited and accepted, consent, submission,
--    transcript edits, publish, removal, withdrawal, admin decisions, listens,
--    and the mocked emails (subject, body, link) this build doesn't send.
--    Kept when a recording is deleted (the testimonial row stays as removed).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS testimonial_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testimonial_id uuid NOT NULL REFERENCES audio_testimonials(id) ON DELETE CASCADE,
  event          text NOT NULL,
  actor          text NOT NULL CHECK (actor IN ('consultant','referee','admin','manager','system')),
  detail         jsonb NOT NULL DEFAULT '{}',
  fingerprint    jsonb,  -- device details from the browser; network/IP needs the server (hardening pass)
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE testimonial_events ENABLE ROW LEVEL SECURITY;
-- PROD: no direct client access. Rows are written by the server-side
--       functions that perform each step; admin reads all; the consultant
--       reads their own testimonials' non-sensitive events (no fingerprints,
--       no referee email bodies).
DROP POLICY IF EXISTS "dev_read_testimonial_events"  ON testimonial_events;
DROP POLICY IF EXISTS "dev_write_testimonial_events" ON testimonial_events;
CREATE POLICY "dev_read_testimonial_events"  ON testimonial_events FOR SELECT USING (true);
CREATE POLICY "dev_write_testimonial_events" ON testimonial_events FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON testimonial_events TO anon, authenticated;

CREATE INDEX IF NOT EXISTS testimonial_events_testimonial_idx ON testimonial_events (testimonial_id, created_at);

-- New columns on existing tables inherit their RLS policies; nothing to add.
