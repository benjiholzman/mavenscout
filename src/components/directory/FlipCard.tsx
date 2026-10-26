import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Bookmark,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Info,
  MapPin,
  Star,
} from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { logoIconUrl } from '../../lib/brandfetch'
import { fmtPortfolioMeta } from '../../lib/dates'
import { nameInitials } from '../../lib/monogram'
import { EMPTY_ORG_INDEX, sectorExperience, type OrgIndex } from '../../lib/organizations'
import type { MatchResult } from '../../lib/matching/types'
import { RankHeader } from '../match/RankHeader'
import { EXPERTISE_TIER_LIMITS } from '../../lib/config'
import { isFeatured } from '../../lib/membership'
import { portfolioCover } from '../../lib/portfolio'
import { expertiseTags, TIER_LABELS } from '../../lib/expertise'
import type { ExpertiseTag, PortfolioItem, Profile } from '../../types/db'
import { AvailabilityChip } from '../ui/AvailabilityChip'
import { OrgLogo } from '../ui/OrgLogo'
import { Tooltip } from '../ui/Tooltip'
import { useSavedMarks } from '../openings/SaveCandidateFlow'
import { CAREER_LEVEL_LABELS, FeaturedRibbon } from '../ui/badges'

// Flip card (PRD 7.1; faces per profiles-membership §2.1): cycles through
// Front → Expertise → one face per portfolio item (up to 3) — the same faces
// for every member; there is no intro video. In ranking mode the card also
// gets a rank header in the top of its frame: the match %, and a breakdown
// that opens inside the card (so ranked cards in a row can differ in height
// while one is open). Faces change only via the
// ‹ dots › row or a horizontal swipe — no click-anywhere flip, so links and
// chips on a face behave normally. The bottom bar never animates with the card.

type Face =
  | { kind: 'front' }
  | { kind: 'tags'; tags: ExpertiseTag[] }
  | { kind: 'portfolio'; item: PortfolioItem; n: number; of: number }

const SECTOR_LOGO_CAP = 5
const PORTFOLIO_FACE_CAP = 3


export function FlipCard({
  profile,
  portfolio,
  testimonialOrgs,
  orgs = EMPTY_ORG_INDEX,
  onFavorite,
  onTopPick,
  ranked,
}: {
  profile: Profile
  portfolio: PortfolioItem[]
  /** Referees' organizations of the testimonials shown (spec §4.4). */
  testimonialOrgs: string[]
  onFavorite: (profile: Profile) => void
  onTopPick: (profile: Profile) => void
  /** Ranking mode: rank as displayed, the result, and "About this result". */
  ranked?: { position: number; result: MatchResult; onAbout: () => void }
  /** Canonical organizations, for Sector Experience logos and dedupe. */
  orgs?: OrgIndex
}) {
  const marks = useSavedMarks(profile.id)
  const [{ index, direction }, setNav] = useState({ index: 0, direction: 1 })
  const reduceMotion = useReducedMotion()
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const faces = useMemo<Face[]>(() => {
    const f: Face[] = [{ kind: 'front' }]
    const tags = expertiseTags(profile).filter((t) => t.tier !== 'working')
    if (tags.length > 0) f.push({ kind: 'tags', tags })
    const items = portfolio.slice(0, PORTFOLIO_FACE_CAP)
    items.forEach((item, i) => f.push({ kind: 'portfolio', item, n: i + 1, of: items.length }))
    return f
  }, [profile, portfolio])

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
      className={`group/card flex flex-col rounded-card border bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover ${
        isFeatured(profile) ? 'border-gold-500 ring-[0.5px] ring-gold-500' : 'border-line'
      }`}
    >
      {ranked && <RankHeader rank={ranked.position} result={ranked.result} onAbout={ranked.onAbout} />}
      {/* Flip area — fixed height so every card in the grid lines up */}
      <div
        className="relative h-[416px] [perspective:1200px] [touch-action:pan-y]"
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
        {/* Save marks: over the cover, shown on hover (always on touch screens);
            a mark that's on stays shown. */}
        {face.kind === 'front' && (
          <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1">
            <Tooltip
              content={
                <>
                  <b className="font-semibold">Favorites</b> · {marks.saved ? 'saved: change or remove' : 'save to a long list'}
                </>
              }
            >
              <SaveButton
                label={marks.saved ? 'Saved to Favorites: change or remove' : 'Save to Favorites (long list)'}
                pressed={marks.saved}
                hover="hover:text-brand-600"
                on="text-brand-600"
                onClick={() => onFavorite(profile)}
              >
                <Bookmark size={16} className={marks.saved ? 'fill-current' : ''} />
              </SaveButton>
            </Tooltip>
            <Tooltip
              align="center"
              content={
                <>
                  <b className="font-semibold">Starred</b> · {marks.starred ? 'starred: change or unstar' : 'save to a short list'}
                </>
              }
            >
              <SaveButton
                label={marks.starred ? 'Starred: change or unstar' : 'Star (short list)'}
                pressed={marks.starred}
                hover="hover:text-gold-500"
                on="text-gold-500"
                onClick={() => onTopPick(profile)}
              >
                <Star size={16} className={marks.starred ? 'fill-current' : ''} />
              </SaveButton>
            </Tooltip>
          </div>
        )}
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
                portfolio={portfolio}
                orgs={orgs}
                isFirm={isFirm}
                testimonialOrgs={testimonialOrgs}
                squareTop={!!ranked}
              />
            ) : (
              <div className="flex h-full flex-col">
                <BackHeader profile={profile} isFirm={isFirm} />
                {face.kind === 'tags' && <TagsFace tags={face.tags} />}
                {face.kind === 'portfolio' && <PortfolioFace face={face} href={profileHref} />}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom bar — never flips */}
      <div className="rounded-b-card border-t border-line-strong bg-paper">
        <div className="flex h-11 items-center justify-center gap-2">
          {faces.length > 1 && (
            <>
              <NavArrow label="Previous" onClick={() => go(-1)}>
                <ChevronLeft size={18} strokeWidth={2.2} />
              </NavArrow>
              <div className="flex items-center">
                {faces.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => pick(i)}
                    aria-label={`Show face ${i + 1} of ${faces.length}`}
                    aria-current={i === index}
                    className="group flex px-1 py-2.5 focus-visible:outline-none"
                  >
                    <span
                      className={`block h-2 rounded-full transition-all group-focus-visible:ring-2 group-focus-visible:ring-brand-500 group-focus-visible:ring-offset-1 ${
                        i === index ? 'w-5 bg-brand-500' : 'w-2 bg-ink/20 group-hover:bg-ink/40'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <NavArrow label="Next" onClick={() => go(1)}>
                <ChevronRight size={18} strokeWidth={2.2} />
              </NavArrow>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Avatar(props: { profile: Profile; isFirm: boolean; small?: boolean }) {
  return (
    <Link to={`/profile/${props.profile.handle}`} aria-label={props.profile.name} tabIndex={-1} className="shrink-0">
      <AvatarImage {...props} />
    </Link>
  )
}

function AvatarImage({ profile, isFirm, small = false }: { profile: Profile; isFirm: boolean; small?: boolean }) {
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
      {nameInitials(profile.name)}
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
  portfolio,
  orgs: orgIndex,
  isFirm,
  testimonialOrgs,
  squareTop = false,
}: {
  profile: Profile
  portfolio: PortfolioItem[]
  orgs: OrgIndex
  isFirm: boolean
  /** Referees' organizations of the testimonials shown (spec §4.4). */
  testimonialOrgs: string[]
  /** The rank strip sits above, so the cover's top corners stay square. */
  squareTop?: boolean
}) {
  const yearsInBusiness = profile.year_founded
    ? new Date().getFullYear() - profile.year_founded
    : null
  const levelText = isFirm
    ? yearsInBusiness !== null && `${yearsInBusiness} years in business`
    : profile.career_level && CAREER_LEVEL_LABELS[profile.career_level]
  const orgs = sectorExperience(profile, portfolio, orgIndex, SECTOR_LOGO_CAP)

  return (
    <div className="flex h-full flex-col">
      <div
        className={`relative h-[102px] shrink-0 bg-brand-100 bg-cover bg-center ${squareTop ? '' : 'rounded-t-[13px]'}`}
        style={profile.cover_image_url ? { backgroundImage: `url(${profile.cover_image_url})` } : undefined}
      >
        {isFeatured(profile) && <FeaturedRibbon />}
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-3.5">
        <div className="relative -mt-[34px] mb-2 flex items-end justify-between gap-2">
          <Avatar profile={profile} isFirm={isFirm} />
          <div className="flex shrink-0 items-center gap-1.5 pb-1">
            {testimonialOrgs.length > 0 && <TestimonialTeaserChip orgs={testimonialOrgs} />}
          </div>
        </div>
        <NameLink profile={profile} className="shrink-0 text-lg leading-7" />
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
        <div className="shrink-0 pt-3">
          <SectionLabel>Sector experience</SectionLabel>
          {orgs.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {orgs.map((org, i) => (
                <Tooltip key={org.key} content={org.name} align={i < 3 ? 'start' : 'end'}>
                  <span
                    aria-label={org.name}
                    role="img"
                    className="flex h-[54px] w-[54px] overflow-hidden rounded-xl border border-line bg-white p-1"
                  >
                    <OrgLogo
                      url={logoIconUrl(org.logoUrl)}
                      name={org.name}
                      acronym={org.acronym}
                      className="h-full w-full rounded-[7px]"
                      monogramClassName="font-display text-[15px] font-bold"
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

/** "Testimonial from World Bank" (+N more organizations): a published audio
 *  testimonial, confirmed through the referee's work email (spec §4.4). A
 *  teaser for everyone; listening needs a free hiring account. */
function TestimonialTeaserChip({ orgs }: { orgs: string[] }) {
  const more = orgs.length - 1
  const label = `Audio testimonial from ${orgs.join(', ')}`
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex min-w-0 max-w-[13.5rem] items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-[12px] font-medium leading-4 text-brand-700"
    >
      <Headphones size={13} className="shrink-0" aria-hidden />
      <span className="truncate">Testimonial from {orgs[0]}</span>
      {more > 0 && <span className="shrink-0 text-brand-700/70">+{more}</span>}
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

function TagsFace({ tags }: { tags: ExpertiseTag[] }) {
  // Core as prominent chips, Strong as smaller ones (profiles-membership §6);
  // Working knowledge is on the full profile only. Up to 3 + 5 chips: long
  // names truncate inside their chip so the face never scrolls.
  const core = tags.filter((t) => t.tier === 'core').slice(0, EXPERTISE_TIER_LIMITS.core.max)
  const strong = tags.filter((t) => t.tier === 'strong').slice(0, EXPERTISE_TIER_LIMITS.strong.max)
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-4 pb-2.5 pt-3.5">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {core.length > 0 && (
          <section className="shrink-0">
            <SectionLabel>{TIER_LABELS.core}</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {core.map((t) => (
                <span
                  key={t.name}
                  title={t.name}
                  className="max-w-full truncate rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[12.5px] font-medium leading-4 text-brand-800"
                >
                  {t.name}
                </span>
              ))}
            </div>
          </section>
        )}
        {core.length > 0 && strong.length > 0 && <div aria-hidden className="min-h-1 shrink basis-[18px]" />}
        {strong.length > 0 && (
          <section className="shrink-0">
            <SectionLabel>{TIER_LABELS.strong}</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {strong.map((t) => (
                <span
                  key={t.name}
                  title={t.name}
                  className="max-w-full truncate rounded-full border border-line bg-white px-2.5 py-1 text-[12.5px] leading-4 text-ink-soft"
                >
                  {t.name}
                </span>
              ))}
            </div>
          </section>
        )}
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
        <span>Expertise is self-attested</span>
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
  const cover = portfolioCover(item)
  return (
    <>
      <div
        className="relative h-[102px] shrink-0 bg-line bg-cover bg-center"
        style={
          cover
            ? { backgroundImage: `url(${cover})` }
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
        <p className="shrink-0 truncate text-[13.5px] font-medium leading-[19px] text-ink">
          Role: {item.role}
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
      <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover:bg-line-soft group-focus-visible:ring-2 group-focus-visible:ring-brand-500 group-focus-visible:ring-offset-2">
        {children}
      </span>
    </button>
  )
}

function SaveButton({
  label,
  pressed,
  hover,
  on,
  onClick,
  children,
}: {
  label: string
  pressed: boolean
  hover: string
  /** Colour while filled (saved / starred somewhere). */
  on: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${pressed ? on : 'text-ink-soft opacity-0 focus-visible:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100'} ${hover}`}
    >
      {children}
    </button>
  )
}
