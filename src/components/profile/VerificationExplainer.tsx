import { BadgeCheck, Clock, FileCheck2, Mic, UserRound } from 'lucide-react'
import { TESTIMONIAL_COVERAGE_LINE, VERIFIED_STATEMENT } from '../../lib/testimonials/copy'

// "What verification means" (docs/MavenScout-profiles-membership.md §3.2):
// the labels, what's checked and how, and that consultants choose their
// referees. Shown on the About page (#verification), linked from profiles'
// legend and the directory header.

const LABELS = [
  { icon: BadgeCheck, name: 'Confirmed', text: 'Checked with an independent source: an ID check, a public register, a degree-verification service, a public document, or a referee’s work email at that employer.' },
  { icon: FileCheck2, name: 'Document reviewed', text: 'We examined the evidence (an employment letter, contract or certificate) and found it genuine-looking, but didn’t confirm it with the source.' },
  { icon: Clock, name: 'Pending check', text: 'A certification we haven’t checked yet. Every certification listed is checked; one we can’t verify is taken off the profile.' },
]

export function VerificationExplainer() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-ink-soft">
      <p className="text-base text-ink">{VERIFIED_STATEMENT}</p>
      <div>
        <h3 className="font-display text-base font-semibold text-ink">What we check</h3>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>Identity: an ID and selfie check, matched to the profile photo. We keep the result, never the ID.</li>
          <li>The most recent employer, the most recent degree and every certification listed.</li>
          <li>Documents sent as evidence are deleted after review; we keep a record of what was checked, how, by whom and when.</li>
          <li>Editing a checked item removes its label until we check it again.</li>
        </ul>
      </div>
      <div>
        <h3 className="font-display text-base font-semibold text-ink">The labels</h3>
        <ul className="mt-2 space-y-2">
          {LABELS.map((l) => (
            <li key={l.name} className="flex gap-2.5">
              <l.icon size={16} className="mt-0.5 shrink-0 text-emerald-700" />
              <span>
                <strong className="text-ink">{l.name}.</strong> {l.text}
              </span>
            </li>
          ))}
          <li className="flex gap-2.5">
            <UserRound size={16} className="mt-0.5 shrink-0 text-ink-faint" />
            <span>
              <strong className="text-ink">No label.</strong> Everything else (bio, expertise, portfolio, languages) is the
              expert’s own account. Bios are read for claims that contradict what we checked.
            </span>
          </li>
        </ul>
      </div>
      <div>
        <h3 className="font-display text-base font-semibold text-ink">Audio testimonials</h3>
        <p className="mt-1.5 flex gap-2.5">
          <Mic size={16} className="mt-0.5 shrink-0 text-brand-500" />
          <span>
            {TESTIMONIAL_COVERAGE_LINE ? `${TESTIMONIAL_COVERAGE_LINE} ` : ''}Referees confirm who they are with a
            code sent to their work email at a recognised organization. Experts choose their referees, so a testimonial
            shows someone real will vouch for them on record; it isn’t a reference check you ran yourself.
          </span>
        </p>
      </div>
      <p className="rounded-lg bg-paper px-3 py-2.5">
        We verify claims; we don’t judge quality. Whether someone is right for your assignment is for your own interviews
        and reference checks.
      </p>
    </div>
  )
}
