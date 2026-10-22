import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Bookmark,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info,
  MapPin,
  Mic,
  Star,
  Video,
} from 'lucide-react'
import { Fragment, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { logoIconUrl } from '../../lib/brandfetch'
import { fmtPortfolioMeta } from '../../lib/dates'
import { resolveVideo } from '../../lib/media'
import { preferencePercent, rowPointsLabel, rowsByWeight, scoreBreakdown } from '../../lib/matching/display'
import type { MatchResult } from '../../lib/matching/types'
import { OutcomeIcon, ScoreEquation } from '../match/outcome'
import { RankStrip } from '../match/RankStrip'
import { PRIMARY_CAP, SECONDARY_CAP } from '../../lib/validation'
import type { PortfolioItem, Profile, TagSelection, VideoResponse } from '../../types/db'
import { AvailabilityChip } from '../ui/AvailabilityChip'
import { ButtonLink } from '../ui/Button'
import { OrgLogo } from '../ui/OrgLogo'
import { Tooltip } from '../ui/Tooltip'
import { CAREER_LEVEL_LABELS, FeaturedRibbon, VerifiedBadge } from '../ui/badges'

// Flip card (PRD 7.1): cycles through Front → Expertise & Skills → one face
// per portfolio item (up to 3) → Video Intro. In ranking mode (match rework
// spec §7) the card also gets a fixed-height rank strip in the top of its
// frame and a "Match" face inserted right after Front. Faces change only via the
// ‹ dots › row or a horizontal swipe — no click-anywhere flip, so links and
// chips on a face behave normally. The bottom bar never animates with the card.

type Face =
  | { kind: 'front' }
  | { kind: 'match'; result: MatchResult }
  | { kind: 'tags'; sections: { title: string; tags: TagSelection[] }[] }
  | { kind: 'portfolio'; item: PortfolioItem; n: number; of: number }
  | { kind: 'video'; video: VideoResponse }

const SECTOR_LOGO_CAP = 5
const PORTFOLIO_FACE_CAP = 3

/** Most recent distinct organizations, current roles first. */
function recentOrgs(profile: Profile, n: number) {
  const yearNow = new Date().getFullYear()
  const seen = new Set<string>()
  return [...profile.work_history]
    .sort(
      (a, b) =>
        (b.end_year ?? yearNow + 1) - (a.end_year ?? yearNow + 1) || b.start_year - a.start_year,
    )
    .filter((o) => !seen.has(o.organization) && seen.add(o.organization))
    .slice(0, n)
}

function monogram(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Z0-9]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

const tagLabel = (t: TagSelection) => t.name + (t.level === 'category' ? ' (broad)' : '')

export function FlipCard({
  profile,
  portfolio,
  intro,
  audioCount,
  onFavorite,
  onTopPick,
  ranked,
}: {
  profile: Profile
  portfolio: PortfolioItem[]
  intro: VideoResponse | null
  audioCount: number
  onFavorite: (profile: Profile) => void
  onTopPick: (profile: Profile) => void
  /** Ranking mode: rank as displayed, the result, and "About this result". */
  ranked?: { position: number; result: MatchResult; onAbout: () => void }
}) {
  const [{ index, direction }, setNav] = useState({ index: 0, direction: 1 })
  const reduceMotion = useReducedMotion()
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const faces = useMemo<Face[]>(() => {
    const f: Face[] = [{ kind: 'front' }]
    if (ranked) f.push({ kind: 'match', result: ranked.result })
    const sections = [
      { title: 'Domain Expertise', tags: profile.expertise },
      { title: 'Technical Skills', tags: profile.skills },
    ].filter((s) => s.tags.length > 0)
    if (sections.length > 0) f.push({ kind: 'tags', sections })
    const items = portfolio.slice(0, PORTFOLIO_FACE_CAP)
    items.forEach((item, i) => f.push({ kind: 'portfolio', item, n: i + 1, of: items.length }))
    if (intro) f.push({ kind: 'video', video: intro })
    return f
  }, [profile, portfolio, intro, ranked])

  const go = (delta: number) =>
    setNav(({ index: i }) => ({
      index: (i + delta + faces.length) % faces.length,
      direction: delta,
    }))
  const pick = (i: number) => i !== index && setNav({ index: i, direction: i > index ? 1 : -1 })

  const face = faces[index]
  const isFirm = profile.consultant_type !== 'Individual'
  const profileHref = `/profile/${profile.handle}`
  const turn = reduceMotion ? 0 : 90

  return (
    <div
      className={`flex flex-col rounded-card border bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover ${
        profile.is_premium ? 'border-gold-500 ring-[0.5px] ring-gold-500' : 'border-line'
      }`}
    >
      {ranked && (
        <RankStrip
          rank={ranked.position}
          total={ranked.result.total_score}
          band={ranked.result.band}
          onAbout={ranked.onAbout}
        />
      )}
      {/* Flip area — fixed height so every card in the grid lines up */}
      <div
        className="relative h-[444px] [perspective:1200px] [touch-action:pan-y]"
        onTouchStart={(e) => {
          const t = e.touches[0]
          touchStart.current = { x: t.clientX, y: t.clientY }
        }}
        onTouchEnd={(e) => {
          const start = touchStart.current
          touchStart.current = null
          if (!start || faces.length < 2) return
          const t = e.changedTouches[0]
          const dx = t.clientX - start.x
          const dy = t.clientY - start.y
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
        }}
      >
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            variants={{
              enter: (d: number) => ({ rotateY: -d * turn }),
              center: { rotateY: 0, transition: { duration: 0.11, ease: 'easeOut' } },
              exit: (d: number) => ({ rotateY: d * turn, transition: { duration: 0.09, ease: 'easeIn' } }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            className="h-full"
          >
            {face.kind === 'front' ? (
              <FrontFace
                profile={profile}
                isFirm={isFirm}
                hasVideo={!!intro}
                audioCount={audioCount}
                squareTop={!!ranked}
              />
            ) : (
              <div className="flex h-full flex-col">
                <BackHeader profile={profile} isFirm={isFirm} />
                {face.kind === 'match' && <MatchFace result={face.result} onMore={ranked?.onAbout} />}
                {face.kind === 'tags' && <TagsFace sections={face.sections} />}
                {face.kind === 'portfolio' && <PortfolioFace face={face} href={profileHref} />}
                {face.kind === 'video' && <VideoFace video={face.video} name={profile.name} />}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom bar — never flips */}
      <div className="rounded-b-card border-t border-line-strong bg-paper">
        <div className="flex h-8 items-center justify-center gap-1.5 pt-0.5">
          {faces.length > 1 && (
            <>
              <NavArrow label="Previous" onClick={() => go(-1)}>
                <ChevronLeft size={16} strokeWidth={2.2} />
              </NavArrow>
              <div className="flex items-center">
                {faces.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => pick(i)}
                    aria-label={`Show face ${i + 1} of ${faces.length}`}
                    aria-current={i === index}
                    className="group flex px-[3px] py-[7px] focus-visible:outline-none"
                  >
                    <span
                      className={`block h-1.5 rounded-full transition-all group-focus-visible:ring-2 group-focus-visible:ring-brand-500 group-focus-visible:ring-offset-1 ${
                        i === index ? 'w-4 bg-brand-500' : 'w-1.5 bg-ink/20 group-hover:bg-ink/40'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <NavArrow label="Next" onClick={() => go(1)}>
                <ChevronRight size={16} strokeWidth={2.2} />
              </NavArrow>
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-0.5">
          <div className="-ml-2 flex items-center">
            <Tooltip
              content={
                <>
                  <b className="font-semibold">Favorite</b> · save to long list
                </>
              }
            >
              <SaveButton label="Save to long list (Favorite)" hover="hover:text-brand-600" onClick={() => onFavorite(profile)}>
                <Bookmark size={18} />
              </SaveButton>
            </Tooltip>
            <Tooltip
              align="center"
              content={
                <>
                  <b className="font-semibold">Top Pick</b> · save to short list
                </>
              }
            >
              <SaveButton label="Save as Top Pick (short list)" hover="hover:text-gold-500" onClick={() => onTopPick(profile)}>
                <Star size={18} />
              </SaveButton>
            </Tooltip>
          </div>
          <ButtonLink to={profileHref} variant="tint">
            View profile
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}

function Avatar({ profile, isFirm, small = false }: { profile: Profile; isFirm: boolean; small?: boolean }) {
  const shape = isFirm ? (small ? 'rounded-[9px]' : 'rounded-[14px]') : 'rounded-full'
  const size = small
    ? 'h-[34px] w-[34px] text-xs'
    : 'h-[68px] w-[68px] border-[3px] border-white text-[22px] shadow-[0_1px_4px_rgba(34,51,59,.18)]'
  return profile.photo_url ? (
    <img src={profile.photo_url} alt="" className={`shrink-0 object-cover ${shape} ${size}`} />
  ) : (
    <span
      className={`flex shrink-0 items-center justify-center bg-brand-100 font-display font-semibold text-brand-700 ${shape} ${size}`}
    >
      {monogram(profile.name)}
    </span>
  )
}

function NameLink({ profile, className }: { profile: Profile; className: string }) {
  return (
    <Link
      to={`/profile/${profile.handle}`}
      className={`block min-w-0 truncate font-display font-semibold text-ink underline-offset-[3px] hover:text-brand-600 hover:underline ${className}`}
    >
      {profile.name}
    </Link>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-[9px] flex items-center gap-2.5">
      <h4 className="whitespace-nowrap text-[11px] font-semibold uppercase leading-4 tracking-[.06em] text-ink-faint">
        {children}
      </h4>
      <span className="h-px flex-1 bg-line-soft" />
    </div>
  )
}

function MetaRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-ink-faint">{icon}</span>
      {children}
    </div>
  )
}

function FrontFace({
  profile,
  isFirm,
  hasVideo,
  audioCount,
  squareTop = false,
}: {
  profile: Profile
  isFirm: boolean
  hasVideo: boolean
  audioCount: number
  /** The rank strip sits above, so the cover's top corners stay square. */
  squareTop?: boolean
}) {
  const yearsInBusiness = profile.year_founded
    ? new Date().getFullYear() - profile.year_founded
    : null
  const levelText = isFirm
    ? yearsInBusiness !== null && `${yearsInBusiness} years in business`
    : profile.career_level && CAREER_LEVEL_LABELS[profile.career_level]
  const orgs = recentOrgs(profile, SECTOR_LOGO_CAP)

  return (
    <div className="flex h-full flex-col">
      <div
        className={`relative h-[120px] shrink-0 bg-brand-100 bg-cover bg-center ${squareTop ? '' : 'rounded-t-[13px]'}`}
        style={profile.cover_image_url ? { backgroundImage: `url(${profile.cover_image_url})` } : undefined}
      >
        {profile.is_premium && <FeaturedRibbon />}
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-3.5">
        <div className="relative -mt-[34px] mb-2 flex items-end justify-between gap-2">
          <Avatar profile={profile} isFirm={isFirm} />
          <div className="flex shrink-0 items-center gap-1.5 pb-1">
            {hasVideo && (
              <MediaIcon label="Has intro video">
                <Video size={14} />
              </MediaIcon>
            )}
            {audioCount > 0 && (
              <MediaIcon label="Has audio references">
                <Mic size={14} />
              </MediaIcon>
            )}
            {profile.verification_status === 'verified' && <VerifiedBadge plain />}
          </div>
        </div>
        <NameLink profile={profile} className="text-lg leading-6" />
        <p className="mt-1 line-clamp-2 shrink-0 pb-px text-sm leading-5 text-ink-soft">
          {profile.headline}
        </p>
        <div className="mb-1.5 mt-3 flex shrink-0 flex-col gap-2 text-sm leading-5 text-ink-soft">
          {profile.location && (
            <MetaRow icon={<MapPin size={15} />}>
              <span className="truncate">{profile.location}</span>
            </MetaRow>
          )}
          {(levelText || isFirm) && (
            <MetaRow icon={<Briefcase size={15} />}>
              {levelText && <span className="truncate">{levelText}</span>}
              {isFirm && (
                <span className="flex shrink-0 items-center whitespace-nowrap">
                  {levelText && <span className="mr-2 h-1 w-1 rounded-full bg-ink-faint" />}
                  {profile.consultant_type}
                </span>
              )}
            </MetaRow>
          )}
          <MetaRow icon={<Calendar size={15} />}>
            <div className="flex min-w-0 items-center gap-2.5">
              <AvailabilityChip kind="PT" track={profile.part_time_availability} />
              <AvailabilityChip kind="FT" track={profile.full_time_availability} />
            </div>
          </MetaRow>
        </div>
        <div className="mt-auto shrink-0 pt-2.5">
          <SectionLabel>Sector experience</SectionLabel>
          {orgs.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {orgs.map((org, i) => (
                <Tooltip key={org.organization} content={org.organization} align={i < 3 ? 'start' : 'end'}>
                  <span
                    aria-label={org.organization}
                    role="img"
                    className="flex h-[54px] w-[54px] overflow-hidden rounded-xl border border-line bg-white p-1 hover:border-brand-300"
                  >
                    <OrgLogo
                      url={logoIconUrl(org.logo_url)}
                      name={org.organization}
                      className="h-full w-full rounded-[7px]"
                      monogramClassName="bg-brand-100 text-[11px] font-bold text-brand-700"
                    />
                  </span>
                </Tooltip>
              ))}
            </div>
          ) : (
            <p className="flex h-[54px] items-center text-[12.5px] text-ink-faint">Not listed yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

function MediaIcon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span
      role="img"
      aria-label={label}
      className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-brand-50 text-brand-700"
    >
      {children}
    </span>
  )
}

function BackHeader({ profile, isFirm }: { profile: Profile; isFirm: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 border-b border-line-soft px-4 py-3">
      <Avatar profile={profile} isFirm={isFirm} small />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <NameLink profile={profile} className="text-[14.5px] leading-5" />
          {profile.verification_status === 'verified' && (
            <span className="flex shrink-0">
              <VerifiedBadge compact plain />
            </span>
          )}
        </div>
        {profile.location && (
          <p className="flex min-w-0 items-center gap-[5px] text-[13px] leading-[17px] text-ink-faint">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{profile.location}</span>
          </p>
        )}
      </div>
    </div>
  )
}

const MATCH_FACE_MAX_ROWS = 6

/** "Match" face (spec §7.2): Fit bar, the preference rows with their own
 *  points ("3 of 3 pts"), the Required line and the equation — where the
 *  preferences convert to score points once, so it adds up.
 *  Fits the face without scrolling; overflow goes to "About this result". */
function MatchFace({ result, onMore }: { result: MatchResult; onMore?: () => void }) {
  const b = scoreBreakdown(result)
  const rows = rowsByWeight(b.rows)
  const shown = rows.slice(0, MATCH_FACE_MAX_ROWS)
  const hidden = rows.length - shown.length
  const musts = result.must_haves_passed.length
  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-3.5">
      <div className="shrink-0">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-medium text-ink">Fit to the JD</span>
          <span className="font-semibold tabular-nums text-ink">{b.fit}</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line-soft">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${b.fit}%` }} />
        </div>
      </div>

      <div className="mt-3.5 shrink-0">
        <SectionLabel>
          Your preferences{b.scoring.weight > 0 ? ` · ${preferencePercent(b.scoring)} of score` : ''}
        </SectionLabel>
        {shown.length === 0 ? (
          <p className="text-[13px] text-ink-faint">No Nice to have or Important rows.</p>
        ) : (
          <ul className="space-y-1">
            {shown.map((r) => {
              const a = r.adjustment
              return (
              <li key={a.requirement_id} className="flex items-center gap-2 text-[13px] leading-5">
                <OutcomeIcon outcome={a.outcome} />
                <span className="min-w-0 flex-1 truncate text-ink-soft" title={`${a.label} — ${a.detail}`}>
                  {a.label}
                </span>
                <span className="shrink-0 tabular-nums text-ink-faint">{rowPointsLabel(r)}</span>
              </li>
              )
            })}
          </ul>
        )}
        {hidden > 0 && (
          <button
            type="button"
            onClick={onMore}
            className="mt-1 text-xs font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-600"
          >
            +{hidden} more
          </button>
        )}
      </div>

      <div className="mt-auto shrink-0 space-y-1.5 border-t border-line-soft pt-2.5">
        {musts > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span className="text-brand-600" aria-hidden>✓</span>
            Meets {musts === 1 ? 'the Required row' : `all ${musts} Required rows`}
          </p>
        )}
        <ScoreEquation b={b} className="text-[12.5px] leading-[18px] text-ink" />
      </div>
    </div>
  )
}

function TagsFace({ sections }: { sections: { title: string; tags: TagSelection[] }[] }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-4 pb-2.5 pt-3.5">
      {/* Secondary lines clamp to 2; the gap between sections shrinks (22px →
          4px) when long primary pills wrap, so the worst case still fits. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {sections.map((s, i) => {
          const primary = s.tags.filter((t) => t.tier === 'primary').slice(0, PRIMARY_CAP)
          const secondary = s.tags.filter((t) => t.tier === 'secondary').slice(0, SECONDARY_CAP)
          return (
            <Fragment key={s.title}>
              {i > 0 && <div aria-hidden className="min-h-1 shrink basis-[22px]" />}
              <section className="shrink-0">
                <SectionLabel>{s.title}</SectionLabel>
                {primary.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {primary.map((t) => (
                      <span
                        key={t.name}
                        className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[12.5px] font-medium leading-4 text-brand-800"
                      >
                        {tagLabel(t)}
                      </span>
                    ))}
                  </div>
                )}
                {secondary.length > 0 && (
                  <p className={`line-clamp-2 text-[13.5px] leading-5 text-ink-soft ${primary.length > 0 ? 'mt-2' : ''}`}>
                    <span className="text-ink-faint">+</span> {secondary.map(tagLabel).join(' · ')}
                  </p>
                )}
              </section>
            </Fragment>
          )
        })}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-xs leading-4 text-ink-faint">
        <Tooltip tapToggle content="Listed by the consultant; not verified by MavenScout.">
          <button
            type="button"
            aria-label="Listed by the consultant; not verified by MavenScout."
            className="flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Info size={14} />
          </button>
        </Tooltip>
        <span>Expertise and skills are self-attested</span>
      </div>
    </div>
  )
}

function PortfolioFace({
  face,
  href,
}: {
  face: Extract<Face, { kind: 'portfolio' }>
  href: string
}) {
  const { item } = face
  const meta = fmtPortfolioMeta(item)
  return (
    <>
      <div
        className="relative h-[138px] shrink-0 bg-line bg-cover bg-center"
        style={
          item.cover_image
            ? { backgroundImage: `url(${item.cover_image})` }
            : { backgroundImage: 'repeating-linear-gradient(135deg,#EEEAE3 0 8px,#F4F1EC 8px 16px)' }
        }
      >
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[.06em] text-ink-soft shadow-sm">
          {face.of > 1 ? `Portfolio · ${face.n} of ${face.of}` : 'Portfolio'}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-3.5">
        <Link
          to={href}
          className="line-clamp-2 shrink-0 pb-px font-display text-base font-semibold leading-[21px] text-ink underline-offset-[3px] hover:text-brand-600 hover:underline"
        >
          {item.project_name}
        </Link>
        {meta && (
          <p className="mt-1 shrink-0 truncate text-[13.5px] leading-[19px] text-ink-faint">{meta}</p>
        )}
        <div className="mb-2 mt-[9px] h-px shrink-0 bg-line-soft" />
        <p className="shrink-0 truncate text-[13.5px] leading-[19px] text-ink-soft">
          <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-ink-faint">
            Role
          </span>
          {item.role}
        </p>
        <p className="mt-1.5 line-clamp-5 text-[13.5px] leading-5 text-ink-soft">{item.description}</p>
      </div>
    </>
  )
}

function NavArrow({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="group -mx-1.5 -my-1 flex h-10 w-10 items-center justify-center text-ink-faint hover:text-ink focus-visible:text-ink focus-visible:outline-none"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full transition-colors group-hover:bg-line-soft group-focus-visible:ring-2 group-focus-visible:ring-brand-500 group-focus-visible:ring-offset-2">
        {children}
      </span>
    </button>
  )
}

function SaveButton({
  label,
  hover,
  onClick,
  children,
}: {
  label: string
  hover: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex h-10 w-[34px] items-center justify-center rounded-full text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${hover}`}
    >
      {children}
    </button>
  )
}

function VideoFace({ video, name }: { video: VideoResponse; name: string }) {
  const playable = resolveVideo(video)
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ink">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {playable?.kind === 'embed' ? (
          <iframe
            src={playable.src}
            title={`${name} — video introduction`}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : playable ? (
          <video src={playable.src} controls className="max-h-full w-full" preload="metadata" />
        ) : (
          <p className="text-sm text-white/60">Video unavailable</p>
        )}
      </div>
      <p className="px-4 py-2.5 text-xs text-white/70">Video introduction</p>
    </div>
  )
}
