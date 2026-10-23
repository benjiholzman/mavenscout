import { Bookmark, Download, ExternalLink, Globe, Lock, Mail, MapPin, Mic, Star } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import type { ProfileData } from '../../hooks/useProfile'
import { fmtPortfolioMeta } from '../../lib/dates'
import { resumeDownloadUrl, videoLinkEmbed } from '../../lib/media'
import { portfolioImages } from '../../lib/portfolio'
import { useSession } from '../../lib/session'
import { platformIcon } from '../../lib/socials'
import { visibilityFor, type Surface } from '../../lib/visibility'
import type { AudioTestimonial, PortfolioItem, Profile } from '../../types/db'
import { TestimonialCard } from '../media/AudioPlayer'
import { VideoPlayer } from '../media/VideoPlayer'
import { useSaveCandidate } from '../openings/SaveCandidateFlow'
import {
  AvailabilityBadges,
  CAREER_LEVEL_LABELS,
  FirmTypeBadge,
  SelfAttestedMark,
} from '../ui/badges'
import { Carousel } from '../ui/Carousel'
import { GatePrompt } from '../ui/GatePrompt'
import { useOrganizations } from '../../hooks/useOrganizations'
import { expertiseTags } from '../../lib/expertise'
import { isFeatured } from '../../lib/membership'
import { formatLanguages, spokenLanguages } from '../../lib/languages'
import { entryLogoUrl, orgAcronym, resolveOrganization, type OrgIndex } from '../../lib/organizations'
import { summaryLine, visibleTestimonials } from '../../lib/testimonials/display'
import { emailDomain } from '../../lib/testimonials/integrity'
import { OrgLogo } from '../ui/OrgLogo'
import { TagPills } from '../ui/TagPills'
import { profileLabels, type ProfileLabel } from '../../lib/verification/state'
import { VerificationLabel, VerificationLegend } from './VerificationLabel'
import { ContactModal } from './ContactModal'

// Shared renderer for /profile/:handle (platform) and /site/:handle (public
// website). ALL surface/auth differences flow through visibilityFor() —
// nothing here re-derives its own gating.

type TabId = 'overview' | 'experience' | 'portfolio' | 'videos'

export function ProfileView({ data, surface }: { data: ProfileData; surface: Surface }) {
  const { profile, questions } = data
  const { hasAccess } = useSession()
  const rules = visibilityFor(surface, hasAccess)
  const orgs = useOrganizations()
  // What this profile shows (a Member shows one); published rows only.
  const testimonials = useMemo(() => visibleTestimonials(profile, data.testimonials), [profile, data.testimonials])
  // Verification labels (spec §3.1), on /profile and /site alike.
  const labels = useMemo(
    () => profileLabels({ profile, checks: data.checks, testimonials: data.testimonials, orgs }),
    [profile, data.checks, data.testimonials, orgs],
  )
  const shared = { profile, orgs, testimonials, rules, labels }

  const [tab, setTab] = useState<TabId>('overview')
  const [contactOpen, setContactOpen] = useState(false)
  const { save, ui: saveUi } = useSaveCandidate()

  const isFirm = profile.consultant_type !== 'Individual'
  const resumeHref = resumeDownloadUrl(profile)
  // Video Q&As are a Featured Member feature (profiles-membership §5): the
  // tab exists only once Featured status is active.
  const hasVideoTab = rules.videoTabExists && isFeatured(profile)

  const tabs = useMemo(() => {
    const t: { id: TabId; label: string }[] = [{ id: 'overview', label: 'Overview' }]
    // Firms hide Work History + Education (PRD 7.19); the Experience tab only
    // survives for a firm if it has Additional Experience entries.
    if (!isFirm || profile.additional_experience.length > 0)
      t.push({ id: 'experience', label: 'Experience' })
    t.push({ id: 'portfolio', label: 'Portfolio' })
    // No separate Audio Testimonials tab (spec §2.2): testimonials sit inline
    // on employer entries and portfolio items.
    if (hasVideoTab) t.push({ id: 'videos', label: 'Video Q&As' })
    return t
  }, [isFirm, profile.additional_experience.length, hasVideoTab])

  return (
    <div>
      {/* ---- Hero ---- */}
      <div
        className="h-40 bg-brand-100 bg-cover bg-center sm:h-52"
        style={
          profile.cover_image_url
            ? { backgroundImage: `url(${profile.cover_image_url})` }
            : undefined
        }
      />
      <div className="mx-auto max-w-5xl px-4">
        <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt=""
              className="h-24 w-24 rounded-full border-4 border-white object-cover shadow"
            />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-brand-100 text-2xl font-semibold text-brand-700 shadow">
              {profile.name[0]}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {rules.saveActions !== 'hidden' && (
              <>
                <button
                  onClick={() => save(profile, 'favorite')}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink-soft hover:border-ink-faint"
                >
                  <Bookmark size={15} /> Favorite
                </button>
                <button
                  onClick={() => save(profile, 'top_pick')}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink-soft hover:border-ink-faint"
                >
                  <Star size={15} /> Top Pick
                </button>
              </>
            )}
            <button
              onClick={() => setContactOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              <Mail size={15} /> Contact Me
            </button>
            {resumeHref ? (
              <a
                href={resumeHref}
                target="_blank"
                rel="noopener noreferrer"
                download={profile.resume_path ? `${profile.handle}-resume.pdf` : undefined}
                className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink-soft hover:border-ink-faint"
              >
                <Download size={15} /> Résumé
              </a>
            ) : (
              <button
                disabled
                title="No résumé on file for this profile"
                className="flex cursor-not-allowed items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink-faint/60"
              >
                <Download size={15} /> Résumé
              </button>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold sm:text-3xl">{profile.name}</h1>
            <VerificationLabel label={labels.get('identity:identity')} />
            {isFirm && <FirmTypeBadge type={profile.consultant_type as 'Small Firm' | 'Large Firm'} />}
          </div>
          <p className="mt-1 max-w-2xl text-ink-soft">{profile.headline}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-faint">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {profile.location}
              </span>
            )}
            {!isFirm && profile.career_level && (
              <span>{CAREER_LEVEL_LABELS[profile.career_level]}</span>
            )}
            {isFirm && profile.year_founded && (
              <span>{new Date().getFullYear() - profile.year_founded} years in business</span>
            )}
            {spokenLanguages(profile).length > 0 && <span>{formatLanguages(spokenLanguages(profile))}</span>}
          </div>
          {labels.size > 0 && (
            <div className="mt-2 max-w-2xl">
              <VerificationLegend pending={[...labels.values()].includes('pending')} />
            </div>
          )}
        </div>

        {/* ---- Tabs ---- */}
        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition ${
                tab === t.id
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="py-8">
          {tab === 'overview' && (
            <OverviewTab
              data={data}
              rules={rules}
              shared={shared}
              // Testimonials sit on employer entries (Experience) or projects (Portfolio).
              onOpenTestimonials={() =>
                setTab(isFirm || testimonials.every((t) => t.portfolio_item_id) ? 'portfolio' : 'experience')
              }
            />
          )}
          {tab === 'experience' && <ExperienceTab isFirm={isFirm} shared={shared} />}
          {tab === 'portfolio' && <PortfolioTab data={data} shared={shared} />}
          {tab === 'videos' && hasVideoTab && <VideosTab data={data} rules={rules} questions={questions} />}
        </div>
      </div>

      <ContactModal profile={profile} open={contactOpen} onClose={() => setContactOpen(false)} />
      {saveUi}
    </div>
  )
}

// ---------------------------------------------------------------------------

/** Shared by the tabs that show testimonials inline. */
interface Shared {
  profile: Profile
  orgs: OrgIndex
  /** Published and shown (visibleTestimonials). */
  testimonials: AudioTestimonial[]
  rules: ReturnType<typeof visibilityFor>
  /** Verification labels by `${kind}:${id}` (lib/verification/state). */
  labels: Map<string, ProfileLabel>
}

function OverviewTab({
  data,
  rules,
  shared,
  onOpenTestimonials,
}: {
  data: ProfileData
  rules: ReturnType<typeof visibilityFor>
  shared: Shared
  onOpenTestimonials: () => void
}) {
  const { profile } = data
  const { role, hasAccess } = useSession()
  const accountPending = role === 'hiring_manager' && !hasAccess
  // One-line summary (§4.4): a teaser on /profile even logged out; none on /site.
  const summary = rules.audioTestimonials !== 'hidden' ? summaryLine(shared.testimonials, shared.orgs) : null
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr,300px]">
      <div className="space-y-8">
        {summary && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-brand-50 px-3.5 py-2.5 text-sm text-ink-soft">
            <Mic size={15} className="shrink-0 text-brand-600" />
            <span className="font-medium text-ink">{summary}</span>
            <button onClick={onOpenTestimonials} className="font-medium text-brand-600 hover:text-brand-700">
              {rules.audioTestimonials === 'shown' ? 'Listen' : accountPending ? 'Listen once your account is active' : 'Sign up free to listen'}
            </button>
          </p>
        )}
        {profile.detailed_bio && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">Professional summary</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {profile.detailed_bio}
            </p>
          </section>
        )}
        {expertiseTags(profile).length > 0 && (
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Expertise</h2>
              <SelfAttestedMark />
            </div>
            <TagPills tags={expertiseTags(profile)} showWorking />
          </section>
        )}
        {profile.accreditations.length > 0 && (
          <section>
            {/* Every certification listed is checked (spec §3.1): no
                self-attested mark; each carries its label. */}
            <h2 className="mb-2 text-lg font-semibold">Accreditations & Certifications</h2>
            <ul className="space-y-2">
              {profile.accreditations.map((a) => (
                <li key={a.id ?? a.name} className="rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-ink-soft"> — {a.issuing_organization}</span>
                  {a.year && <span className="text-ink-faint"> ({a.year})</span>}
                  {a.credential_id_or_url && (
                    <CredentialRef value={a.credential_id_or_url} />
                  )}
                  {a.id && (
                    <span className="ml-2">
                      <VerificationLabel label={shared.labels.get(`certification:${a.id}`)} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* At-a-Glance */}
      <aside className="h-fit rounded-card border border-line bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
          At a glance
        </h2>
        <dl className="mt-4 space-y-4 text-sm">
          {rules.availability === 'shown' && (
            <div>
              <dt className="mb-1.5 font-medium">Availability</dt>
              <dd>
                <AvailabilityBadges profile={profile} />
                {profile.availability_updated_at && (
                  <p className="mt-1.5 text-xs text-ink-faint">
                    Last updated{' '}
                    {new Date(profile.availability_updated_at).toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </dd>
            </div>
          )}
          {profile.work_types.length > 0 && (
            <div>
              <dt className="mb-1 font-medium">Work arrangement</dt>
              <dd className="text-ink-soft">{profile.work_types.join(' · ')}</dd>
            </div>
          )}
          {rules.contractingEligibility !== 'hidden' && (
            <div>
              <dt className="mb-1 font-medium">Contracting & work eligibility</dt>
              {rules.contractingEligibility === 'gated' ? (
                <dd className="text-xs text-ink-faint">
                  {accountPending ? (
                    <>
                      Shown once your account is active —{' '}
                      <a href="/signup" className="font-medium text-brand-600">
                        see its status
                      </a>
                    </>
                  ) : (
                    <>
                      Available to logged-in hiring accounts —{' '}
                      <a href="/signup" className="font-medium text-brand-600">
                        sign up free
                      </a>
                    </>
                  )}
                </dd>
              ) : (
                <dd className="text-ink-soft">
                  {profile.contracting_work_eligibility ?? 'Not provided'}
                </dd>
              )}
            </div>
          )}
          {profile.website_url && (
            <div>
              <dt className="mb-1 font-medium">Website</dt>
              <dd>
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-brand-600 hover:text-brand-700"
                >
                  <Globe size={14} /> {profile.website_name || 'Personal website'}
                </a>
              </dd>
            </div>
          )}
          {profile.social_links.length > 0 && (
            <div>
              <dt className="mb-1.5 font-medium">Elsewhere</dt>
              <dd className="flex flex-wrap gap-2">
                {profile.social_links.map((link) => {
                  const Icon = platformIcon(link.platform)
                  return (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={link.label || link.platform}
                      className="rounded-full border border-line p-2 text-ink-soft hover:border-brand-400 hover:text-brand-600"
                    >
                      <Icon size={15} />
                    </a>
                  )
                })}
              </dd>
            </div>
          )}
        </dl>
      </aside>
    </div>
  )
}

function CredentialRef({ value }: { value: string }) {
  const isUrl = /^https?:\/\//.test(value)
  if (!isUrl) return <span className="text-xs text-ink-faint"> · ID {value}</span>
  return (
    <a
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-brand-600"
    >
      credential <ExternalLink size={11} />
    </a>
  )
}

// ---------------------------------------------------------------------------

function TimelineEntry({
  logo,
  acronym,
  title,
  subtitle,
  years,
  description,
  label,
  children,
}: {
  logo?: string | null
  acronym?: string | null
  title: string
  subtitle: string
  years: string
  description?: string | null
  /** Verification label (spec §3.1). */
  label?: ProfileLabel

  /** Inline audio testimonials (§4.4). */
  children?: ReactNode
}) {
  return (
    <li className="flex gap-3.5">
      <OrgLogo
        url={logo}
        name={subtitle}
        acronym={acronym}
        className="mt-0.5 h-9 w-9 rounded-lg"
        monogramClassName="font-display text-xs font-bold"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm text-ink-soft">{subtitle}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-faint">
          {years}
          <VerificationLabel label={label} />
        </p>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{description}</p>
        )}
        {children}
      </div>
    </li>
  )
}

function yearsLabel(start: number, end: number | null): string {
  return `${start} – ${end ?? 'Present'}`
}

/** On no employer entry or portfolio item: a legacy "general" reference, or
 *  one whose employer entry no longer exists. */
function isGeneralReference(t: AudioTestimonial, profile: Profile): boolean {
  return !t.portfolio_item_id && !profile.work_history.some((w) => !!w.id && w.id === t.work_history_entry_id)
}

function ExperienceTab({ isFirm, shared }: { isFirm: boolean; shared: Shared }) {
  const { profile, orgs } = shared
  return (
    <div className="max-w-3xl space-y-10">
      {/* Work History + Education are individual-only (PRD 7.19). */}
      {!isFirm && profile.work_history.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Work History</h2>
          <ul className="space-y-5">
            {profile.work_history.map((w, i) => (
              <TimelineEntry
                key={i}
                logo={entryLogoUrl(orgs, w.organization, w.organization_id, w.logo_url)}
                acronym={orgAcronym(resolveOrganization(orgs, w.organization, w.organization_id))}
                title={w.role}
                subtitle={w.organization}
                years={yearsLabel(w.start_year, w.end_year)}
                description={w.description}
                label={w.id ? shared.labels.get(`employer:${w.id}`) : undefined}
              >
                <InlineTestimonials
                  shared={shared}
                  rows={shared.testimonials.filter((t) => !!w.id && t.work_history_entry_id === w.id)}
                />
              </TimelineEntry>
            ))}
          </ul>
        </section>
      )}
      {!isFirm && profile.education_history.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Education</h2>
          <ul className="space-y-5">
            {profile.education_history.map((e, i) => (
              <TimelineEntry
                key={i}
                logo={e.logo_url}
                title={e.degree_or_course}
                subtitle={e.institution}
                years={yearsLabel(e.start_year, e.end_year)}
                label={e.id ? shared.labels.get(`degree:${e.id}`) : undefined}
              />
            ))}
          </ul>
        </section>
      )}
      {/* References on no entry (legacy, or the entry is gone), shown until
          the step 5 re-seed (spec §13). Same visibility as every testimonial. */}
      {shared.testimonials.some((t) => isGeneralReference(t, profile)) && shared.rules.audioTestimonials !== 'hidden' && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">Other references</h2>
          <InlineTestimonials shared={shared} rows={shared.testimonials.filter((t) => isGeneralReference(t, profile))} />
        </section>
      )}
      {profile.additional_experience.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Additional Experience</h2>
          <p className="-mt-3 mb-4 text-xs text-ink-faint">
            Volunteer work, board & advisory roles, fellowships, affiliations
          </p>
          <ul className="space-y-5">
            {profile.additional_experience.map((a, i) => (
              <TimelineEntry
                key={i}
                title={a.role}
                subtitle={a.organization}
                years={yearsLabel(a.start_year, a.end_year)}
                description={a.description}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function PortfolioTab({ data, shared }: { data: ProfileData; shared: Shared }) {
  const { portfolio } = data
  if (portfolio.length === 0)
    return <p className="text-sm text-ink-faint">No portfolio items yet.</p>
  return (
    <div className="space-y-10">
      {portfolio.map((item) => (
        <PortfolioCard
          key={item.id}
          item={item}
          attachedAudio={shared.testimonials.filter((t) => t.portfolio_item_id === item.id)}
          shared={shared}
        />
      ))}
    </div>
  )
}

function PortfolioCard({
  item,
  attachedAudio,
  shared,
}: {
  item: PortfolioItem
  attachedAudio: AudioTestimonial[]
  shared: Shared
}) {
  const images = portfolioImages(item)
  const meta = fmtPortfolioMeta(item)
  // The video link is portfolio content (spec §7.2), shown on both surfaces.
  const videoEmbed = item.video_url ? videoLinkEmbed(item.video_url) : null
  return (
    <article className="grid gap-6 rounded-card border border-line bg-white p-5 md:grid-cols-2">
      <div>
        <Carousel images={images} />
      </div>
      <div className="flex flex-col">
        <h3 className="font-display text-lg font-semibold">{item.project_name}</h3>
        {meta && <p className="mt-0.5 text-sm text-ink-faint">{meta}</p>}
        <p className="mt-0.5 text-sm font-medium text-brand-700">{item.role}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{item.description}</p>
        {item.results && (
          <div className="mt-3 rounded-lg bg-brand-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Results</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{item.results}</p>
          </div>
        )}
        {item.links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.links.slice(0, 3).map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft hover:border-brand-400 hover:text-brand-600"
              >
                {l.label} <ExternalLink size={11} />
              </a>
            ))}
          </div>
        )}
        {videoEmbed && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">Project video</p>
            <iframe
              src={videoEmbed}
              title={`${item.project_name} — project video`}
              className="aspect-video w-full rounded-lg"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {/* Portfolio-attached testimonials follow the testimonial visibility
            rules — stripped on /site, gated for anonymous platform browsers. */}
        <InlineTestimonials shared={shared} rows={attachedAudio} heading="Testimonial for this project" />
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------

function VideosTab({
  data,
  rules,
  questions,
}: {
  data: ProfileData
  rules: ReturnType<typeof visibilityFor>
  questions: ProfileData['questions']
}) {
  // The standard questions in their admin order; Featured Members answer all
  // of them (profiles-membership §5). Never public: a free hiring-manager
  // account is needed to watch.
  const answers = questions
    .map((q) => ({ q, v: data.videos.find((v) => v.kind === 'question' && v.question_id === q.id) }))
    .filter((a): a is { q: (typeof questions)[number]; v: ProfileData['videos'][number] } => !!a.v)
  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-sm text-ink-soft">
        Every Featured Member answers the same {questions.length} interview questions, so you can
        compare like with like.
      </p>
      {rules.videoQnas === 'gated' ? (
        <GatePrompt what="watch this candidate answer the standard interview questions every Featured Member gets" />
      ) : (
        <div className="space-y-6">
          {answers.map(({ q, v }, i) => (
            <div key={v.id}>
              <p className="mb-2 text-sm font-medium">
                {i + 1}. {q.question_text}
              </p>
              <VideoPlayer video={v} title={q.question_text} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

/** Testimonials under an employer entry or portfolio item (§4.4): shown to
 *  signed-in hiring managers, a sign-up prompt for anonymous browsers, and
 *  nothing on the public site. */
function InlineTestimonials({ shared, rows, heading }: { shared: Shared; rows: AudioTestimonial[]; heading?: string }) {
  const { rules, profile, orgs } = shared
  const { role, hasAccess } = useSession()
  if (rows.length === 0 || rules.audioTestimonials === 'hidden') return null
  if (rules.audioTestimonials === 'gated')
    return (
      <p className="mt-3 flex items-start gap-2 rounded-lg bg-paper px-3 py-2.5 text-xs text-ink-soft">
        <Lock size={13} className="mt-0.5 shrink-0 text-brand-500" />
        <span>
          {rows.map((t) => {
            const domain = t.referee_email ? emailDomain(t.referee_email) : null
            const who = t.relationship === 'client' ? 'a client' : t.relationship === 'supervisor' ? 'a supervisor' : 'a reference'
            return domain ? `Audio testimonial from ${who}, confirmed via ${domain} email. ` : `Audio testimonial from ${who}. `
          })}
          {role === 'hiring_manager' && !hasAccess ? (
            <>
              You can listen once your account is active.{' '}
              <a href="/signup" className="font-medium text-brand-600">
                See its status
              </a>
            </>
          ) : (
            <>
              <a href="/signup" className="font-medium text-brand-600">
                Create a free account
              </a>{' '}
              to listen.
            </>
          )}
        </span>
      </p>
    )
  return (
    <div className="mt-3 space-y-3">
      {heading && <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{heading}</p>}
      {rows.map((t) => (
        <TestimonialCard key={t.id} testimonial={t} profile={profile} orgs={orgs} />
      ))}
    </div>
  )
}
