import { Mic } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccreditationsEditor } from '../components/onboarding/AccreditationsEditor'
import { AvailabilityEditor } from '../components/onboarding/AvailabilityEditor'
import { EditorSection } from '../components/onboarding/EditorSection'
import { FieldRow, TextArea, TextField } from '../components/onboarding/fields'
import { ExpertiseEditor } from '../components/onboarding/ExpertiseEditor'
import { HistoryEditorsBundle } from '../components/onboarding/HistoryBundle'
import type { EntryTestimonialStatus } from '../components/onboarding/HistoryEditors'
import { LanguagesEditor } from '../components/onboarding/LanguagesEditor'
import { PortfolioEditor } from '../components/onboarding/PortfolioEditor'
import { ResumeUploader } from '../components/onboarding/ResumeUploader'
import { SocialLinksEditor } from '../components/onboarding/SocialLinksEditor'
import { TestimonialsSection } from '../components/onboarding/TestimonialsSection'
import { CompletenessPanel } from '../components/onboarding/CompletenessPanel'
import { MembershipSection } from '../components/onboarding/MembershipSection'
import { VideoQnASection } from '../components/onboarding/VideoQnASection'
import { VideoRequestsInbox } from '../components/onboarding/VideoRequestsInbox'
import { VerificationSection } from '../components/onboarding/VerificationSection'
import { CheckedNote, type CheckedMark } from '../components/onboarding/CheckedNote'
import { InfoTip } from '../components/ui/InfoTip'
import { FIRM_THRESHOLD_NOTE } from '../components/ui/badges'
import { useEditorProfile } from '../hooks/useEditorProfile'
import { useTestimonials } from '../hooks/useTestimonials'
import { useOrganizations } from '../hooks/useOrganizations'
import { useVerification } from '../hooks/useVerification'
import { employerOrgFingerprint, identityFingerprint } from '../lib/verification/items'
import { verificationGaps, verificationWaiting } from '../lib/verification/gaps'
import { recheckPatch } from '../lib/verification/window'
import { verificationState, type VerificationState } from '../lib/verification/state'
import { isActive, STAGE_LABELS, testimonialStage } from '../lib/testimonials/rules'
import { EXPERTISE_TIER_LIMITS, FIRMS_ENABLED, PROFILE_LIMITS } from '../lib/config'
import { buildExpertiseIndex, expertiseTags } from '../lib/expertise'
import { checkSectionSave, completenessGaps, isListedProfile, type RuleSection } from '../lib/completeness'
import { membershipLimits } from '../lib/membership'
import { spokenLanguages } from '../lib/languages'
import { useSession } from '../lib/session'
import { supabase } from '../lib/supabase'
import {
  ADDITIONAL_CAP,
  EDUCATION_CAP,
  ELIGIBILITY_MAX,
  HEADLINE_MAX,
  WORK_HISTORY_CAP,
  portfolioCap,
  socialLinkCap,
} from '../lib/validation'
import type { AudioTestimonial, Profile, TaxonomyCategory, TaxonomyItem } from '../types/db'

// The consultant/firm profile editor (PRD 7.3) — one page, sections saving
// independently, doubling as onboarding (new pending draft) and post-approval
// editing (edits auto-publish, v1 rule).

/** Audio testimonial status per work-history entry id, for the history
 *  editor's chips and its removal guard. */
function entryTestimonialStatus(rows: AudioTestimonial[]): Record<string, EntryTestimonialStatus> {
  const out: Record<string, EntryTestimonialStatus> = {}
  for (const t of rows)
    if (t.work_history_entry_id && isActive(t))
      out[t.work_history_entry_id] = { label: STAGE_LABELS[testimonialStage(t)].toLowerCase(), locked: true }
  return out
}

/** Entries saved before 015/016 (or by a seed re-run) get an id, so a
 *  testimonial or a verification check can point at them; it's saved with
 *  the section's next save. */
function withEntryIds(p: Profile): Profile {
  const ids = <T extends { id?: string }>(rows: T[]) =>
    rows.every((r) => r.id) ? rows : rows.map((r) => (r.id ? r : { ...r, id: crypto.randomUUID() }))
  return {
    ...p,
    work_history: ids(p.work_history),
    education_history: ids(p.education_history),
    accreditations: ids(p.accreditations),
  }
}

/** Verification labels by entry id, for the editors' "editing removes this
 *  label" notes (spec §3.1). An employer confirmed by a referee's email
 *  keeps its label while the organization is unchanged (§4.4). */
function checkedMarks(state: VerificationState | null, profile: Profile): Record<string, CheckedMark> {
  const out: Record<string, CheckedMark> = {}
  for (const item of state?.items ?? []) {
    if (!item.mark) continue
    const entry = item.mark.testimonial ? profile.work_history.find((w) => w.id === item.id) : null
    out[item.id] = {
      label: item.mark.label,
      fingerprint: entry ? employerOrgFingerprint(entry) : item.fingerprint,
      viaTestimonial: !!entry,
    }
  }
  return out
}

const SECTIONS = [
  ['basics', 'Basics'],
  ['type', FIRMS_ENABLED ? 'Type & level' : 'Career level'],
  ['bio', 'Bio & eligibility'],
  ['tags', 'Expertise'],
  ['accreditations', 'Accreditations'],
  ['availability', 'Availability'],
  ['history', 'History'],
  ['portfolio', 'Portfolio'],
  ['links', 'Résumé & links'],
  ['verification', 'Verification'],
  ['testimonials', 'Audio testimonials'],
  ['media', 'Video Q&As'],
  ['tier', 'Membership & review'],
] as const

export default function Onboarding() {
  const { role } = useSession()
  const { profile, error, save, setProfile, videoQnas, updateVideoQnas } = useEditorProfile()
  const [draft, setDraft] = useState<Profile | null>(null)
  /** Saved portfolio items, for the portfolio count rules (spec §7.1). */
  const [portfolioCount, setPortfolioCount] = useState<number | null>(null)
  const [taxonomy, setTaxonomy] = useState<{ cats: TaxonomyCategory[]; items: TaxonomyItem[] } | null>(null)
  const testimonials = useTestimonials(profile?.id)
  const verification = useVerification(profile?.id)
  const orgs = useOrganizations()

  useEffect(() => {
    if (profile && !draft) setDraft(withEntryIds(profile))
  }, [profile, draft])

  useEffect(() => {
    if (!profile) return
    supabase
      .from('portfolio_items')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .then(({ count }) => setPortfolioCount(count ?? 0))
  }, [profile?.id])

  useEffect(() => {
    Promise.all([
      supabase.from('taxonomy_categories').select('*').order('sort_order'),
      supabase.from('taxonomy_items').select('*').order('sort_order'),
    ]).then(([c, i]) =>
      setTaxonomy({ cats: c.data as TaxonomyCategory[], items: i.data as TaxonomyItem[] }),
    )
  }, [])

  if (role !== 'consultant')
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Consultant profile editor</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Log in as a consultant (or use the dev role switcher, bottom right) to edit a profile.
        </p>
        <Link to="/login" className="mt-4 inline-block rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white">
          Log in
        </Link>
      </div>
    )

  if (error) return <p className="mx-auto max-w-3xl px-4 py-16 text-red-600">{error}</p>
  if (!draft || !taxonomy || !profile || portfolioCount === null || !testimonials.rows || !verification.data)
    return <p className="mx-auto max-w-3xl px-4 py-16 text-ink-faint">Loading…</p>

  const isFirm = draft.consultant_type !== 'Individual'
  const set = (patch: Partial<Profile>) => setDraft({ ...draft, ...patch })
  // Minimums and maximums (lib/completeness), checked against the saved
  // profile: the panel lists the gaps, and each section save is refused if it
  // goes over a maximum or (listed profiles) takes a section below a minimum.
  const saved = { profile, portfolioCount, testimonials: testimonials.rows }
  // Verification (spec §3): where each item stands, from the saved profile.
  const verifyInput = { ...verification.data, profile, testimonials: testimonials.rows, orgs }
  const vState = verificationState(verifyInput)
  // Minimums plus what verification still needs from the consultant (§10).
  const gaps = [...completenessGaps(saved), ...verificationGaps(vState)]
  const marks = checkedMarks(vState, profile)
  const identityMark = vState?.items.find((i) => i.kind === 'identity')?.mark
  // A save that removes the label from the identity, most recent employer or
  // most recent degree (or makes a newer job or degree the most recent one)
  // opens the re-check window on a listed profile; one that restores them
  // clears it (lib/verification/recheck).
  const withRecheckWindow = (patch: Partial<Profile>): Partial<Profile> => {
    const after = verificationState({ ...verifyInput, profile: { ...profile, ...patch } })
    return { ...patch, ...recheckPatch(profile, vState.corePassed, after.corePassed) }
  }
  const guarded = (section: RuleSection, patch: Partial<Profile>) =>
    Promise.resolve(
      checkSectionSave(section, saved, { ...saved, profile: { ...profile, ...patch } }),
    ).then((err) => (err ? `${err}.` : save(withRecheckWindow(patch))))
  const saveAndSet = async (patch: Partial<Profile>) => {
    const err = await save(patch)
    if (!err) set(patch)
    return err
  }
  const expertiseIndex = buildExpertiseIndex(taxonomy.cats, taxonomy.items)
  const workArrangements = taxonomy.items.filter((i) => {
    const cat = taxonomy.cats.find((c) => c.id === i.category_id)
    return cat?.type === 'work_arrangement'
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Your profile</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Sections save individually.{' '}
            {draft.approval_status === 'approved' ? (
              <>
                Edits publish immediately —{' '}
                <Link to={`/profile/${draft.handle}`} className="font-medium text-brand-600">
                  view live profile
                </Link>{' '}
                ·{' '}
                <Link to={`/site/${draft.handle}`} className="font-medium text-brand-600">
                  view public website
                </Link>
              </>
            ) : (
              'New profiles stay unlisted until an admin approves them.'
            )}
          </p>
        </div>
        {draft.approval_status === 'pending' && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            {profile.submitted_at ? 'Pending admin review' : 'Draft — not submitted yet'}
          </span>
        )}
        {draft.approval_status === 'rejected' && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
            Not approved — contact support
          </span>
        )}
      </div>

      <div className="mt-6">
        <CompletenessPanel gaps={gaps} listed={isListedProfile(profile)} waiting={verificationWaiting(vState)} profile={profile} />
      </div>

      {/* New testimonials to listen to and publish (spec §4.4; email mocked). */}
      {testimonials.rows
        .filter((t) => testimonialStage(t) === 'recorded')
        .map((t) => (
          <a
            key={t.id}
            href="#testimonials"
            className="mt-4 flex items-center gap-2 rounded-card border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-ink-soft hover:border-brand-400"
          >
            <Mic size={16} className="shrink-0 text-brand-600" />
            <span>
              <strong className="text-ink">New testimonial from {t.reference_name}.</strong> Listen and publish it.
            </span>
          </a>
        ))}

      {/* Async video requests from hiring orgs surface here (7.17 — email stubbed). */}
      <div className="mt-6">
        <VideoRequestsInbox profile={draft} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[200px,1fr]">
        {/* Section nav: sticky rail on desktop, scrolling chips on mobile */}
        <nav className="top-20 flex gap-2 overflow-x-auto lg:sticky lg:h-fit lg:flex-col lg:gap-0.5">
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-ink-soft hover:text-ink lg:rounded-lg lg:hover:bg-white"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="min-w-0 space-y-5">
          <EditorSection
            id="basics"
            title="Basics"
            onSave={() =>
              guarded('basics', {
                name: draft.name,
                headline: draft.headline,
                location: draft.location,
                spoken_languages: spokenLanguages(draft),
                email: draft.email?.trim().toLowerCase() || null,
                photo_url: draft.photo_url,
                cover_image_url: draft.cover_image_url,
              })
            }
          >
            <div className="space-y-3">
              <FieldRow>
                <TextField label={isFirm ? 'Firm name' : 'Name'} value={draft.name} onChange={(v) => set({ name: v })} required />
                <TextField label="Location" value={draft.location ?? ''} onChange={(v) => set({ location: v || null })} placeholder="City, Country" hint="Free text — filter options derive from what consultants enter" />
              </FieldRow>
              <TextField
                label="Headline"
                value={draft.headline}
                onChange={(v) => set({ headline: v })}
                maxLength={HEADLINE_MAX}
                placeholder="M&E Specialist | Gender & Social Inclusion | USAID & FCDO Programs"
                hint="Shown on your card front and profile hero"
              />
              <TextField
                label="Account email"
                type="email"
                value={draft.email ?? ''}
                onChange={(v) => set({ email: v || null })}
                hint="Never shown on your profile. Referees can't use your own address or a domain you control."
              />
              <LanguagesEditor
                value={spokenLanguages(draft)}
                onChange={(spoken_languages) => set({ spoken_languages })}
              />
              {identityMark && (
                <CheckedNote
                  mark={{ label: identityMark.label, fingerprint: identityFingerprint(profile) }}
                  current={identityFingerprint(draft)}
                  fields="name or photo"
                />
              )}
              <FieldRow>
                <TextField label="Photo URL" value={draft.photo_url ?? ''} onChange={(v) => set({ photo_url: v || null })} />
                <TextField label="Cover image URL" value={draft.cover_image_url ?? ''} onChange={(v) => set({ cover_image_url: v || null })} />
              </FieldRow>
            </div>
          </EditorSection>

          <EditorSection
            id="type"
            title={FIRMS_ENABLED || isFirm ? 'Type & level' : 'Career level'}
            onSave={() =>
              save({
                consultant_type: draft.consultant_type,
                career_level: draft.consultant_type === 'Individual' ? draft.career_level : null,
                year_founded: draft.consultant_type === 'Individual' ? null : draft.year_founded,
              })
            }
          >
            <div className="space-y-4">
              {/* The firm onboarding path is hidden while firm listings are off
                  (spec §1); an existing firm draft still sees its type. */}
              {(FIRMS_ENABLED || isFirm) && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                  I am listed as <InfoTip text={FIRM_THRESHOLD_NOTE} />
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['Individual', 'Small Firm', 'Large Firm'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => set({ consultant_type: t })}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                        draft.consultant_type === t
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-line text-ink-soft hover:border-ink-faint'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              )}
              {draft.consultant_type === 'Individual' ? (
                <div>
                  <p className="mb-1.5 text-sm font-medium">Career level</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ['early_career', 'Early Career (0–5 yrs)'],
                      ['mid_career', 'Mid-Career (5–15 yrs)'],
                      ['senior', 'Senior (15+ yrs)'],
                    ] as const).map(([v, label]) => (
                      <button
                        key={v}
                        onClick={() => set({ career_level: v })}
                        className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                          draft.career_level === v
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-line text-ink-soft hover:border-ink-faint'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <label className="block max-w-48 text-sm">
                  <span className="font-medium">Year founded</span>
                  <input
                    type="number"
                    min={1900}
                    max={2026}
                    value={draft.year_founded ?? ''}
                    onChange={(e) => set({ year_founded: e.target.value ? +e.target.value : null })}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
                  />
                  <span className="mt-0.5 block text-xs text-ink-faint">Shown as "X years in business"</span>
                </label>
              )}
            </div>
          </EditorSection>

          <EditorSection
            id="bio"
            title="Bio & contracting eligibility"
            onSave={() =>
              guarded('bio', {
                detailed_bio: draft.detailed_bio,
                contracting_work_eligibility: draft.contracting_work_eligibility,
              })
            }
          >
            <div className="space-y-3">
              <TextArea
                label="Professional summary"
                rows={7}
                maxLength={PROFILE_LIMITS.bio.max}
                hint={`${PROFILE_LIMITS.bio.min.toLocaleString()}–${PROFILE_LIMITS.bio.max.toLocaleString()} characters.`}
                value={draft.detailed_bio ?? ''}
                onChange={(v) => set({ detailed_bio: v || null })}
              />
              <TextArea
                label="Contracting & work eligibility"
                rows={3}
                maxLength={ELIGIBILITY_MAX}
                value={draft.contracting_work_eligibility ?? ''}
                onChange={(v) => set({ contracting_work_eligibility: v || null })}
                hint="Right-to-work / visa needs and the legal vehicle you contract through (LLC, sole prop, your firm…). Only logged-in hiring accounts see this — never your public site."
              />
            </div>
          </EditorSection>

          <EditorSection
            id="tags"
            title="Expertise"
            description={`Self-attested — shown with a marker so managers know these are your claims. ${EXPERTISE_TIER_LIMITS.core.max} Core and ${EXPERTISE_TIER_LIMITS.strong.max} Strong keep specialists looking like specialists.`}
            onSave={() => guarded('tags', { tiered_expertise: expertiseTags(draft) })}
          >
            <ExpertiseEditor
              value={expertiseTags(draft)}
              onChange={(tiered_expertise) => set({ tiered_expertise })}
              index={expertiseIndex}
            />
          </EditorSection>

          <EditorSection
            id="accreditations"
            title="Accreditations & certifications"
            onSave={() => guarded('accreditations', { accreditations: draft.accreditations })}
          >
            <AccreditationsEditor value={draft.accreditations} onChange={(v) => set({ accreditations: v })} marks={marks} />
          </EditorSection>

          <EditorSection
            id="availability"
            title="Availability & work arrangement"
            description="Two independent tracks. Saving updates your 'availability last updated' freshness cue. Availability never shows on your public website."
            onSave={() =>
              save({
                part_time_availability: draft.part_time_availability,
                full_time_availability: draft.full_time_availability,
                work_types: draft.work_types,
              })
            }
          >
            <div className="space-y-4">
              <AvailabilityEditor
                partTime={draft.part_time_availability}
                fullTime={draft.full_time_availability}
                onPartTime={(t) => set({ part_time_availability: t })}
                onFullTime={(t) => set({ full_time_availability: t })}
              />
              <div>
                <p className="mb-1.5 text-sm font-medium">Work arrangement</p>
                <div className="flex flex-wrap gap-2">
                  {workArrangements.map((w) => (
                    <button
                      key={w.id}
                      onClick={() =>
                        set({
                          work_types: draft.work_types.includes(w.name)
                            ? draft.work_types.filter((x) => x !== w.name)
                            : [...draft.work_types, w.name],
                        })
                      }
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                        draft.work_types.includes(w.name)
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-line text-ink-soft hover:border-ink-faint'
                      }`}
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </EditorSection>

          <EditorSection
            id="history"
            title="Work history, education & additional experience"
            description={
              isFirm
                ? 'Firms: Work History and Education are hidden on firm profiles (Portfolio is your track record) — Additional Experience still shows for founding, partnerships, notable engagements.'
                : undefined
            }
            onSave={() =>
              guarded('history', {
                work_history: draft.work_history,
                education_history: draft.education_history,
                additional_experience: draft.additional_experience,
              })
            }
          >
            <HistoryEditorsBundle
              isFirm={isFirm}
              workHistory={draft.work_history}
              education={draft.education_history}
              additional={draft.additional_experience}
              caps={{ work: WORK_HISTORY_CAP, education: EDUCATION_CAP, additional: ADDITIONAL_CAP }}
              onWork={(v) => set({ work_history: v })}
              onEducation={(v) => set({ education_history: v })}
              onAdditional={(v) => set({ additional_experience: v })}
              testimonials={entryTestimonialStatus(testimonials.rows)}
              marks={marks}
            />
          </EditorSection>

          <EditorSection
            id="portfolio"
            title="Portfolio — featured projects"
            description="Showcased deliverables (not timeline roles). Saved separately from the rest of the profile."
          >
            <PortfolioEditor
              profileId={draft.id}
              cap={portfolioCap(draft)}
              checkCount={(before, after) =>
                checkSectionSave('portfolio', { ...saved, portfolioCount: before }, { ...saved, portfolioCount: after })
              }
              onSaved={setPortfolioCount}
            />
          </EditorSection>

          <EditorSection
            id="links"
            title="Résumé, website & social links"
            onSave={() =>
              save({
                website_name: draft.website_name,
                website_url: draft.website_url,
                social_links: draft.social_links,
                // Custom domain is Featured only (spec §2.2).
                ...(membershipLimits(draft).customDomain ? { custom_domain: draft.custom_domain } : {}),
              })
            }
          >
            <div className="space-y-5">
              <ResumeUploader
                profile={draft}
                onChange={(next) => {
                  set(next)
                  setProfile((p) => (p ? { ...p, ...next } : p))
                }}
              />
              <FieldRow>
                <TextField
                  label="Personal website — display name"
                  value={draft.website_name ?? ''}
                  onChange={(v) => set({ website_name: v || 'Personal website' })}
                  hint='Shown as the link text; defaults to "Personal website"'
                />
                <TextField
                  label="Personal website — URL"
                  value={draft.website_url ?? ''}
                  onChange={(v) => set({ website_url: v || null })}
                  placeholder="https://…"
                />
              </FieldRow>
              {membershipLimits(draft).customDomain ? (
                <TextField
                  label="Custom domain for your personal site"
                  value={draft.custom_domain ?? ''}
                  onChange={(v) => set({ custom_domain: v.trim() || null })}
                  placeholder="www.yourname.com"
                  hint="Demo build: saved, but the domain isn't connected yet (DNS setup comes with the developer pass). Your site keeps its Listed on MavenScout footer."
                />
              ) : (
                <p className="rounded-lg bg-paper px-3.5 py-2.5 text-xs text-ink-faint">
                  Custom domain for your personal site: a Featured Member benefit.
                </p>
              )}
              <div>
                <p className="mb-1.5 text-sm font-medium">
                  Social & account links ({draft.social_links.length}/{socialLinkCap(draft)})
                </p>
                <SocialLinksEditor
                  value={draft.social_links}
                  onChange={(v) => set({ social_links: v })}
                  cap={socialLinkCap(draft)}
                />
              </div>
            </div>
          </EditorSection>

          <EditorSection
            id="verification"
            title="Verification"
            description="We check what's saved, so save the sections above first."
          >
            <VerificationSection
              profile={profile}
              state={vState}
              reload={async () => {
                await verification.reload()
              }}
            />
          </EditorSection>

          <EditorSection
            id="testimonials"
            title="Audio testimonials"
            description="Spoken references from people who supervised or contracted you, confirmed through their work email. Only signed-in hiring managers can listen; never on your public website."
          >
            <TestimonialsSection
              profile={profile}
              rows={testimonials.rows}
              reload={testimonials.reload}
              portfolioCount={portfolioCount}
              onProfileChanged={(patch) => {
                setProfile((p) => (p ? { ...p, ...patch } : p))
                setDraft((d) => (d ? { ...d, ...patch } : d))
              }}
            />
          </EditorSection>

          <EditorSection
            id="media"
            title="Video Q&As"
            description="Record in the browser or upload (2-minute cap enforced before saving), or paste a link."
          >
            <VideoQnASection
              profile={draft}
              onStatus={(status) => {
                updateVideoQnas(status)
                setDraft((d) => (d ? { ...d, video_qnas_complete: status.complete } : d))
              }}
            />
          </EditorSection>

          <EditorSection id="tier" title="Membership & review">
            <MembershipSection
              profile={profile}
              gapCount={gaps.length}
              videoQnas={videoQnas}
              save={saveAndSet}
            />
          </EditorSection>
        </div>
      </div>
    </div>
  )
}
