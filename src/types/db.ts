// Row types matching supabase/000_schema.sql (and the shapes used by the
// 001/002/003 seed files). Keep in sync with the SQL — this is the contract
// the later real-auth/Stripe/Loop8 passes inherit.

import type { Adjustment, Band, ExtractedRequirements, Requirement, Scoring } from '../lib/matching/types'

export type ConsultantType = 'Individual' | 'Small Firm' | 'Large Firm'
export type CareerLevel = 'early_career' | 'mid_career' | 'senior'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'paused' | 'none'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
/** 'expertise' = the unified list's browsing groups (011). */
export type TaxonomyType = 'work_arrangement' | 'expertise'

/** What an expertise item is; drives matching (OR within a kind, AND across). */
export type ExpertiseKind = 'sector' | 'theme' | 'method'
export type ExpertiseTier = 'core' | 'strong' | 'working'

/** One tag on the unified list (profiles-membership §6; 011). */
export interface ExpertiseTag {
  name: string
  tier: ExpertiseTier
}

export interface AvailabilityTrack {
  status: 'available_now' | 'available_from' | 'unavailable'
  from: string | null // ISO date
  until: string | null
}

export type Proficiency = 'fluent' | 'working'

/** One language a consultant speaks (010). Fluent satisfies a Working requirement. */
export interface SpokenLanguage {
  name: string
  proficiency: Proficiency
}

/** Canonical language list (010). */
export interface Language {
  id: string
  name: string
  created_at: string
}

export interface Accreditation {
  /** Stable id (016) so a verification check can point at it. Assigned by
   *  the editor; certifications saved before 016 got one in its backfill. */
  id?: string
  name: string
  issuing_organization: string
  year: number | null
  credential_id_or_url: string | null
}

export interface WorkHistoryEntry {
  /** Stable id (015) so a testimonial can point at the entry. Assigned by the
   *  editor; entries saved before 015 got one in its backfill. */
  id?: string
  organization: string // as shown; the canonical name when picked from the list
  organization_id?: string | null // set when picked from `organizations` (009); else resolved by name at read time
  role: string
  start_year: number
  end_year: number | null // null = "Present"
  logo_url: string | null
  description: string | null
}

export interface EducationEntry {
  /** Stable id (016), as on work-history entries. */
  id?: string
  institution: string
  degree_or_course: string
  start_year: number
  end_year: number | null
  logo_url: string | null
}

export interface AdditionalExperienceEntry {
  organization: string
  role: string
  start_year: number
  end_year: number | null
  description: string | null
}

export interface SocialLink {
  platform: string
  label: string
  url: string
}

export interface Profile {
  id: string
  user_id: string | null
  consultant_type: ConsultantType
  handle: string
  name: string
  headline: string
  location: string | null
  career_level: CareerLevel | null // individuals only
  year_founded: number | null // firms only
  contracting_work_eligibility: string | null // login-gated display
  work_types: string[]
  part_time_availability: AvailabilityTrack
  full_time_availability: AvailabilityTrack
  availability_updated_at: string | null
  photo_url: string | null
  cover_image_url: string | null
  resume_path: string | null // Storage path in 'resumes' bucket (PDF upload)
  resume_url: string | null // OR external link — exactly one populated, app-enforced
  detailed_bio: string | null
  /** Core / Strong / Working knowledge tags from the unified list (011). */
  tiered_expertise: ExpertiseTag[]
  accreditations: Accreditation[]
  /** Languages spoken, from the canonical list (010). */
  spoken_languages: SpokenLanguage[]
  work_history: WorkHistoryEntry[]
  education_history: EducationEntry[]
  additional_experience: AdditionalExperienceEntry[]
  website_name: string | null
  website_url: string | null
  social_links: SocialLink[]
  /** Account email (015), never shown. A referee can't use it (spec §4.6). */
  email: string | null
  /** Set when the required testimonial is withdrawn (015): replace it by then
   *  or the profile is unlisted (spec §4.5). */
  testimonial_grace_until: string | null
  /** Set when a listed profile's required verification item loses its check
   *  or a newer job or degree becomes the most recent (016): re-checked by
   *  then or the profile is unlisted until it is (spec §3, §10). */
  verification_recheck_until: string | null
  is_premium: boolean
  custom_domain: string | null
  subscription_status: SubscriptionStatus
  approval_status: ApprovalStatus
  /** Submitted for review (013); null = draft. Minimums are checked here. */
  submitted_at: string | null
  is_demo: boolean // synthetic/demo data; purge with supabase/purge_demo.sql
  created_at: string
  updated_at: string
  /** App-derived, NOT a column: every active standard question has a video
   *  answer. Set by the loaders (lib/membership withVideoQnaStatus); Featured
   *  status needs it (spec §2.2). Never write it back to `profiles`. */
  video_qnas_complete?: boolean
  /** App-derived, NOT a column: the profile shows at least one published
   *  audio testimonial. Set by the directory loader (lib/testimonials/display
   *  testimonialTeasers); the "Has audio testimonial" filter reads it. Never
   *  write it back to `profiles`. */
  has_audio_testimonial?: boolean
}

export type OrgType =
  | 'multilateral'
  | 'bilateral_donor'
  | 'un_agency'
  | 'ngo'
  | 'government'
  | 'private_firm'
  | 'academic'
  | 'foundation'

/** Canonical organizations list (profiles-membership §8; 009). */
export interface Organization {
  id: string
  name: string
  aliases: string[] // short and former names: 'WB', 'IBRD', 'DFID'
  domains: string[] // web/email domains, primary first
  logo_url: string | null // explicit logo; null = from domains[0]; '' = initials (orgLogoUrl)
  type: OrgType
  created_at: string
}

export interface TaxonomyCategory {
  id: string
  type: TaxonomyType
  name: string
  sort_order: number
}

export interface TaxonomyItem {
  id: string
  category_id: string
  name: string
  sort_order: number
  /** Unified expertise items only (011); null for work arrangements. */
  kind?: ExpertiseKind | null
  /** Search terms: 'M&E', 'PFM', 'TVET'. */
  aliases?: string[]
  /** Old Domain Expertise / Technical Skills item names folded into this item. */
  legacy_names?: string[]
}

export interface TaxonomyRequest {
  id: string
  profile_id: string
  type: 'expertise'
  proposed_name: string
  proposed_parent: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface PortfolioItem {
  id: string
  profile_id: string
  project_name: string
  organization: string | null
  organization_id?: string | null // set when picked from `organizations` (009)
  start_year: number | null
  end_year: number | null // null = ongoing (shown as "–present")
  role: string
  description: string
  results: string | null
  /** Up to 3, the first is the cover (spec §7.2). */
  images: { url: string; caption?: string | null }[]
  links: { label: string; url: string }[]
  /** One YouTube or Vimeo link (013); replaces portfolio video uploads. */
  video_url: string | null
  sort_order: number
}

/** A required or labelled verification item (spec §3.1). */
export type VerificationItemKind = 'identity' | 'employer' | 'degree' | 'certification'

/** Evidence for one item, awaiting review (016). Deleted after the admin's
 *  decision; verification_checks keeps the audit record. */
export interface VerificationEvidence {
  id: string
  profile_id: string
  item_kind: Exclude<VerificationItemKind, 'identity'> | null
  item_id: string | null
  file_path: string | null // STUB — placeholder only, no real file this build
  /** A public document naming them, instead of a file. */
  link_url: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  explanation: string | null
  created_at: string
}

export type VerificationOutcome =
  | 'provider_passed'
  | 'provider_failed'
  | 'confirmed'
  | 'document_reviewed'
  | 'unverifiable'
  | 'edits_requested'

export type VerificationMethod =
  | 'id_provider'
  | 'registry'
  | 'degree_service'
  | 'document'
  | 'public_document'
  | 'referee_email'
  | 'admin_review'

/** The verification audit record (spec §3.1; 016): what was checked, how,
 *  by whom, when. Append-only. A label holds while the item's checked fields
 *  still match `item_fingerprint`. */
export interface VerificationCheck {
  id: string
  profile_id: string
  item_kind: VerificationItemKind | 'bio'
  /** Entry id; 'identity' or 'bio' for those. */
  item_id: string
  item_summary: string | null
  item_fingerprint: string | null
  outcome: VerificationOutcome
  method: VerificationMethod | null
  detail: Record<string, unknown>
  actor: 'consultant' | 'provider' | 'admin' | 'system'
  actor_name: string | null
  created_at: string
}

export interface InterviewQuestion {
  id: string
  question_text: string
  sort_order: number
  active: boolean
}

export interface VideoResponse {
  id: string
  profile_id: string
  /** Video Q&A answers only (profiles-membership §5; 014). */
  kind: 'question'
  question_id: string | null
  video_url: string | null
  video_path: string | null
  transcript: string | null
  duration_seconds: number // 0 = URL-pasted, duration unknown
  created_at: string
}

export type TestimonialRelationship = 'supervisor' | 'client'
export type PrecheckStatus = 'passed' | 'review' | 'cleared' | 'rejected'

/** An integrity or pre-check finding that sends a request to admin review. */
export interface ReviewFlag {
  code: string
  message: string
}

/** One audio testimonial and the request behind it (spec §4; 015). `status`
 *  is publication only; the request lifecycle comes from the timestamps
 *  (lib/testimonials/rules testimonialStage). */
export interface AudioTestimonial {
  id: string
  profile_id: string
  /** An employer entry (`work_history[].id`) — or, Featured only, a portfolio item. */
  work_history_entry_id: string | null
  portfolio_item_id: string | null
  /** Referee name and CURRENT title and organization. */
  reference_name: string | null
  reference_org: string | null
  reference_title: string | null
  /** 'supervisor' | 'client' on requests made through the flow; free text on legacy rows. */
  relationship: string | null
  referee_email: string | null
  /** Organization of the email domain (canonical list). */
  referee_org_id: string | null
  period_start: number | null
  period_end: number | null
  context: string | null
  /** Legacy rows only: month given. New rows use submitted_at. */
  reference_date: string | null
  /** Legacy rows only. */
  verification_url: string | null
  audio_path: string | null
  /** Never used in ranking (spec §4.1). */
  transcript: string | null
  transcript_source: 'auto' | 'edited' | null
  transcript_confirmed_at: string | null
  duration_seconds: number
  source: 'reference_direct' | 'candidate_upload'
  /** The referee's link. Null while a request is held for review. */
  submission_token: string | null
  status: 'pending' | 'published' | 'removed'
  precheck_status: PrecheckStatus | null
  review_flags: ReviewFlag[]
  replaces_id: string | null
  code_hash: string | null
  code_sent_at: string | null
  code_expires_at: string | null
  code_attempts: number
  code_sends: number
  confirm_nonce_hash: string | null
  opened_at: string | null
  confirmed_at: string | null
  details_accepted_at: string | null
  consent_at: string | null
  /** Recording date. */
  submitted_at: string | null
  published_at: string | null
  removed_at: string | null
  withdrawn_at: string | null
  withdraw_token: string | null
  referee_manager_id: string | null
  referee_opt_in: boolean
  created_at: string
}

export type TestimonialActor = 'consultant' | 'referee' | 'admin' | 'manager' | 'system'

/** Audit trail entry (spec §4.6 rule 7; 015). Mocked emails are events too. */
export interface TestimonialEvent {
  id: string
  testimonial_id: string
  event: string
  actor: TestimonialActor
  detail: Record<string, unknown>
  fingerprint: Record<string, unknown> | null
  created_at: string
}

export interface HiringManager {
  id: string
  user_id: string | null
  name: string
  organization: string | null
  email: string | null // 015
  updates_opt_in: boolean // 015
  /** Organization of the email domain (016). */
  organization_id: string | null
  account_status: ManagerAccountStatus
  email_confirmed_at: string | null
  code_hash: string | null
  code_expires_at: string | null
  code_attempts: number
  code_sends: number
  /** Exception request: hirers without an institutional email (spec §9). */
  exception_reason: string | null
  exception_website: string | null
  exception_requested_at: string | null
  exception_decided_at: string | null
  exception_decided_by: string | null
  /** The admin's note, shown to the requester. */
  exception_note: string | null
  /** Demo data (018): the role switcher's managers and referees of demo
   *  profiles. Removed by supabase/purge_demo.sql. */
  is_demo: boolean
  created_at: string
}

/** Hiring-manager sign-up state (spec §9; 016). Only `active` unlocks
 *  saving, ranking, Video Q&As and testimonials. */
export type ManagerAccountStatus = 'active' | 'awaiting_code' | 'exception_pending' | 'exception_declined'

export interface Opening {
  id: string
  hiring_manager_id: string
  name: string
  description: string | null
  deadline: string | null
  is_default: boolean
  created_at: string
}

export interface OpeningEntry {
  id: string
  opening_id: string
  profile_id: string
  list_tag: 'favorite' | 'top_pick' // top_pick ⊆ favorite, app-enforced
  outreach_tag: 'contacted' | 'interview_scheduled' | 'interview_completed' | null
  post_interview_note: string | null
  post_interview_score: number | null // 0–5
  added_at: string
}

export interface CandidateNoteScore {
  id: string
  opening_entry_id: string
  author_id: string
  note: string | null
  score: number | null // 0–5
  created_at: string
  updated_at: string
}

export interface OpeningShare {
  id: string
  opening_id: string
  share_token: string
  created_at: string
  revoked_at: string | null // set ⇒ link 404s
}

export interface OpeningReviewer {
  id: string
  opening_id: string
  reviewer_id: string
  granted_at: string
}

// ---- AI matching rows -------------------------------------------------------
// The engine contract (requirements, adjustments, results) lives in
// src/lib/matching/types.ts. MatchComponent / MatchWeights / MatchSubScore are
// the pre-rework slider model (PRD 7.7); they only type the legacy nullable
// columns (job_descriptions.weights, match_results.sub_scores).

export type MatchComponent =
  | 'demonstrated_experience'
  | 'domain_expertise'
  | 'technical_skills'
  | 'organizational_history'
  | 'location'
  | 'language'
  | 'availability'
  | 'consultant_type'

/** Which components are active + each 0–5 slider value. */
export type MatchWeights = Partial<Record<MatchComponent, { active: boolean; value: number }>>

export interface MatchSubScore {
  component: MatchComponent
  score: number // 0–100 within the component
  /** organizational_history only: tiered same/peer/none result (placeholder computes same-org only) */
  org_tier?: 'same' | 'peer' | 'none'
  detail?: string
}

export interface JobDescription {
  id: string
  hiring_manager_id: string
  opening_id: string | null // null = transient ad-hoc ranking
  raw_text: string
  requirements: Requirement[] | null // grid rows the run was scored against; null on legacy rows
  extracted: ExtractedRequirements | null // what extraction read from the JD
  hiring_organization: string | null // legacy — the org now lives in the Org History row
  weights: MatchWeights | null // legacy — pre-rework slider weights, no longer written
  created_at: string
}

/** A match_results row. Engine-facing shape: MatchResult in src/lib/matching/types.ts. */
export interface MatchResultRow {
  id: string
  job_description_id: string
  profile_id: string
  total_score: number // 0–100 (spec §5.3)
  rank: number | null // rank at run time
  band: Band | null
  fit_score: number | null
  adjustments: Adjustment[] | null
  scoring: Scoring | null // null only on legacy rows (008 deletes them)
  adjustments_capped: boolean | null // legacy (pre-008 +20 cap); no longer written
  must_haves_passed: { requirement_id: string; label: string }[] | null
  sub_scores: MatchSubScore[] | null // legacy
  narrative: string | null // ~100 words; templated placeholder this build
  created_at: string
}

export interface VideoResponseRequest {
  id: string
  opening_id: string
  job_description_id: string | null
  profile_id: string
  requested_by: string
  prompt: string
  status: 'sent' | 'submitted' | 'declined'
  video_url: string | null
  video_path: string | null
  duration_seconds: number | null // 5-min cap
  created_at: string
  submitted_at: string | null
}
