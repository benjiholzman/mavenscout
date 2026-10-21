import { SearchX, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FilterBar } from '../components/directory/FilterBar'
import { FlipCard } from '../components/directory/FlipCard'
import { SortDropdown } from '../components/directory/SortDropdown'
import { useSaveCandidate } from '../components/openings/SaveCandidateFlow'
import type { CountFn } from '../components/ranking/LiveCount'
import { RankingPanel } from '../components/ranking/RankingPanel'
import type { GridOptions } from '../components/ranking/RequirementsGrid'
import { SignupPrompt } from '../components/ui/SignupPrompt'
import { DirectorySkeleton } from '../components/ui/Skeletons'
import { extractRequirements } from '../lib/matching/extract'
import type { ExtractedRequirements } from '../lib/matching/types'
import { useDirectoryData } from '../hooks/useDirectoryData'
import {
  buildTaxonomyTree,
  deriveOptions,
  facetCounts,
  type FacetKey,
  type FilterState,
} from '../lib/filters'
import {
  gridOnlyMustHaves,
  mustHavesToFilterState,
  type TagLevelOf,
} from '../lib/requirements/model'
import { applyMustHaves, applyOrgMustHaves } from '../lib/requirements/mustHaves'
import { useRequirements } from '../lib/requirements/store'
import { DEMO_HIRING_MANAGER_ID, useSession } from '../lib/session'
import { sortProfiles, type SortMode } from '../lib/sort'
import { supabase } from '../lib/supabase'

export default function Directory() {
  const { data, error } = useDirectoryData()
  const { isLoggedIn, role } = useSession()

  // One requirements store behind the filter bar and (in ranking mode) the
  // ranking panel — match rework spec §2.1. The filter bar renders the
  // Must-have rows as a FilterState and writes changes back as rows.
  const reqs = useRequirements()
  const { requirements, search } = reqs.state
  const filters = useMemo(() => mustHavesToFilterState(requirements, search), [requirements, search])
  const [sort, setSort] = useState<SortMode>('shuffle')
  // Bumped on every filter change so card flip state resets (PRD 7.1).
  const [epoch, setEpoch] = useState(0)
  const [gatedFeature, setGatedFeature] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { save, ui: saveUi } = useSaveCandidate()

  // Ranking panel (match rework spec §2, §8): opens beside the grid; the JD
  // and its extraction live here, the rows live in the shared store.
  const [panelOpen, setPanelOpen] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [jdText, setJdText] = useState('')
  const [jdCollapsed, setJdCollapsed] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedRequirements | null>(null)
  const [reading, setReading] = useState(false)

  const trees = useMemo(() => {
    if (!data) return null
    return {
      expertise: buildTaxonomyTree(data.taxonomyCategories, data.taxonomyItems, 'domain_expertise'),
      skills: buildTaxonomyTree(data.taxonomyCategories, data.taxonomyItems, 'technical_skills'),
    }
  }, [data])

  const tagLevelOf = useCallback<TagLevelOf>(
    (kind, name) =>
      (kind === 'expertise' ? trees?.expertise : trees?.skills)?.categoryNames.has(name)
        ? 'category'
        : 'item',
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

  const filtered = useMemo(() => {
    if (!data || !trees) return []
    return applyMustHaves(data.profiles, data.portfolioByProfile, requirements, search, trees)
  }, [data, trees, requirements, search])

  const countFor = useCallback(
    (key: FacetKey, values: string[]) =>
      data && trees
        ? facetCounts(
            // Org History must-haves have no filter-bar control, so apply them first.
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

  const results = useMemo(() => sortProfiles(filtered, sort), [filtered, sort])

  // ---- ranking panel ----------------------------------------------------------

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

  const countFn = useCallback<CountFn>(
    (reqRows, s) =>
      data && trees ? applyMustHaves(data.profiles, data.portfolioByProfile, reqRows, s, trees).length : 0,
    [data, trees],
  )

  const readJd = async () => {
    if (!data || !options) return
    setReading(true)
    try {
      const out = await extractRequirements(jdText, {
        taxonomy: { categories: data.taxonomyCategories, items: data.taxonomyItems },
        locationOptions: options.locations.flatMap((g) => [g.label, ...g.items]),
        languageOptions: options.languages,
      })
      setExtracted(out)
      reqs.applyExtraction(out)
      setJdCollapsed(true)
    } finally {
      setReading(false)
    }
  }

  // A row opened from the filter-bar chip or a "loosen" link flashes, then settles.
  useEffect(() => {
    if (!focusId) return
    const t = setTimeout(() => setFocusId(null), 2500)
    return () => clearTimeout(t)
  }, [focusId])

  // Org History's name is prefilled from the manager's own organization the
  // first time the panel opens (editable; its level stays No preference).
  const orgPrefilled = useRef(false)
  useEffect(() => {
    if (!panelOpen || orgPrefilled.current) return
    orgPrefilled.current = true
    const orgRow = requirements.find((r) => r.kind === 'org_history')
    if (!orgRow || orgRow.kind !== 'org_history' || orgRow.value.org.trim()) return
    supabase
      .from('hiring_managers')
      .select('organization')
      .eq('id', DEMO_HIRING_MANAGER_ID)
      .maybeSingle()
      .then(({ data: hm }) => {
        if (hm?.organization) reqs.setValue(orgRow.id, { ...orgRow.value, org: hm.organization })
      })
  }, [panelOpen, requirements, reqs])

  // Ranking needs a hiring account (spec §1 "Unchanged": login gating).
  const openPanel = (focus?: string) => {
    if (!isLoggedIn) return setGatedFeature('Ranking candidates against a job description')
    if (role !== 'hiring_manager')
      return setNotice('Ranking is part of the hiring toolkit — switch to a hiring account to use it.')
    setPanelOpen(true)
    setFocusId(focus ?? null)
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
          onClick={() => openPanel()}
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
            onOpenRequirement={(id) => openPanel(id)}
          />
        )}
      </div>

      {/* Panel open (desktop): panel column left, cards drop to 2 columns (spec §8). */}
      <div
        className={
          panelOpen
            ? 'mt-6 lg:grid lg:grid-cols-[400px,minmax(0,1fr)] lg:items-start lg:gap-6'
            : 'mt-6'
        }
      >
        {panelOpen && gridOptions && (
          <RankingPanel
            open
            onClose={() => setPanelOpen(false)}
            jd={{
              text: jdText,
              setText: setJdText,
              collapsed: jdCollapsed,
              setCollapsed: setJdCollapsed,
              reading,
              onRead: readJd,
              read: extracted !== null,
            }}
            store={reqs}
            options={gridOptions}
            countFn={countFn}
            poolSize={data?.profiles.length ?? 0}
            focusId={focusId}
            onFocusRow={setFocusId}
          />
        )}

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-ink-soft" aria-live="polite">
              {data ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Loading…'}
            </p>
            <SortDropdown value={sort} onChange={setSort} bestMatchAvailable={false} />
          </div>

          {!data && <DirectorySkeleton />}

          <div
            className={`mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 ${panelOpen ? '' : 'xl:grid-cols-3'}`}
          >
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
        </div>
      </div>

      <SignupPrompt
        open={gatedFeature !== null}
        onClose={() => setGatedFeature(null)}
        feature={gatedFeature ?? ''}
      />
      {saveUi}

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
