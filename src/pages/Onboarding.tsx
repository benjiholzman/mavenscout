import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccreditationsEditor } from '../components/onboarding/AccreditationsEditor'
import { AvailabilityEditor } from '../components/onboarding/AvailabilityEditor'
import { EditorSection } from '../components/onboarding/EditorSection'
import { FieldRow, TextArea, TextField } from '../components/onboarding/fields'
import { ExpertiseEditor } from '../components/onboarding/ExpertiseEditor'
import { HistoryEditorsBundle } from '../components/onboarding/HistoryBundle'
import { LanguagesEditor } from '../components/onboarding/LanguagesEditor'
import { PortfolioEditor } from '../components/onboarding/PortfolioEditor'
import { ResumeUploader } from '../components/onboarding/ResumeUploader'
import { SocialLinksEditor } from '../components/onboarding/SocialLinksEditor'
import { TestimonialsSection } from '../components/onboarding/TestimonialsSection'
import { TierSection } from '../components/onboarding/TierSection'
import { VideoQnASection } from '../components/onboarding/VideoQnASection'
import { VideoRequestsInbox } from '../components/onboarding/VideoRequestsInbox'
import { InfoTip } from '../components/ui/InfoTip'
import { FIRM_THRESHOLD_NOTE } from '../components/ui/badges'
import { useEditorProfile } from '../hooks/useEditorProfile'
import { EXPERTISE_TIER_LIMITS, FIRMS_ENABLED } from '../lib/config'
import { buildExpertiseIndex, expertiseTags } from '../lib/expertise'
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
  expertiseTierError,
} from '../lib/validation'
import type { PortfolioItem, Profile, TaxonomyCategory, TaxonomyItem } from '../types/db'

// The consultant/firm profile editor (PRD 7.3) — one page, sections saving
// independently, doubling as onboarding (new pending draft) and post-approval
// editing (edits auto-publish, v1 rule). Media sections (Video Q&As, audio
// testimonials) land in build step 6 and slot in as further sections here.

/** Fetches the portfolio list once for both media editors (video attach +
 *  testimonial attach pickers). */
function MediaSections({ profileId, draft }: { profileId: string; draft: Profile }) {
  const [portfolio, setPortfolio] = useState<PortfolioItem[] | null>(null)
  useEffect(() => {
    supabase
      .from('portfolio_items')
      .select('*')
      .eq('profile_id', profileId)
      .order('sort_order')
      .then(({ data }) => setPortfolio((data as PortfolioItem[]) ?? []))
  }, [profileId])
  if (!portfolio) return <p className="text-sm text-ink-faint">Loading…</p>
  return (
    <>
      <VideoQnASection profile={draft} portfolio={portfolio} />
      <div className="border-t border-line pt-6">
        <TestimonialsSection profile={draft} portfolio={portfolio} />
      </div>
    </>
  )
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
  ['media', 'Videos & audio'],
  ['tier', 'Tier & review'],
] as const

export default function Onboarding() {
  const { role } = useSession()
  const { profile, error, save, setProfile } = useEditorProfile()
  const [draft, setDraft] = useState<Profile | null>(null)
  const [taxonomy, setTaxonomy] = useState<{ cats: TaxonomyCategory[]; items: TaxonomyItem[] } | null>(null)

  useEffect(() => {
    if (profile && !draft) setDraft(profile)
  }, [profile, draft])

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
  if (!draft || !taxonomy)
    return <p className="mx-auto max-w-3xl px-4 py-16 text-ink-faint">Loading…</p>

  const isFirm = draft.consultant_type !== 'Individual'
  const set = (patch: Partial<Profile>) => setDraft({ ...draft, ...patch })
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
            Pending admin review
          </span>
        )}
        {draft.approval_status === 'rejected' && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
            Not approved — contact support
          </span>
        )}
      </div>

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
              save({
                name: draft.name,
                headline: draft.headline,
                location: draft.location,
                spoken_languages: spokenLanguages(draft),
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
              <LanguagesEditor
                value={spokenLanguages(draft)}
                onChange={(spoken_languages) => set({ spoken_languages })}
              />
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
              save({
                detailed_bio: draft.detailed_bio,
                contracting_work_eligibility: draft.contracting_work_eligibility,
              })
            }
          >
            <div className="space-y-3">
              <TextArea
                label="Professional summary"
                rows={7}
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
            onSave={async () =>
              expertiseTierError(expertiseTags(draft)) ?? save({ tiered_expertise: expertiseTags(draft) })
            }
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
            onSave={() => save({ accreditations: draft.accreditations })}
          >
            <AccreditationsEditor value={draft.accreditations} onChange={(v) => set({ accreditations: v })} />
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
              save({
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
            />
          </EditorSection>

          <EditorSection
            id="portfolio"
            title="Portfolio — featured projects"
            description="Showcased deliverables (not timeline roles). Saved separately from the rest of the profile."
          >
            <PortfolioEditor profileId={draft.id} cap={portfolioCap(draft.is_premium)} />
          </EditorSection>

          <EditorSection
            id="links"
            title="Résumé, website & social links"
            onSave={() =>
              save({
                website_name: draft.website_name,
                website_url: draft.website_url,
                social_links: draft.social_links,
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
              <div>
                <p className="mb-1.5 text-sm font-medium">
                  Social & account links ({draft.social_links.length}/{socialLinkCap(draft.is_premium)})
                </p>
                <SocialLinksEditor
                  value={draft.social_links}
                  onChange={(v) => set({ social_links: v })}
                  cap={socialLinkCap(draft.is_premium)}
                />
              </div>
            </div>
          </EditorSection>

          <EditorSection
            id="media"
            title="Video Q&As & audio testimonials"
            description="Real uploads (2-minute cap enforced before saving) with a paste-a-URL alternative for video. In-browser recording is a later fast-follow."
          >
            <div className="space-y-8">
              <MediaSections profileId={draft.id} draft={draft} />
            </div>
          </EditorSection>

          <EditorSection id="tier" title="Tier & review">
            <TierSection
              profile={draft}
              onApplied={() => {
                set({ verification_status: 'pending' })
                setProfile((p) => (p ? { ...p, verification_status: 'pending' } : p))
              }}
            />
          </EditorSection>
        </div>
      </div>
    </div>
  )
}
