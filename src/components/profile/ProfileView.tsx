import { Bookmark, Download, ExternalLink, Globe, Mail, MapPin, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ProfileData } from '../../hooks/useProfile'
import { fmtPortfolioMeta } from '../../lib/dates'
import { resumeDownloadUrl } from '../../lib/media'
import { useSession } from '../../lib/session'
import { platformIcon } from '../../lib/socials'
import { visibilityFor, type Surface } from '../../lib/visibility'
import type { PortfolioItem, Profile } from '../../types/db'
import { TestimonialCard } from '../media/AudioPlayer'
import { VideoPlayer } from '../media/VideoPlayer'
import { useSaveCandidate } from '../openings/SaveCandidateFlow'
import {
  AvailabilityBadges,
  CAREER_LEVEL_LABELS,
  FirmTypeBadge,
  SelfAttestedMark,
  VerifiedBadge,
} from '../ui/badges'
import { Carousel } from '../ui/Carousel'
import { GatePrompt } from '../ui/GatePrompt'
import { useOrganizations } from '../../hooks/useOrganizations'
import { formatLanguages, spokenLanguages } from '../../lib/languages'
import { entryLogoUrl, orgAcronym, resolveOrganization } from '../../lib/organizations'
import { OrgLogo } from '../ui/OrgLogo'
import { TagPills } from '../ui/TagPills'
import { ContactModal } from './ContactModal'

// Shared renderer for /profile/:handle (platform) and /site/:handle (public
// website). ALL surface/auth differences flow through visibilityFor() —
// nothing here re-derives its own gating.

type TabId = 'overview' | 'experience' | 'portfolio' | 'videos' | 'audio'

export function ProfileView({ data, surface }: { data: ProfileData; surface: Surface }) {
  const { profile, videos, testimonials, questions } = data
  const { isLoggedIn } = useSession()
  const rules = visibilityFor(surface, isLoggedIn)

  const [tab, setTab] = useState<TabId>('overview')
  const [contactOpen, setContactOpen] = useState(false)
  const { save, ui: saveUi } = useSaveCandidate()

  const isFirm = profile.consultant_type !== 'Individual'
  const intro = videos.find((v) => v.kind === 'intro') ?? null
  const resumeHref = resumeDownloadUrl(profile)

  const tabs = useMemo(() => {
    const t: { id: TabId; label: string }[] = [{ id: 'overview', label: 'Overview' }]
    // Firms hide Work History + Education (PRD 7.19); the Experience tab only
    // survives for a firm if it has Additional Experience entries.
    if (!isFirm || profile.additional_experience.length > 0)
      t.push({ id: 'experience', label: 'Experience' })
    t.push({ id: 'portfolio', label: 'Portfolio' })
    if (rules.gatedTabsExist) {
      t.push({ id: 'videos', label: 'Video Q&As' })
      t.push({ id: 'audio', label: 'Audio Testimonials' })
    }
    return t
  }, [isFirm, profile.additional_experience.length, rules.gatedTabsExist])

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
            {profile.verification_status === 'verified' && <VerifiedBadge />}
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
          {tab === 'overview' && <OverviewTab data={data} rules={rules} intro={intro} />}
          {tab === 'experience' && <ExperienceTab profile={profile} isFirm={isFirm} />}
          {tab === 'portfolio' && <PortfolioTab data={data} rules={rules} />}
          {tab === 'videos' && (
            <VideosTab data={data} rules={rules} intro={intro} questions={questions} />
          )}
          {tab === 'audio' && (
            <div className="space-y-4">
              {rules.audioTestimonials === 'gated' ? (
                <GatePrompt what="listen to spoken references from this candidate's former managers and colleagues" />
              ) : testimonials.length === 0 ? (
                <p className="text-sm text-ink-faint">No audio testimonials yet.</p>
              ) : (
                testimonials.map((t) => <TestimonialCard key={t.id} testimonial={t} />)
              )}
            </div>
          )}
        </div>
      </div>

      <ContactModal profile={profile} open={contactOpen} onClose={() => setContactOpen(false)} />
      {saveUi}
    </div>
  )
}

// ---------------------------------------------------------------------------

function OverviewTab({
  data,
  rules,
  intro,
}: {
  data: ProfileData
  rules: ReturnType<typeof visibilityFor>
  intro: ProfileData['videos'][number] | null
}) {
  const { profile } = data
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr,300px]">
      <div className="space-y-8">
        {/* On /site the Video Q&As tab doesn't exist, but the general intro
            video is public (PRD 7.2a) — it surfaces here instead. */}
        {!rules.gatedTabsExist && intro && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">Introduction</h2>
            <VideoPlayer video={intro} title={`${profile.name} — introduction`} />
          </section>
        )}
        {profile.detailed_bio && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">Professional summary</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {profile.detailed_bio}
            </p>
          </section>
        )}
        {profile.expertise.length > 0 && (
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Domain Expertise</h2>
              <SelfAttestedMark />
            </div>
            <TagPills tags={profile.expertise} />
          </section>
        )}
        {profile.skills.length > 0 && (
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Technical Skills</h2>
              <SelfAttestedMark />
            </div>
            <TagPills tags={profile.skills} />
          </section>
        )}
        {profile.accreditations.length > 0 && (
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Accreditations & Certifications</h2>
              <SelfAttestedMark />
            </div>
            <ul className="space-y-2">
              {profile.accreditations.map((a) => (
                <li key={a.name} className="rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-ink-soft"> — {a.issuing_organization}</span>
                  {a.year && <span className="text-ink-faint"> ({a.year})</span>}
                  {a.credential_id_or_url && (
                    <CredentialRef value={a.credential_id_or_url} />
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
                  Available to logged-in hiring accounts —{' '}
                  <a href="/signup" className="font-medium text-brand-600">
                    sign up free
                  </a>
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
}: {
  logo?: string | null
  acronym?: string | null
  title: string
  subtitle: string
  years: string
  description?: string | null
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
        <p className="mt-0.5 text-xs text-ink-faint">{years}</p>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{description}</p>
        )}
      </div>
    </li>
  )
}

function yearsLabel(start: number, end: number | null): string {
  return `${start} – ${end ?? 'Present'}`
}

function ExperienceTab({ profile, isFirm }: { profile: Profile; isFirm: boolean }) {
  const orgs = useOrganizations()
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
              />
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
              />
            ))}
          </ul>
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

function PortfolioTab({
  data,
  rules,
}: {
  data: ProfileData
  rules: ReturnType<typeof visibilityFor>
}) {
  const { portfolio, videos, testimonials } = data
  if (portfolio.length === 0)
    return <p className="text-sm text-ink-faint">No portfolio items yet.</p>
  return (
    <div className="space-y-10">
      {portfolio.map((item) => (
        <PortfolioCard
          key={item.id}
          item={item}
          attachedVideo={videos.find((v) => v.kind === 'portfolio' && v.portfolio_item_id === item.id)}
          attachedAudio={testimonials.filter((t) => t.portfolio_item_id === item.id)}
          rules={rules}
        />
      ))}
    </div>
  )
}

function PortfolioCard({
  item,
  attachedVideo,
  attachedAudio,
  rules,
}: {
  item: PortfolioItem
  attachedVideo: ProfileData['videos'][number] | undefined
  attachedAudio: ProfileData['testimonials']
  rules: ReturnType<typeof visibilityFor>
}) {
  const images = item.cover_image
    ? [{ url: item.cover_image }, ...item.images.filter((i) => i.url !== item.cover_image)]
    : item.images
  const meta = fmtPortfolioMeta(item)
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
        {/* Portfolio-attached media follow the same visibility rules as their
            tabs — stripped on /site, gated for anonymous platform browsers. */}
        {attachedVideo && rules.premiumVideos === 'shown' && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Project video
            </p>
            <VideoPlayer video={attachedVideo} title={`${item.project_name} — project video`} />
          </div>
        )}
        {attachedAudio.length > 0 && rules.audioTestimonials === 'shown' && (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Client reference for this project
            </p>
            {attachedAudio.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} />
            ))}
          </div>
        )}
        {((attachedVideo && rules.premiumVideos === 'gated') ||
          (attachedAudio.length > 0 && rules.audioTestimonials === 'gated')) && (
          <p className="mt-4 rounded-lg bg-paper px-3 py-2 text-xs text-ink-faint">
            This project has attached {attachedVideo ? 'video' : ''}
            {attachedVideo && attachedAudio.length > 0 ? ' and ' : ''}
            {attachedAudio.length > 0 ? 'a client reference' : ''} —{' '}
            <a href="/signup" className="font-medium text-brand-600">
              create a free account
            </a>{' '}
            to view.
          </p>
        )}
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------

function VideosTab({
  data,
  rules,
  intro,
  questions,
}: {
  data: ProfileData
  rules: ReturnType<typeof visibilityFor>
  intro: ProfileData['videos'][number] | null
  questions: ProfileData['questions']
}) {
  const questionVideos = data.videos.filter((v) => v.kind === 'question')
  return (
    <div className="max-w-3xl space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Introduction</h2>
        {intro ? (
          <VideoPlayer video={intro} title={`${data.profile.name} — introduction`} />
        ) : (
          <p className="text-sm text-ink-faint">No introduction video yet.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Standard questions</h2>
        {rules.premiumVideos === 'gated' ? (
          <GatePrompt what="watch this candidate answer the standard interview questions every candidate gets" />
        ) : questionVideos.length === 0 ? (
          <p className="text-sm text-ink-faint">
            No standard-question videos yet.
            {!data.profile.is_premium && ' (Available on Premium profiles.)'}
          </p>
        ) : (
          <div className="space-y-6">
            {questionVideos.map((v) => {
              const q = questions.find((q) => q.id === v.question_id)
              return (
                <div key={v.id}>
                  <p className="mb-2 text-sm font-medium">{q?.question_text ?? 'Standard question'}</p>
                  <VideoPlayer video={v} title={q?.question_text ?? 'Standard question'} />
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
