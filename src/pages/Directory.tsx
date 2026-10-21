import { SearchX, Sparkles, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { FilterBar } from '../components/directory/FilterBar'
import { FlipCard } from '../components/directory/FlipCard'
import { SortDropdown } from '../components/directory/SortDropdown'
import { MatchBreakdown, MatchScoreBadge } from '../components/match/MatchBreakdown'
import { RankByJDModal } from '../components/match/RankByJDModal'
import { SaveRankingModal } from '../components/match/SaveRankingModal'
import { useSaveCandidate } from '../components/openings/SaveCandidateFlow'
import { SignupPrompt } from '../components/ui/SignupPrompt'
import { DirectorySkeleton } from '../components/ui/Skeletons'
import { rankPool, type RankingRun } from '../lib/matching/run'
import { useDirectoryData } from '../hooks/useDirectoryData'
import {
  applyFilters,
  buildTaxonomyTree,
  deriveOptions,
  facetCounts,
  type FacetKey,
  EMPTY_FILTERS,
  type FilterState,
} from '../lib/filters'
import { useSession } from '../lib/session'
import { sortProfiles, type SortMode } from '../lib/sort'

export default function Directory() {
  const { data, error } = useDirectoryData()
  const { isLoggedIn } = useSession()

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [sort, setSort] = useState<SortMode>('shuffle')
  // Bumped on every filter change so card flip state resets (PRD 7.1).
  const [epoch, setEpoch] = useState(0)
  const [gatedFeature, setGatedFeature] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { save, ui: saveUi } = useSaveCandidate()

  // AI ranking (PRD 7.7) — ad-hoc directory rankings are TRANSIENT: they live
  // in state for the session and vanish unless saved to an opening.
  const [rankModalOpen, setRankModalOpen] = useState(false)
  const [saveRankingOpen, setSaveRankingOpen] = useState(false)
  const [ranking, setRanking] = useState<RankingRun | null>(null)

  const handleFilterChange = (next: FilterState) => {
    setFilters(next)
    setEpoch((e) => e + 1)
  }

  const trees = useMemo(() => {
    if (!data) return null
    return {
      expertise: buildTaxonomyTree(data.taxonomyCategories, data.taxonomyItems, 'domain_expertise'),
      skills: buildTaxonomyTree(data.taxonomyCategories, data.taxonomyItems, 'technical_skills'),
    }
  }, [data])

  const options = useMemo(() => (data ? deriveOptions(data.profiles) : null), [data])

  const filtered = useMemo(() => {
    if (!data || !trees) return []
    return applyFilters(
      data.profiles,
      data.portfolioByProfile,
      filters,
      trees.expertise,
      trees.skills,
    )
  }, [data, trees, filters])

  const countFor = useCallback(
    (key: FacetKey, values: string[]) =>
      data && trees
        ? facetCounts(data.profiles, data.portfolioByProfile, filters, trees.expertise, trees.skills, key, values)
        : new Map<string, number>(),
    [data, trees, filters],
  )

  const scoreMap = useMemo(
    () => new Map(ranking?.results.map((r) => [r.profile_id, r.total_score]) ?? []),
    [ranking],
  )
  const resultByProfile = useMemo(
    () => new Map(ranking?.results.map((r) => [r.profile_id, r]) ?? []),
    [ranking],
  )

  const results = useMemo(
    () => sortProfiles(filtered, sort, scoreMap),
    [filtered, sort, scoreMap],
  )

  const runRanking = async (
    jd: { raw_text: string; hiring_organization: string | null },
    weights: RankingRun['weights'],
  ) => {
    // Operates on the currently filtered/searched pool only (PRD 7.7).
    const ranked = await rankPool(filtered, jd, weights)
    setRanking({ jd, weights, results: ranked })
    setSort('best_match')
  }

  const requireAccount = (feature: string, action: () => void) => {
    if (!isLoggedIn) setGatedFeature(feature)
    else action()
  }

  if (error)
    return (
      <div className="mx-auto max-w-[1104px] px-4 py-10">
        <p className="text-red-600">Couldn't load the directory: {error}</p>
      </div>
    )

  return (
    <div className="mx-auto max-w-[1104px] px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Browse experts</h1>
          <p className="mt-1 text-sm text-ink-soft">
            A curated pool of vetted consultants and firms in international development.
          </p>
        </div>
        {/* Rank by JD — deliberately separate from the filter bar (PRD 7.1). */}
        <button
          onClick={() =>
            requireAccount('Ranking candidates against a job description', () =>
              setRankModalOpen(true),
            )
          }
          className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-ink/85"
        >
          <Sparkles size={16} className="text-gold-300" />
          Rank by Job Description
        </button>
      </div>

      <div className="mt-6">
        {data && options && (
          <FilterBar
            filters={filters}
            onChange={handleFilterChange}
            locations={options.locations}
            languages={options.languages}
            taxonomyCategories={data.taxonomyCategories}
            taxonomyItems={data.taxonomyItems}
            countFor={countFor}
          />
        )}
      </div>

      {ranking && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-ink/15 bg-ink px-4 py-3 text-sm text-white">
          <p>
            <Sparkles size={14} className="mr-1.5 inline text-gold-300" />
            Ranked {ranking.results.length} candidate{ranking.results.length === 1 ? '' : 's'} against
            your JD
            {ranking.jd.hiring_organization && ` for ${ranking.jd.hiring_organization}`}
            <span className="ml-2 text-white/50">placeholder scorer — real engine drops in later</span>
          </p>
          <span className="flex items-center gap-2">
            <button
              onClick={() => setSaveRankingOpen(true)}
              className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-white/90"
            >
              Save ranking to opening…
            </button>
            <button
              onClick={() => {
                setRanking(null)
                setSort('shuffle')
              }}
              className="flex items-center gap-1 text-xs text-white/70 hover:text-white"
            >
              <X size={13} /> Clear
            </button>
          </span>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-ink-soft" aria-live="polite">
          {data ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Loading…'}
        </p>
        <SortDropdown value={sort} onChange={setSort} bestMatchAvailable={ranking !== null} />
      </div>

      {!data && <DirectorySkeleton />}

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data &&
          results.map((p, index) => {
            const match = resultByProfile.get(p.id)
            const showMatch = match && sort === 'best_match'
            return (
              <div key={`${p.id}-${epoch}`} className="flex flex-col gap-2">
                {showMatch && (
                  <div className="rounded-card border border-line bg-white px-3.5 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-ink-faint">
                        Match #{index + 1}
                      </span>
                      {/* The top 15 get the prominent score treatment (PRD 7.7). */}
                      <MatchScoreBadge score={match.total_score} prominent={index < 15} />
                    </div>
                    {index < 15 && (
                      <div className="mt-1.5">
                        <MatchBreakdown subScores={match.sub_scores} narrative={match.narrative} />
                      </div>
                    )}
                  </div>
                )}
                <FlipCard
                  profile={p}
                  portfolio={data.portfolioByProfile.get(p.id) ?? []}
                  intro={data.introByProfile.get(p.id) ?? null}
                  audioCount={data.audioCountByProfile.get(p.id) ?? 0}
                  onFavorite={(p) => save(p, 'favorite')}
                  onTopPick={(p) => save(p, 'top_pick')}
                />
              </div>
            )
          })}
      </div>

      {data && results.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <SearchX size={26} className="text-ink-faint/60" />
          <p className="mt-3 font-medium text-ink-soft">No consultants match these filters</p>
          <p className="mt-1 max-w-sm text-sm text-ink-faint">
            The pool is curated, not endless — try widening a category filter or switching the
            search to full profiles.
          </p>
          <button
            onClick={() => handleFilterChange(EMPTY_FILTERS)}
            className="mt-4 rounded-full border border-line bg-white px-4 py-1.5 text-sm font-medium text-ink-soft hover:border-ink-faint"
          >
            Clear all filters
          </button>
        </div>
      )}

      <SignupPrompt
        open={gatedFeature !== null}
        onClose={() => setGatedFeature(null)}
        feature={gatedFeature ?? ''}
      />
      {saveUi}

      <RankByJDModal
        open={rankModalOpen}
        onClose={() => setRankModalOpen(false)}
        onRun={runRanking}
        poolLabel={`the ${filtered.length} currently filtered candidate${filtered.length === 1 ? '' : 's'}`}
      />
      {ranking && (
        <SaveRankingModal
          run={ranking}
          open={saveRankingOpen}
          onClose={() => setSaveRankingOpen(false)}
          onSaved={(name) => setNotice(`Ranking saved to "${name}" — it'll be there when you return.`)}
        />
      )}

      {notice && (
        <div
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg"
          role="status"
          onAnimationEnd={() => setNotice(null)}
        >
          {notice}
          <button className="ml-3 text-white/60 hover:text-white" onClick={() => setNotice(null)}>
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
