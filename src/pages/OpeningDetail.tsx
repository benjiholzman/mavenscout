import { ArrowRight, CalendarDays, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CandidateRow } from '../components/openings/CandidateRow'
import { ReviewersPanel, SharePanel } from '../components/openings/SharePanels'
import { VideoRequestsPanel } from '../components/openings/VideoRequestsPanel'
import { RowsSkeleton } from '../components/ui/Skeletons'
import { useOpeningDetail } from '../hooks/useOpeningData'
import { fmtDate } from '../lib/dates'
import { BAND_LABELS } from '../lib/matching/config'
import { loadLatestForOpening, type RankingRecord } from '../lib/matching/persist'
import { computeTeamStats } from '../lib/openings'
import { DEMO_HIRING_MANAGER_ID, useSession } from '../lib/session'
import { supabase } from '../lib/supabase'
import NotFound from './NotFound'

// /openings/:id — a single opening workspace (PRD 7.4): short list + long
// list, per-candidate notes/scores/tags, reviewers, sharing, post-interview.

export default function OpeningDetail() {
  const { id } = useParams()
  const { role } = useSession()
  const { data, notFound, reload } = useOpeningDetail(id)

  // The opening's persisted ranking: loads on entry — the manager who returns
  // days later finds the last ranking right here. Ranking itself happens in
  // the directory, linked to this opening (match rework spec §2): runs there
  // save here automatically, and re-running replaces this ranking.
  const [saved, setSaved] = useState<RankingRecord | null>(null)
  useEffect(() => {
    if (id) loadLatestForOpening(id).then(setSaved)
  }, [id])
  const resultByProfile = new Map((saved?.results ?? []).map((r) => [r.profile_id, r]))

  if (notFound) return <NotFound />
  if (role !== 'hiring_manager')
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-ink-soft">
          Log in with a hiring account (or use the dev role switcher) to open this workspace.
        </p>
      </div>
    )
  if (!data)
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <RowsSkeleton rows={4} />
      </div>
    )

  const { opening, entries, profiles, notes, reviewers, shares, managers } = data
  const stats = computeTeamStats(entries, notes)
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
          currentAuthorId={DEMO_HIRING_MANAGER_ID}
          canParticipate
          onChanged={reload}
          match={resultByProfile.get(entry.profile_id) ?? null}
        />
      )
    })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-ink-faint">
            <Link to="/openings" className="hover:text-ink">My openings</Link> /
          </p>
          <h1 className="mt-0.5 text-3xl font-semibold">{opening.name}</h1>
          {opening.description && <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">{opening.description}</p>}
          {opening.deadline && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-faint">
              <CalendarDays size={13} /> Deadline {fmtDate(opening.deadline)}
            </p>
          )}
        </div>
        <Link
          to={`/?opening=${opening.id}&rank=1`}
          className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-ink/85"
        >
          <Sparkles size={16} className="text-gold-300" />
          Rank candidates
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,290px]">
        <div className="min-w-0 space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              Short list <span className="text-sm font-normal text-ink-faint">— top picks ({shortList.length})</span>
            </h2>
            <div className="space-y-3">
              {renderRows(shortList)}
              {shortList.length === 0 && (
                <p className="rounded-card border border-dashed border-line p-5 text-center text-sm text-ink-faint">
                  No top picks yet — star a long-list candidate to promote them.
                </p>
              )}
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              Long list <span className="text-sm font-normal text-ink-faint">— favorites ({longOnly.length})</span>
            </h2>
            <div className="space-y-3">
              {renderRows(longOnly)}
              {longOnly.length === 0 && (
                <p className="rounded-card border border-dashed border-line p-5 text-center text-sm text-ink-faint">
                  Save candidates from the <Link to="/" className="font-medium text-brand-600">directory</Link> to build the long list.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          {saved && (
            <div className="rounded-card border border-line bg-white p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles size={14} className="text-gold-500" /> Saved AI ranking
              </h3>
              <p className="mt-1.5 text-xs text-ink-faint">
                Run {fmtDate(saved.jd.created_at.slice(0, 10))} · {saved.results.length} candidates ranked
              </p>
              <p className="mt-1.5 line-clamp-3 rounded-lg bg-paper px-2.5 py-2 text-xs text-ink-soft">
                {saved.jd.raw_text}
              </p>
              <p className="mt-2 text-xs text-ink-faint">
                Top matches across the whole pool:
              </p>
              <ol className="mt-1 space-y-1">
                {saved.results.slice(0, 5).map((r) => {
                  const p = profiles.get(r.profile_id)
                  return (
                    <li key={r.profile_id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">
                        {r.rank}. {p?.name ?? <TopMatchName profileId={r.profile_id} />}
                      </span>
                      <span className="shrink-0 text-ink-faint">
                        <span className="font-semibold text-ink-soft">{r.total_score}</span> · {BAND_LABELS[r.band]}
                      </span>
                    </li>
                  )
                })}
              </ol>
              <Link
                to={`/?opening=${opening.id}&ranking=${saved.jd.id}`}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                Open ranked view <ArrowRight size={12} aria-hidden />
              </Link>
            </div>
          )}
          <VideoRequestsPanel
            openingId={opening.id}
            entries={entries}
            profiles={profiles}
            jobDescriptionId={saved?.jd.id ?? null}
          />
          <SharePanel opening={opening} shares={shares} onChanged={reload} />
          <ReviewersPanel opening={opening} reviewers={reviewers} managers={managers} onChanged={reload} />
        </aside>
      </div>
    </div>
  )
}

/** Names for top matches who aren't saved into the opening yet. */
function TopMatchName({ profileId }: { profileId: string }) {
  const [name, setName] = useState<string>('…')
  useEffect(() => {
    supabase
      .from('profiles')
      .select('name')
      .eq('id', profileId)
      .maybeSingle()
      .then(({ data }) => setName(data?.name ?? '?'))
  }, [profileId])
  return <>{name}</>
}
