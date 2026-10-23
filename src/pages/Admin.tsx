import { useState } from 'react'
import { ManagersAdmin } from '../components/admin/ManagersAdmin'
import { Moderation } from '../components/admin/Moderation'
import { OrganizationsManager } from '../components/admin/OrganizationsManager'
import { QuestionsManager } from '../components/admin/QuestionsManager'
import { ReviewQueue } from '../components/admin/ReviewQueue'
import { TaxonomyManager } from '../components/admin/TaxonomyManager'
import { TierOverview } from '../components/admin/TierOverview'
import { VerificationQueue } from '../components/admin/VerificationQueue'

// /admin — INTENTIONALLY AN OPEN, UNPROTECTED ROUTE this build (PRD 7.9/7.10):
// auth is mocked, so there is no real role check keeping non-admins out.
// Fine for local dev and demos; the developer's auth pass MUST add real
// access control before any public deployment.

const TABS = [
  ['review', 'Review queue'],
  ['verification', 'Verification'],
  ['taxonomy', 'Taxonomy'],
  ['organizations', 'Organizations'],
  ['tiers', 'Tiers & subscriptions'],
  ['questions', 'Video Q&A questions'],
  ['moderation', 'Testimonials'],
  ['managers', 'Hiring managers'],
] as const

type TabId = (typeof TABS)[number][0]

export default function Admin() {
  const [tab, setTab] = useState<TabId>('review')
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-semibold">Admin</h1>
        <p className="text-xs text-amber-700">
          Open route in this build — real access control lands with the auth pass.
        </p>
      </div>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition ${
              tab === id
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="py-6">
        {tab === 'review' && <ReviewQueue />}
        {tab === 'verification' && <VerificationQueue />}
        {tab === 'taxonomy' && <TaxonomyManager />}
        {tab === 'organizations' && <OrganizationsManager />}
        {tab === 'tiers' && <TierOverview />}
        {tab === 'questions' && <QuestionsManager />}
        {tab === 'moderation' && <Moderation />}
        {tab === 'managers' && <ManagersAdmin />}
      </div>
    </div>
  )
}
