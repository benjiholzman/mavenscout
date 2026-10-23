import { BadgeDollarSign, Film, Globe2, ListChecks, RefreshCcw, Search, Sparkles, UserCheck } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { VerificationExplainer } from '../components/profile/VerificationExplainer'
import { FIRMS_ENABLED } from '../lib/config'
import { VERIFIED_STATEMENT } from '../lib/testimonials/copy'

// About page (PRD 7.12) — explains the platform to a first-time visitor in
// either persona, adapted from the PRD's problem statement.

const HM_POINTS = [
  {
    icon: Search,
    title: 'Browse a curated pool',
    text: `${VERIFIED_STATEMENT} Experts with track records at the sector’s most respected organizations, not a generalist freelancer marketplace.`,
  },
  {
    icon: Film,
    title: 'Screen before you schedule',
    text: 'Watch pre-recorded video answers and listen to audio references from former managers — judge communication style and fit before a single live call crosses time zones.',
  },
  {
    icon: Sparkles,
    title: 'Rank against your job description',
    text: 'Paste your terms of reference and get an AI-ranked shortlist of the filtered pool, with a score breakdown you can interrogate — not a black box.',
  },
  {
    icon: ListChecks,
    title: 'Decide as a team',
    text: 'Save candidates into openings, share a read-only link with anyone, and let invited colleagues add their own notes and scores toward a team ranking.',
  },
]

const CONSULTANT_POINTS = [
  {
    icon: UserCheck,
    title: 'Get discovered by peer institutions',
    text: 'One profile lists you in a vetted pool searched by hiring managers across development organizations — beyond the reach of your existing network.',
  },
  {
    icon: Globe2,
    title: 'Your profile is your website',
    text: 'The same profile doubles as a polished public professional site you can put on a résumé or LinkedIn — zero extra effort to maintain.',
  },
  {
    icon: BadgeDollarSign,
    title: 'A small monthly fee, one income lever',
    text: 'No bidding, no race to the bottom. You pay a modest subscription to stay listed; organizations contact you directly.',
  },
  {
    icon: RefreshCcw,
    title: 'Show, don’t claim',
    text: 'Portfolio projects with real results, video Q&As, and audio references from the people you actually delivered for.',
  },
]

export default function About() {
  // Profiles link to #verification; the router doesn't scroll to hashes.
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl font-semibold leading-tight">
        Niche expertise, <span className="text-brand-500">found in minutes</span> — not weeks.
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-soft">
        Hiring managers in international development need specific subject-matter experts fast — a
        child-mortality specialist for a UN report, a Francophone M&E lead for a Sahel program. But
        generalist marketplaces attract the wrong pool, job postings drown in AI-generated volume,
        and word-of-mouth keeps recycling the same short contact list.
      </p>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-soft">
        MavenScout is the third option: a curated pool of vetted {FIRMS_ENABLED ? 'consultants and firms' : 'experts'} — each with a
        track record at the sector&rsquo;s respected institutions — searchable, screenable by video
        and audio, and rankable against your job description.
      </p>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">For hiring organizations</h2>
        <p className="mt-1 text-sm text-ink-faint">
          Free to use — browsing doesn&rsquo;t even need an account.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {HM_POINTS.map((p) => (
            <div key={p.title} className="rounded-card border border-line bg-white p-5">
              <p.icon size={20} className="text-brand-500" />
              <h3 className="mt-3 font-display text-base font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="verification" className="mt-14 scroll-mt-24 rounded-card border border-line bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">What verification means</h2>
        <div className="mt-4">
          <VerificationExplainer />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">{FIRMS_ENABLED ? 'For consultants & firms' : 'For consultants'}</h2>
        <p className="mt-1 text-sm text-ink-faint">
          One profile: your listing in the pool and your public professional website.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {CONSULTANT_POINTS.map((p) => (
            <div key={p.title} className="rounded-card border border-line bg-white p-5">
              <p.icon size={20} className="text-brand-500" />
              <h3 className="mt-3 font-display text-base font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-card border border-brand-200 bg-brand-50 p-8 text-center">
        <h2 className="text-2xl font-semibold">Ready to join the pool?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-soft">
          List your expertise where peer institutions are already searching — or start browsing the
          directory right now, no account required.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/signup"
            className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            Join MavenScout
          </Link>
          <Link
            to="/"
            className="rounded-full border border-brand-300 bg-white px-6 py-2.5 text-sm font-medium text-brand-700 hover:border-brand-500"
          >
            Browse the directory
          </Link>
        </div>
      </section>
    </div>
  )
}
