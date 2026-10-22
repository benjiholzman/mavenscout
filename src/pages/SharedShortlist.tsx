import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CandidateRow } from '../components/openings/CandidateRow'
import { useOpeningDetail } from '../hooks/useOpeningData'
import { RowsSkeleton } from '../components/ui/Skeletons'
import { loadLatestForOpening, type RankingRecord } from '../lib/matching/persist'
import { computeTeamStats } from '../lib/openings'
import { DEMO_HIRING_MANAGER_ID, useSession } from '../lib/session'
import NotFound from './NotFound'

// /shortlists/:token — the frictionless read-only VIEW path (PRD 7.4).
// No account needed. Input controls render disabled unless the viewer's
// identity is the owner or a granted reviewer (view vs participate).
// A revoked token 404s immediately.

export default function SharedShortlist() {
  const { token } = useParams()
  const { role } = useSession()
  const { data, notFound, reload } = useOpeningDetail(token, true)

  // AI match scores stay visible on the shared view too (PRD 7.4).
  const [saved, setSaved] = useState<RankingRecord | null>(null)
  useEffect(() => {
    if (data) loadLatestForOpening(data.opening.id).then(setSaved)
  }, [data])

  if (notFound) return <NotFound />
  if (!data)
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <RowsSkeleton rows={4} />
      </div>
    )

  const { opening, entries, profiles, notes, reviewers, managers } = data
  const stats = computeTeamStats(entries, notes)

  // Mocked identity → participation: the demo HM owns the seeded opening;
  // reviewer grants carry the real rule. Real auth replaces this resolution.
  const identityId = role === 'hiring_manager' ? DEMO_HIRING_MANAGER_ID : null
  const canParticipate =
    identityId !== null &&
    (opening.hiring_manager_id === identityId ||
      reviewers.some((r) => r.reviewer_id === identityId))

  const shortList = entries.filter((e) => e.list_tag === 'top_pick')
  const longOnly = entries.filter((e) => e.list_tag === 'favorite')

  const renderRows = (list: typeof entries) =>
    list.map((entry) => {
      const profile = profiles.get(entry.profile_id)
      if (!profile) return null
      return (
        <CandidateRow
          key={entry.id}
          entry={entry}
          profile={profile}
          notes={notes.filter((n) => n.opening_entry_id === entry.id)}
          managers={managers}
          average={stats.averages.get(entry.id) ?? null}
          rank={stats.ranks.get(entry.id)}
          currentAuthorId={canParticipate ? identityId : null}
          canParticipate={canParticipate}
          onChanged={reload}
          match={saved?.results.find((r) => r.profile_id === entry.profile_id) ?? null}
        />
      )
    })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
        Shared shortlist {canParticipate ? '· you can contribute' : '· view only'}
      </p>
      <h1 className="mt-1 text-3xl font-semibold">{opening.name}</h1>
      {opening.description && <p className="mt-1.5 text-sm text-ink-soft">{opening.description}</p>}
      {!canParticipate && (
        <p className="mt-3 rounded-lg bg-paper px-3.5 py-2.5 text-xs text-ink-faint">
          You're viewing a read-only share. Adding notes and scores requires an account with
          reviewer access granted by the opening's owner.
        </p>
      )}

      <section className="mt-7">
        <h2 className="mb-3 text-lg font-semibold">
          Short list <span className="text-sm font-normal text-ink-faint">({shortList.length})</span>
        </h2>
        <div className="space-y-3">{renderRows(shortList)}</div>
      </section>
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">
          Long list <span className="text-sm font-normal text-ink-faint">({longOnly.length})</span>
        </h2>
        <div className="space-y-3">{renderRows(longOnly)}</div>
      </section>
    </div>
  )
}
