import { Clock, Mic, ShieldQuestion, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

// /testimonial-info — public explainer linked from the referee page, so a
// referee receiving a link from a colleague has credible context
// (docs/MavenScout-profiles-membership.md §4.3, §4.7).

const POINTS = [
  {
    icon: ShieldQuestion,
    title: 'What is MavenScout?',
    text: 'A curated marketplace where international development organizations find vetted consultants for short-term expert work. Every expert listed has had their identity, most recent employer, degree and certifications checked, and is vouched for on record by someone they worked with.',
  },
  {
    icon: Mic,
    title: 'Why an audio testimonial?',
    text: 'A spoken testimonial from a supervisor or client carries far more than a written quote: hiring managers hear a real colleague describe real work, before they ever schedule a call.',
  },
  {
    icon: Clock,
    title: 'What does it involve?',
    text: "About 5 minutes on your phone. Confirm it's you with a 6-digit code sent to your work email, check the details, then record up to 2 minutes (or upload a voice memo). No app, no account.",
  },
  {
    icon: UserRound,
    title: 'Who can hear it?',
    text: 'Only verified hiring managers at recognised organizations, by streaming, never download. It is never public, never sold and never used to train AI. You can withdraw it at any time with one click.',
  },
]

export default function TestimonialInfo() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">You've been asked for an audio testimonial</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Someone you've worked with keeps a professional profile on MavenScout and would like a
        short spoken testimonial from you. Here's what that means.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {POINTS.map((p) => (
          <div key={p.title} className="rounded-card border border-line bg-white p-5">
            <p.icon size={19} className="text-brand-500" />
            <h2 className="mt-2.5 font-display text-base font-semibold">{p.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{p.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-ink-faint">
        Ready? Use the personal link you were sent. It identifies who the testimonial is for.
        Curious about the platform?{' '}
        <Link to="/about" className="font-medium text-brand-600">
          About MavenScout
        </Link>
        .
      </p>
    </div>
  )
}
