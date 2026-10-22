import { SearchX, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FilterBar } from '../components/directory/FilterBar'
import { FlipCard } from '../components/directory/FlipCard'
import { SortDropdown } from '../components/directory/SortDropdown'
import { AboutResultModal } from '../components/match/AboutResultModal'
import { SaveRankingModal } from '../components/match/SaveRankingModal'
import { useSaveCandidate } from '../components/openings/SaveCandidateFlow'
import type { CountFn } from '../components/ranking/LiveCount'
import { RankingBanner } from '../components/ranking/RankingBanner'
import { RankingPanel } from '../components/ranking/RankingPanel'
import type { GridOptions } from '../components/ranking/RequirementsGrid'
import { SignupPrompt } from '../components/ui/SignupPrompt'
import { DirectorySkeleton } from '../components/ui/Skeletons'
import { useDirectoryData } from '../hooks/useDirectoryData'
import { buildTaxonomyTree, deriveOptions, facetCounts, type FacetKey, type FilterState } from '../lib/filters'
import { extractRequirements } from '../lib/matching/extract'
import {
  loadLatestForOpening,
  loadRanking,
  runRanking,
  scoreNewcomers,
  updateRunRequirements,
  type RankingRecord,
} from '../lib/matching/persist'
import type { ExtractedRequirements } from '../lib/matching/types'
import {
  gridOnlyMustHaves,
  mustHavesToFilterState,
  preferenceKey,
  sameRows,
  withRunPreferences,
  type TagLevelOf,
} from '../lib/requirements/model'
import { clearDraft, readDraft, writeDraft } from '../lib/requirements/draft'
import { applyMustHaves, applyOrgMustHaves } from '../lib/requirements/mustHaves'
import { useRequirements } from '../lib/requirements/store'
import { DEMO_HIRING_MANAGER_ID, useSession } from '../lib/session'
import { sortProfiles, type SortMode } from '../lib/sort'
import { supabase } from '../lib/supabase'

// Directory + ranking mode (match rework spec §2, §8).
//
// URL state: ?rank=1 opens the ranking drawer; ?ranking=<job_description_id>
// shows that ranking (reload and back restore it); ?opening=<id> links the run
// to an opening (its runs save automatically); ?q / ?qm carry the search term
// while ranked, so the pool restores with it.

export default function Directory() {
  const { data, error } = useDirectoryData()
  const { isLoggedIn, role } = useSession()
  const [params, setParams] = useSearchParams()
  const rankingId = params.get('ranking')
  const openingId = params.get('opening')
  const rankParam = params.get('rank') === '1'

  // One requirements store behind the filter bar and the ranking drawer —
  // spec §2.1. The filter bar renders the Required rows as a FilterState and
  // writes changes back as rows.
  const reqs = useRequirements()
  const { requirements, search } = reqs.state
  const filters = useMemo(() => mustHavesToFilterState(requirements, search), [requirements, search])
  const [sort, setSort] = useState<SortMode>('shuffle')
  // Bumped whenever the result set changes so card flip state resets (PRD 7.1).
  const [epoch, setEpoch] = useState(0)
  const [gatedFeature, setGatedFeature] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { save, ui: saveUi } = useSaveCandidate()

  // Ranking drawer: the JD and its suggestions live here so closing the
  // drawer loses nothing; the rows live in the shared store.
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [jdText, setJdText] = useState('')
  const [jdCollapsed, setJdCollapsed] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedRequirements | null>(null)
  const [reading, setReading] = useState(false)
  const [orgPrefill, setOrgPrefill] = useState('')

  // The active ranking (loaded from, and mirrored in, the URL).
  const [ranking, setRanking] = useState<RankingRecord | null>(null)
  const [running, setRunning] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [openingName, setOpeningName] = useState<string | null>(null)
  /** "About this result": the profile id whose build-up is open. */
  const [aboutId, setAboutId] = useState<string | null>(null)

  const canRank = role === 'hiring_manager'

  const updateParams = useCallback(
    (patch: Record<string, string | null>, opts: { push?: boolean } = {}) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v === null) next.delete(k)
            else next.set(k, v)
          }
          return next
        },
        { replace: !opts.push },
      ),
    [setParams],
  )

  /** Ranking needs a hiring account (spec §1 "Unchanged": login gating). */
  const gateRanking = useCallback((): boolean => {
    if (canRank) return true
    if (!isLoggedIn) setGatedFeature('Ranking candidates against a job description')
    else setNotice('Ranking is part of the hiring toolkit — switch to a hiring account to use it.')
    return false
  }, [canRank, isLoggedIn])

  // ---- data ------------------------------------------------------------------

  const trees = useMemo(() => {
    if (!data) return null
    return {
      expertise: buildTaxonomyTree(data.taxonomyCategories, data.taxonomyItems, 'domain_expertise'),
      skills: buildTaxonomyTree(data.taxonomyCategories, data.taxonomyItems, 'technical_skills'),
    }
  }, [data])

  const tagLevelOf = useCallback<TagLevelOf>(
    (kind, name) =>
      (kind === 'expertise' ? trees?.expertise : trees?.skills)?.categoryNames.has(name) ? 'category' : 'item',
    [trees],
  )

  const handleFilterChange = (next: FilterState) => {
    reqs.fromFilterBar(next, tagLevelOf)
    setEpoch((e) => e + 1)
  }
  const handleClearAll = () => {
    reqs.clearMustHaves()
    setEpoch((e) => e + 1)
  }

  const options = useMemo(() => (data ? deriveOptions(data.profiles) : null), [data])
  const profilesById = useMemo(() => new Map((data?.profiles ?? []).map((p) => [p.id, p])), [data])

  /** Picker options for the requirements grid. */
  const gridOptions = useMemo<GridOptions | null>(() => {
    if (!data || !options) return null
    const typeOf = (id: string) => data.taxonomyCategories.find((c) => c.id === id)?.type
    const groupsFor = (type: 'domain_expertise' | 'technical_skills') =>
      data.taxonomyCategories
        .filter((c) => c.type === type)
        .map((c) => ({
          label: c.name,
          items: data.taxonomyItems.filter((i) => i.category_id === c.id).map((i) => i.name),
        }))
    return {
      locations: options.locations,
      languages: options.languages,
      types: ['Individual', 'Small Firm', 'Large Firm'],
      workArrangements: data.taxonomyItems
        .filter((i) => typeOf(i.category_id) === 'work_arrangement')
        .map((i) => i.name),
      expertiseGroups: groupsFor('domain_expertise'),
      skillGroups: groupsFor('technical_skills'),
    }
  }, [data, options])

  /** Candidates meeting every Required row and the search term. */
  const filtered = useMemo(() => {
    if (!data || !trees) return []
    return applyMustHaves(data.profiles, data.portfolioByProfile, requirements, search, trees)
  }, [data, trees, requirements, search])

  const countFor = useCallback(
    (key: FacetKey, values: string[]) =>
      data && trees
        ? facetCounts(
            // Org History Required rows have no filter-bar control, so apply them first.
            applyOrgMustHaves(data.profiles, requirements),
            data.portfolioByProfile,
            filters,
            trees.expertise,
            trees.skills,
            key,
            values,
          )
        : new Map<string, number>(),
    [data, trees, requirements, filters],
  )

  const gridOnlyChips = useMemo(
    () => gridOnlyMustHaves(requirements).map((r) => ({ id: r.id, label: 'Org history' })),
    [requirements],
  )

  // ---- ranking mode: derived --------------------------------------------------

  /** Ranked results still meeting every Required row, renumbered by position
   *  (tightening hides failures instantly — spec §2.2). */
  const ranked = useMemo(() => {
    if (!ranking) return null
    const eligible = new Set(filtered.map((p) => p.id))
    return ranking.results
      .filter((r) => eligible.has(r.profile_id) && profilesById.has(r.profile_id))
      .map((result, i) => ({ result, profile: profilesById.get(result.profile_id)!, position: i + 1 }))
  }, [ranking, filtered, profilesById])

  /** Eligible but never scored — they appear after a Required row is loosened. */
  const newcomers = useMemo(() => {
    if (!ranking) return []
    const scored = new Set(ranking.results.map((r) => r.profile_id))
    return filtered.filter((p) => !scored.has(p.id))
  }, [ranking, filtered])

  const excludedCount = useMemo(() => {
    if (!ranking || !data || !trees) return 0
    const searchPool = applyMustHaves(data.profiles, data.portfolioByProfile, [], search, trees)
    return searchPool.length - filtered.length
  }, [ranking, data, trees, search, filtered])

  /** Requirements as stored for this run: the current Required rows plus the
   *  preference rows the run was scored with. */
  const persistable = useMemo(
    () => (ranking ? withRunPreferences(requirements, ranking.jd.requirements ?? []) : null),
    [ranking, requirements],
  )

  /** Preference rows or the JD differ from what was scored → Re-run prompt. */
  const requirementsChanged = useMemo(
    () =>
      !!ranking &&
      (preferenceKey(requirements) !== preferenceKey(ranking.jd.requirements ?? []) ||
        jdText.trim() !== ranking.jd.raw_text.trim()),
    [ranking, requirements, jdText],
  )

  const results = useMemo(
    () => (ranked ? ranked.map((r) => r.profile) : sortProfiles(filtered, sort)),
    [ranked, filtered, sort],
  )
  const rankedById = useMemo(() => new Map((ranked ?? []).map((r) => [r.profile.id, r])), [ranked])
  const about = aboutId ? rankedById.get(aboutId) ?? null : null

  // ---- ranking mode: URL → state --------------------------------------------

  // ?rank=1 opens the drawer once (the /match redirect and openings land here).
  useEffect(() => {
    if (!rankParam) return
    updateParams({ rank: null })
    if (gateRanking()) setDrawerOpen(true)
  }, [rankParam, updateParams, gateRanking])

  useEffect(() => {
    if (!openingId) {
      setOpeningName(null)
      return
    }
    supabase
      .from('openings')
      .select('name')
      .eq('id', openingId)
      .maybeSingle()
      .then(({ data: o }) => setOpeningName(o?.name ?? null))
  }, [openingId])

  // ?opening=<id> without a ranking: show the opening's saved ranking, if any.
  useEffect(() => {
    if (!openingId || rankingId || !canRank) return
    let cancelled = false
    loadLatestForOpening(openingId).then((rec) => {
      if (!cancelled && rec) updateParams({ ranking: rec.jd.id })
    })
    return () => {
      cancelled = true
    }
  }, [openingId, rankingId, canRank, updateParams])

  // ?ranking=<id>: load it and restore the JD, rows (so the filter bar shows the
  // Required rows), search and results. Removing the param exits ranking mode.
  const loadedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!rankingId) {
      loadedFor.current = null
      setRanking(null)
      return
    }
    if (loadedFor.current === rankingId) return
    if (!gateRanking()) return
    // Marked loaded only once the load lands, so a cancelled first attempt
    // (StrictMode runs effects twice in development) doesn't block the retry.
    let cancelled = false
    loadRanking(rankingId).then((rec) => {
      if (cancelled) return
      if (!rec) {
        setNotice('This ranking is no longer available.')
        updateParams({ ranking: null, q: null, qm: null })
        return
      }
      loadedFor.current = rankingId
      setRanking(rec)
      // Unsaved preference / JD edits made before leaving come back as a
      // draft (the stored ranking itself is unchanged until a re-run).
      const draft = readDraft(rankingId)
      reqs.hydrate({
        requirements: draft?.requirements ?? rec.jd.requirements ?? [],
        search: { term: params.get('q') ?? '', mode: params.get('qm') === 'full' ? 'full' : 'names' },
      })
      setJdText(draft?.jdText ?? rec.jd.raw_text)
      setExtracted(draft ? draft.extracted : rec.jd.extracted)
      setJdCollapsed(true)
      setEpoch((e) => e + 1)
    })
    return () => {
      cancelled = true
    }
    // Runs per ranking id; the other values are read at load time on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankingId])

  // While ranked, the search term rides in the URL so a reload restores the pool.
  useEffect(() => {
    if (!ranking) return
    updateParams({ q: search.term || null, qm: search.mode === 'full' ? 'full' : null })
  }, [ranking, search.term, search.mode, updateParams])

  // Unsaved edits (preference rows, JD) are kept as a per-tab draft so they
  // survive leaving and returning; matching the run again discards it.
  useEffect(() => {
    if (!ranking) return
    if (requirementsChanged) writeDraft(ranking.jd.id, { requirements, jdText, extracted })
    else clearDraft(ranking.jd.id)
  }, [ranking, requirementsChanged, requirements, jdText, extracted])

  // Tightening (or loosening) a Required row after a run is written back to
  // the run — without re-scoring — so a reload keeps it.
  useEffect(() => {
    if (!ranking || !persistable || sameRows(persistable, ranking.jd.requirements ?? [])) return
    const id = ranking.jd.id
    const t = setTimeout(() => {
      updateRunRequirements(id, persistable)
        .then(() =>
          setRanking((r) => (r && r.jd.id === id ? { ...r, jd: { ...r.jd, requirements: persistable } } : r)),
        )
        .catch((e) => setNotice(`Couldn't save the change: ${e instanceof Error ? e.message : e}`))
    }, 600)
    return () => clearTimeout(t)
  }, [ranking, persistable])

  // The manager's organization, prefilled when Org history is added.
  useEffect(() => {
    if (!drawerOpen || orgPrefill) return
    supabase
      .from('hiring_managers')
      .select('organization')
      .eq('id', DEMO_HIRING_MANAGER_ID)
      .maybeSingle()
      .then(({ data: hm }) => {
        if (hm?.organization) setOrgPrefill(hm.organization)
      })
  }, [drawerOpen, orgPrefill])

  // A row opened from a chip or "loosen" link flashes, then settles.
  useEffect(() => {
    if (!focusId) return
    const t = setTimeout(() => setFocusId(null), 2500)
    return () => clearTimeout(t)
  }, [focusId])

  // ---- ranking mode: actions ------------------------------------------------

  const openDrawer = (focus?: string) => {
    if (!gateRanking()) return
    setDrawerOpen(true)
    setFocusId(focus ?? null)
  }
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const readJd = async () => {
    if (!data || !options) return
    setReading(true)
    try {
      setExtracted(
        await extractRequirements(jdText, {
          taxonomy: { categories: data.taxonomyCategories, items: data.taxonomyItems },
          locationOptions: options.locations.flatMap((g) => [g.label, ...g.items]),
          languageOptions: options.languages,
        }),
      )
      setJdCollapsed(true)
    } finally {
      setReading(false)
    }
  }

  const countFn = useCallback<CountFn>(
    (reqRows, s) =>
      data && trees ? applyMustHaves(data.profiles, data.portfolioByProfile, reqRows, s, trees).length : 0,
    [data, trees],
  )

  /** Run: Required rows pre-filter the pool, the survivors are scored, the
   *  grid turns into the ranked list and the drawer closes. */
  const run = async () => {
    if (!extracted || filtered.length === 0) return
    setRunning(true)
    try {
      const rec = await runRanking({ openingId, rawText: jdText, extracted, requirements, pool: filtered })
      if (ranking) clearDraft(ranking.jd.id) // the edits are now scored
      loadedFor.current = rec.jd.id
      setRanking(rec)
      updateParams(
        { ranking: rec.jd.id, q: search.term || null, qm: search.mode === 'full' ? 'full' : null },
        { push: !ranking },
      )
      setDrawerOpen(false)
      setEpoch((e) => e + 1)
    } catch (e) {
      setNotice(`Ranking failed: ${e instanceof Error ? e.message : e}`)
    } finally {
      setRunning(false)
    }
  }

  /** Loosening: score only the newly eligible candidates and merge them in. */
  const scoreThem = async () => {
    if (!ranking || !persistable || newcomers.length === 0) return
    setScoring(true)
    try {
      const merged = await scoreNewcomers({
        jobDescriptionId: ranking.jd.id,
        requirements: persistable,
        newcomers,
        existing: ranking.results,
        profilesById,
      })
      setRanking({ jd: { ...ranking.jd, requirements: persistable }, results: merged })
      setEpoch((e) => e + 1)
    } catch (e) {
      setNotice(`Scoring failed: ${e instanceof Error ? e.message : e}`)
    } finally {
      setScoring(false)
    }
  }

  /** Clear exits ranking mode: the JD, preference rows and ranking go;
   *  Required rows stay on as plain filters (spec §2.2). */
  const clearRanking = () => {
    if (ranking) clearDraft(ranking.jd.id)
    reqs.dropPreferences()
    setRanking(null)
    loadedFor.current = null
    setJdText('')
    setExtracted(null)
    setJdCollapsed(false)
    updateParams({ ranking: null, opening: null, q: null, qm: null })
    setEpoch((e) => e + 1)
  }

  const runBlocker = !extracted
    ? 'Read the job description first.'
    : filtered.length === 0
      ? 'No candidates meet everything marked Required.'
      : null

  // ---- render ------------------------------------------------------------------

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
          onClick={() => openDrawer()}
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
            onClearAll={handleClearAll}
            gridOnlyMustHaves={gridOnlyChips}
            onOpenRequirement={(id) => openDrawer(id)}
          />
        )}
      </div>

      {ranking && ranked && (
        <RankingBanner
          rankedCount={ranked.length}
          excludedCount={excludedCount}
          linkedOpeningName={ranking.jd.opening_id ? openingName : null}
          onEdit={() => openDrawer()}
          onSave={ranking.jd.opening_id ? undefined : () => setSaveOpen(true)}
          onClear={clearRanking}
          newcomerCount={newcomers.length}
          onScoreNewcomers={scoreThem}
          scoringNewcomers={scoring}
          requirementsChanged={requirementsChanged}
          onRerun={run}
          rerunning={running}
          rerunBlocker={runBlocker}
        />
      )}

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-ink-soft" aria-live="polite">
          {data ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Loading…'}
        </p>
        <SortDropdown value={sort} onChange={setSort} ranked={!!ranking} />
      </div>

      {!data && <DirectorySkeleton />}

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data &&
          results.map((p) => (
            <FlipCard
              key={`${p.id}-${epoch}`}
              profile={p}
              portfolio={data.portfolioByProfile.get(p.id) ?? []}
              intro={data.introByProfile.get(p.id) ?? null}
              audioCount={data.audioCountByProfile.get(p.id) ?? 0}
              onFavorite={(p) => save(p, 'favorite')}
              onTopPick={(p) => save(p, 'top_pick')}
              ranked={
                rankedById.has(p.id)
                  ? {
                      position: rankedById.get(p.id)!.position,
                      result: rankedById.get(p.id)!.result,
                      onAbout: () => setAboutId(p.id),
                    }
                  : undefined
              }
            />
          ))}
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
            onClick={handleClearAll}
            className="mt-4 rounded-full border border-line bg-white px-4 py-1.5 text-sm font-medium text-ink-soft hover:border-ink-faint"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Phones: a sticky way back into the requirements while ranked. */}
      {ranking && !drawerOpen && (
        <button
          onClick={() => openDrawer()}
          className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg md:hidden"
        >
          <SlidersHorizontal size={14} aria-hidden /> Edit requirements
        </button>
      )}

      {gridOptions && (
        <RankingPanel
          open={drawerOpen}
          onClose={closeDrawer}
          jd={{
            text: jdText,
            setText: setJdText,
            collapsed: jdCollapsed,
            setCollapsed: setJdCollapsed,
            reading,
            onRead: readJd,
            extracted,
          }}
          store={reqs}
          options={gridOptions}
          countFn={countFn}
          poolSize={data?.profiles.length ?? 0}
          focusId={focusId}
          onFocusRow={setFocusId}
          orgPrefill={orgPrefill}
          onRun={run}
          running={running}
          runLabel={ranking ? 'Re-run ranking' : 'Run ranking'}
          linkedOpeningName={openingId ? openingName : null}
        />
      )}

      <AboutResultModal
        open={!!about}
        onClose={() => setAboutId(null)}
        profile={about?.profile ?? null}
        result={about?.result ?? null}
        rank={about?.position ?? 0}
      />

      <SignupPrompt open={gatedFeature !== null} onClose={() => setGatedFeature(null)} feature={gatedFeature ?? ''} />
      {saveUi}
      {ranking && (
        <SaveRankingModal
          jobDescriptionId={ranking.jd.id}
          open={saveOpen}
          onClose={() => setSaveOpen(false)}
          onSaved={(opening) => {
            setRanking((r) => (r ? { ...r, jd: { ...r.jd, opening_id: opening.id } } : r))
            updateParams({ opening: opening.id })
            setNotice(`Ranking saved to "${opening.name}" — it'll be there when you return.`)
          }}
        />
      )}

      {notice && (
        <div
          className="fixed bottom-4 left-1/2 z-[55] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg"
          role="status"
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
