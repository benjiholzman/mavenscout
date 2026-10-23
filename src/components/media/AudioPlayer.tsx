import { BadgeCheck, ExternalLink } from 'lucide-react'
import { useRef } from 'react'
import { fmtLongMonthYear } from '../../lib/dates'
import { audioPublicUrl } from '../../lib/media'
import type { OrgIndex } from '../../lib/organizations'
import { logEvent } from '../../lib/testimonials/audit'
import { confirmationLine } from '../../lib/testimonials/display'
import { isLegacy } from '../../lib/testimonials/rules'
import type { AudioTestimonial, Profile } from '../../types/db'
import { TranscriptDisclosure } from './VideoPlayer'

/** Streaming player (§4.7): no download control or context menu. The file
 *  is still in a public bucket this build, so this hides download rather
 *  than preventing it; the hardening pass moves to a private bucket with
 *  short-lived signed URLs. The first play per view is logged as a listen. */
export function StreamingAudio({ t, className = '' }: { t: AudioTestimonial; className?: string }) {
  const logged = useRef(false)
  if (!t.audio_path) return null
  return (
    <audio
      controls
      controlsList="nodownload noplaybackrate"
      preload="metadata"
      src={audioPublicUrl(t.audio_path)}
      onContextMenu={(e) => e.preventDefault()}
      onPlay={() => {
        if (logged.current) return
        logged.current = true
        logEvent(t.id, 'listened', 'manager', { page: window.location.pathname })
      }}
      className={`w-full ${className}`}
    />
  )
}

/** One published audio testimonial (§4.4): who, how they were confirmed,
 *  the relationship, the recording date, the recording and its transcript. */
export function TestimonialCard({
  testimonial: t,
  profile,
  orgs,
}: {
  testimonial: AudioTestimonial
  profile: Profile
  orgs: OrgIndex
}) {
  if (isLegacy(t)) return <LegacyTestimonialCard t={t} />
  const line = confirmationLine(t, profile, orgs)
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <p className="text-sm text-ink">
        <span className="font-semibold">{line.who}</span>
        {line.confirmed && (
          <span className="ml-1 inline-flex items-center gap-0.5 text-xs font-medium text-emerald-700">
            <BadgeCheck size={13} className="shrink-0" /> {line.confirmed}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-sm text-ink-soft">{line.relationship}</p>
      {t.submitted_at && <p className="mt-0.5 text-xs text-ink-faint">Recorded {fmtLongMonthYear(t.submitted_at)}</p>}
      <StreamingAudio t={t} className="mt-3" />
      <TranscriptDisclosure transcript={t.transcript} />
    </div>
  )
}

/** References from before the referee flow (no confirmed email), shown
 *  until the step 5 re-seed. */
function LegacyTestimonialCard({ t }: { t: AudioTestimonial }) {
  const date = t.reference_date ? fmtLongMonthYear(t.reference_date) : null
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <p className="text-sm font-semibold">
        {t.reference_name ?? 'Reference'}
        {t.verification_url && (
          <a
            href={t.verification_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-brand-600 hover:text-brand-700"
            title="Verify this reference on their institution's site"
          >
            verify <ExternalLink size={11} />
          </a>
        )}
      </p>
      <p className="text-xs text-ink-soft">{[t.reference_title, t.reference_org].filter(Boolean).join(', ')}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{[t.relationship, date].filter(Boolean).join(' · ')}</p>
      <StreamingAudio t={t} className="mt-3" />
      <TranscriptDisclosure transcript={t.transcript} />
    </div>
  )
}
