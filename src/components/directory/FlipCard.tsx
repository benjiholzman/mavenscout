import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, ChevronLeft, ChevronRight, Mic, Star, Video } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { resolveVideo } from '../../lib/media'
import { useFlipNavVariant } from '../../lib/tweaks'
import type { PortfolioItem, Profile, VideoResponse } from '../../types/db'
import { OrgLogo } from '../ui/OrgLogo'
import { TagPills } from '../ui/TagPills'
import {
  AvailabilityBadges,
  CAREER_LEVEL_LABELS,
  FeaturedRibbon,
  FirmTypeBadge,
  SelfAttestedMark,
  VerifiedBadge,
} from '../ui/badges'

// Flip card (PRD 7.1): cycles through up to six faces — Front → Expertise &
// Skills (Domain Expertise and Technical Skills combined on one face) → up to
// 3 Portfolio items → Video Intro.
// Pagination dots reflect only the faces that exist; the action bar below
// the flip area never animates with the card.

type Face =
  | { kind: 'front' }
  | { kind: 'tags'; sections: { title: string; tags: Profile['expertise'] }[] }
  | { kind: 'portfolio'; item: PortfolioItem }
  | { kind: 'video'; video: VideoResponse }

function recentOrgs(profile: Profile, n = 3) {
  const yearNow = new Date().getFullYear()
  return [...profile.work_history]
    .sort(
      (a, b) =>
        (b.end_year ?? yearNow + 1) - (a.end_year ?? yearNow + 1) || b.start_year - a.start_year,
    )
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

export function FlipCard({
  profile,
  portfolio,
  intro,
  audioCount,
  onFavorite,
  onTopPick,
}: {
  profile: Profile
  portfolio: PortfolioItem[]
  intro: VideoResponse | null
  audioCount: number
  onFavorite: (profile: Profile) => void
  onTopPick: (profile: Profile) => void
}) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const navVariant = useFlipNavVariant()
  const faceRef = useRef<HTMLDivElement>(null)

  const faces = useMemo<Face[]>(() => {
    const f: Face[] = [{ kind: 'front' }]
    const sections = [
      { title: 'Domain Expertise', tags: profile.expertise },
      { title: 'Technical Skills', tags: profile.skills },
    ].filter((s) => s.tags.length > 0)
    if (sections.length > 0) f.push({ kind: 'tags', sections })
    for (const item of portfolio.slice(0, 3)) f.push({ kind: 'portfolio', item })
    if (intro) f.push({ kind: 'video', video: intro })
    return f
  }, [profile, portfolio, intro])

  const go = (delta: number) => {
    setDirection(delta)
    setIndex((i) => (i + delta + faces.length) % faces.length)
  }

  const pick = (i: number) => {
    setDirection(i > index ? 1 : -1)
    setIndex(i)
  }

  const face = faces[index]
  const isFirm = profile.consultant_type !== 'Individual'
  const yearsInBusiness = profile.year_founded
    ? new Date().getFullYear() - profile.year_founded
    : null

  return (
    <div
      className={`flex flex-col rounded-card border bg-white shadow-sm ${
        profile.is_premium ? 'border-gold-500 ring-1 ring-gold-300' : 'border-line'
      }`}
    >
      {/* Flip area */}
      <div className="group/flip relative overflow-hidden rounded-t-card" style={{ perspective: 1200 }}>
        {profile.is_premium && index === 0 && <FeaturedRibbon />}
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={index}
            ref={faceRef}
            custom={direction}
            initial={{ rotateY: direction * -65, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: direction * 65, opacity: 0 }}
            transition={{ duration: 0.13, ease: 'easeOut' }}
            drag={faces.length > 1 && face.kind !== 'video' ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            // Tap-card variant: a tap (not a drag) on the left third goes back, the
            // rest goes forward. The video face is exempt so its controls work.
            onTap={(_, info) => {
              if (navVariant !== 'tap' || faces.length < 2 || face.kind === 'video') return
              const rect = faceRef.current?.getBoundingClientRect()
              if (!rect) return
              const x = info.point.x - rect.left - window.scrollX
              go(x < rect.width / 3 ? -1 : 1)
            }}
            tabIndex={navVariant === 'tap' && face.kind !== 'video' ? 0 : undefined}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') go(1)
              else if (e.key === 'ArrowLeft') go(-1)
            }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(1)
              else if (info.offset.x > 60) go(-1)
            }}
            className={`h-[460px] ${navVariant === 'tap' && face.kind !== 'video' ? 'cursor-pointer' : ''}`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {face.kind === 'front' && (
              <div className="flex h-full flex-col">
                <div
                  className="h-[120px] shrink-0 bg-brand-100 bg-cover bg-center"
                  style={
                    profile.cover_image_url
                      ? { backgroundImage: `url(${profile.cover_image_url})` }
                      : undefined
                  }
                />
                <div className="relative flex-1 px-4 pb-3">
                  <div className="-mt-[45px] flex items-end justify-between">
                    {profile.photo_url ? (
                      <img
                        src={profile.photo_url}
                        alt=""
                        className="h-[90px] w-[90px] rounded-full border-2 border-white object-cover shadow"
                      />
                    ) : (
                      <span className="flex h-[90px] w-[90px] items-center justify-center rounded-full border-2 border-white bg-brand-100 text-2xl font-semibold text-brand-700 shadow">
                        {monogram(profile.name)}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 pb-1">
                      {profile.verification_status === 'verified' && <VerifiedBadge compact />}
                      {intro && <Video size={14} className="text-brand-500" aria-label="Has intro video" />}
                      {audioCount > 0 && (
                        <Mic size={14} className="text-brand-500" aria-label="Has audio testimonials" />
                      )}
                    </div>
                  </div>
                  <h3 className="mt-2 truncate font-display text-lg font-semibold">{profile.name}</h3>
                  <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{profile.headline}</p>
                  <p className="mt-1.5 text-xs text-ink-faint">{profile.location}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    {isFirm ? (
                      <>
                        <FirmTypeBadge type={profile.consultant_type as 'Small Firm' | 'Large Firm'} />
                        {yearsInBusiness !== null && (
                          <span className="text-ink-faint">{yearsInBusiness} years in business</span>
                        )}
                      </>
                    ) : (
                      profile.career_level && (
                        <span className="rounded-full bg-ink/5 px-2 py-0.5 font-medium text-ink-soft">
                          {CAREER_LEVEL_LABELS[profile.career_level]}
                        </span>
                      )
                    )}
                    {profile.work_types.map((w) => (
                      <span key={w} className="rounded-full border border-line px-2 py-0.5 text-ink-faint">
                        {w}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2.5">
                    <AvailabilityBadges profile={profile} />
                  </div>
                  {profile.work_history.length > 0 && (
                    <div className="absolute inset-x-4 bottom-3">
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                        Sector experience
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {recentOrgs(profile).map((org) => (
                          <span
                            key={org.organization}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-paper px-2 py-1 text-xs text-ink-soft"
                            title={`${org.role}, ${org.organization}`}
                          >
                            <OrgLogo url={org.logo_url} name={org.organization} />
                            <span className="truncate">{org.organization}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {face.kind === 'tags' && (
              <div className="flex h-full flex-col overflow-hidden px-4 pb-7 pt-4">
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                  {face.sections.map((section, i) => (
                    <section key={section.title}>
                      <div className="mb-2 flex items-baseline justify-between">
                        <h4 className="font-display text-base font-semibold">{section.title}</h4>
                        {i === 0 && <SelfAttestedMark />}
                      </div>
                      <TagPills tags={section.tags} />
                    </section>
                  ))}
                </div>
              </div>
            )}

            {face.kind === 'portfolio' && (
              <div className="flex h-full flex-col">
                {face.item.cover_image && (
                  <img
                    src={face.item.cover_image}
                    alt=""
                    className="h-36 w-full shrink-0 object-cover"
                    draggable={false}
                  />
                )}
                <div className="flex min-h-0 flex-1 flex-col p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                    Featured project
                  </p>
                  <h4 className="mt-1 line-clamp-2 font-display text-base font-semibold">
                    {face.item.project_name}
                  </h4>
                  <p className="mt-0.5 text-xs font-medium text-brand-700">{face.item.role}</p>
                  <p className="mt-2 line-clamp-4 text-sm text-ink-soft">{face.item.description}</p>
                </div>
              </div>
            )}

            {face.kind === 'video' && <VideoFace video={face.video} name={profile.name} />}
          </motion.div>
        </AnimatePresence>

        {/* Face navigation (variant chosen via the dev Tweaks panel) */}
        {faces.length > 1 && navVariant !== 'bar' && navVariant !== 'tap' && (
          <>
            {(navVariant === 'overlay' || navVariant === 'hover') && (
              <>
                <button
                  aria-label="Previous"
                  onClick={() => go(-1)}
                  className={`absolute left-1.5 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/85 p-1 text-ink-soft shadow hover:text-ink ${
                    navVariant === 'hover' ? 'hidden [@media(hover:hover)]:group-hover/flip:block' : ''
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  aria-label="Next"
                  onClick={() => go(1)}
                  className={`absolute right-1.5 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/85 p-1 text-ink-soft shadow hover:text-ink ${
                    navVariant === 'hover' ? 'hidden [@media(hover:hover)]:group-hover/flip:block' : ''
                  }`}
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}
            <div className="absolute bottom-1.5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-white/85 px-2 py-1 shadow-sm">
              <Dots count={faces.length} index={index} onPick={pick} />
            </div>
          </>
        )}
      </div>

      {faces.length > 1 && (navVariant === 'bar' || navVariant === 'tap') && (
        <div className="flex items-center justify-between border-t border-line px-2 py-1">
          <button
            aria-label="Previous"
            onClick={() => go(-1)}
            className="rounded-full p-1.5 text-ink-soft hover:bg-paper hover:text-ink"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex gap-1.5">
            <Dots count={faces.length} index={index} onPick={pick} />
          </div>
          <button
            aria-label="Next"
            onClick={() => go(1)}
            className="rounded-full p-1.5 text-ink-soft hover:bg-paper hover:text-ink"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Persistent action bar — never animates with the card */}
      <div className="flex items-center gap-1 border-t border-line px-2 py-2">
        <button
          onClick={() => onFavorite(profile)}
          className="rounded-full p-2 text-ink-faint hover:bg-paper hover:text-brand-600"
          aria-label="Save to long list (Favorite)"
          title="Favorite — save to long list"
        >
          <Bookmark size={18} />
        </button>
        <button
          onClick={() => onTopPick(profile)}
          className="rounded-full p-2 text-ink-faint hover:bg-paper hover:text-gold-500"
          aria-label="Save as Top Pick (short list)"
          title="Top Pick — save to short list"
        >
          <Star size={18} />
        </button>
        <Link
          to={`/profile/${profile.handle}`}
          className="ml-auto rounded-full bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          View Profile
        </Link>
      </div>
    </div>
  )
}

function Dots({
  count,
  index,
  onPick,
}: {
  count: number
  index: number
  onPick: (i: number) => void
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          aria-label={`Face ${i + 1}`}
          onClick={() => onPick(i)}
          className={`h-1.5 rounded-full transition-all ${
            i === index ? 'w-4 bg-brand-500' : 'w-1.5 bg-ink/20 hover:bg-ink/40'
          }`}
        />
      ))}
    </>
  )
}

function VideoFace({ video, name }: { video: VideoResponse; name: string }) {
  const playable = resolveVideo(video)
  return (
    <div className="flex h-full flex-col bg-ink">
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
      <p className="px-4 py-2.5 text-xs text-white/70">
        Video introduction
      </p>
    </div>
  )
}
