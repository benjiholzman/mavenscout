import { Bookmark, RefreshCw, SearchX, SlidersHorizontal, Sparkles, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FilterBar } from '../components/directory/FilterBar'
import { InfoTip } from '../components/ui/InfoTip'
import { FlipCard } from '../components/directory/FlipCard'
import { JumpToTop } from '../components/directory/JumpToTop'
import { SortDropdown } from '../components/directory/SortDropdown'
import { AboutResultModal } from '../components/match/AboutResultModal'
import { SaveRankingModal } from '../components/match/SaveRankingModal'
import { useSaveCandidate } from '../components/openings/SaveCandidateFlow'
import type { CountFn } from '../components/ranking/PoolPreview'
import { PrioritiesModal } from '../components/ranking/PrioritiesModal'
import type { EmployerOption, PickerOptions } from '../components/ranking/PriorityTabs'
import { SignupPrompt } from '../components/ui/SignupPrompt'
import { DirectorySkeleton } from '../components/ui/Skeletons'
import { useDirectoryData } from '../hooks/useDirectoryData'
import {
  buildExpertiseIndex,
  EMPTY_EXPERTISE_INDEX,
  upgradeLegacyExtracted,
  upgradeLegacyRequirements,
} from '../lib/expertise'
import { deriveOptions, facetCounts, type FilterCountKey, type FilterState } from '../lib/filters'
import { extractRequirements } from '../lib/matching/extract'
import {
  loadLatestForOpening,
  loadRanking,
  runRanking,
  scoreNewcomers,
  updateRunRequirements,
  type RankingRecord,
} from '../lib/matching/persist'
import { hasPreferenceRows, runBlockerFor } from '../lib/matching/preferences'
import type { ExtractedRequirements, RankingMode, RequirementOf } from '../lib/matching/types'
import {
  gridOnlyMustHaves,
  isMust,
  mustHavesToFilterState,
  preferenceKey,
  sameRows,
  withoutHiddenKinds,
  withRunPreferences,
} from '../lib/requirements/model'
import { clearDraft, readDraft, writeDraft } from '../lib/requirements/draft'
import { applyMustHaves, applyOrgMustHaves } from '../lib/requirements/mustHaves'
import { orgNames, passesOrgMustHave, PEER_GROUP_LABELS, peerTypeOf } from '../lib/requirements/match'
import { priorityRows, tabOf, type TabKey } from '../lib/requirements/priorities'
import { useRequirements, type RequirementsState } from '../lib/requirements/store'
import {
  employerGroups,
  orgAcronym,
  orgAliases,
  orgLogoUrl,
  ORG_TYPE_LABELS,
  resolveOrganization,
} from '../lib/organizations'
import { FIRMS_ENABLED } from '../lib/config'
import { useSession } from '../lib/session'
import { VERIFIED_IDENTITY_STATEMENT } from '../lib/testimonials/copy'
import { sortProfiles, type SortMode } from '../lib/sort'
import { supabase } from '../lib/supabase'

// Directory ("Find an Expert") + ranking mode (match rework spec §2, §8).
//
// URL state: ?rank=1 opens the priorities modal; ?ranking=<job_description_id>
// shows that ranking (reload and back restore it); ?opening=<id> links the run
// to an opening (its runs save automatically); ?q / ?qm carry the search term
// while ranked, so the pool restores with it.

export default function Directory() {
  const { data, error } = useDirectoryData()
  const { hasAccess, role } = useSession()
  const [params, setParams] = useSearchParams()
  const rankingId = params.get('ranking')
  const openingId = params.get('opening')
  const rankParam = params.get('rank') === '1'

  // One requirements store behind the filter bar and the ranking modal —
  // spec §2.1. The filter bar renders the Required rows as a FilterState and
  // writes changes back as rows; the modal edits a draft copy and commits it.
  const reqs = useRequirements()
  const { requirements, search } = reqs.state
  const filters = useMemo(() => mustHavesToFilterState(requirements, search), [requirements, search])
  const [sort, setSort] = useState<SortMode>('recommended')
  // Bumped whenever the result set changes so card flip state resets (PRD 7.1).
  const [epoch, setEpoch] = useState(0)
  const [gatedFeature, setGatedFeature] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { save, ui: saveUi } = useSaveCandidate()

  // Priorities modal: the JD and its suggestions live here so closing the
  // modal loses nothing; the rows live in the shared store.
  const [modalOpen, setModalOpen] = useState(false)
  const [modalView, setModalView] = useState<TabKey | null>(null)
  const [jdText, setJdText] = useState('')
  const [jdCollapsed, setJdCollapsed] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedRequirements | null>(null)
  const [reading, setReading] = useState(false)

  // The active ranking (loaded from, and mirrored in, the URL).
  const [ranking, setRanking] = useState<RankingRecord | null>(null)
  const [running, setRunning] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [openingName, setOpeningName] = useState<string | null>(null)
  /** "About this result": the profile id whose build-up is open. */
  const [aboutId, setAboutId] = useState<string | null>(null)

  const canRank = role === 'hiring_manager' && hasAccess

  useEffect(() => {
    const prev = document.title
    document.title = 'Find an Expert · MavenScout'
    return () => {
      document.title = prev
    }
  }, [])

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
    if (!hasAccess || role === 'hiring_manager') setGatedFeature('Ranking candidates')
    else setNotice('Ranking is part of the hiring toolkit — switch to a hiring account to use it.')
    return false
  }, [canRank, hasAccess, role])

  // ---- data ------------------------------------------------------------------

  /** The unified expertise list: kinds for matching, groups for pickers. */
  const expertise = useMemo(
    () => (data ? buildExpertiseIndex(data.taxonomyCategories, data.taxonomyItems) : null),
    [data],
  )

  const handleFilterChange = (next: FilterState) => {
    reqs.fromFilterBar(next)
    setEpoch((e) => e + 1)
  }
  const handleClearAll = () => {
    reqs.clearMustHaves()
    setEpoch((e) => e + 1)
  }

  const options = useMemo(() => (data ? deriveOptions(data.profiles) : null), [data])
  const profilesById = useMemo(() => new Map((data?.profiles ?? []).map((p) => [p.id, p])), [data])

  /** Picker options for the priorities modal. */
  const gridOptions = useMemo<PickerOptions | null>(() => {
    if (!data || !options || !expertise) return null
    const typeOf = (id: string) => data.taxonomyCategories.find((c) => c.id === id)?.type
    return {
      expertise,
      locations: options.locationTree,
      languages: options.languages,
      workArrangements: data.taxonomyItems
        .filter((i) => typeOf(i.category_id) === 'work_arrangement')
        .map((i) => i.name),
    }
  }, [data, options, expertise])

  /** Candidates meeting every Required row and the search term. */
  const filtered = useMemo(() => {
    if (!data || !expertise) return []
    return applyMustHaves(data.profiles, data.portfolioByProfile, requirements, search, expertise, data.orgs)
  }, [data, expertise, requirements, search])

  const countFor = useCallback(
    (key: FilterCountKey, values: string[]) => {
      if (!data || !expertise) return new Map<string, number>()
      if (key === 'previousEmployers') {
        // Everyone meeting the other Required rows, then "ever at" each employer.
        const pool = applyMustHaves(
          data.profiles,
          data.portfolioByProfile,
          requirements.filter((r) => !(r.kind === 'org_history' && isMust(r))),
          search,
          expertise,
          data.orgs,
        )
        return new Map(
          values.map((org) => [org, pool.filter((p) => passesOrgMustHave(p, { org, scope: 'ever', peers: [] }, data.orgs)).length]),
        )
      }
      return facetCounts(
        // Org History Required rows are evaluated with the organizations list, so apply them first.
        applyOrgMustHaves(data.profiles, requirements, data.orgs),
        data.portfolioByProfile,
        filters,
        expertise,
        key,
        values,
      )
    },
    [data, expertise, requirements, search, filters],
  )

  const employers = useMemo(() => (data ? employerGroups(data.profiles, data.orgs) : []), [data])

  /** The modal's Employers list: the pool's employers, with their type, logo
   *  and peer group from the organizations list. */
  const employerOptions = useMemo<EmployerOption[]>(() => {
    if (!data) return []
    return employers.flatMap((g) =>
      g.items.map((name) => {
        const org = resolveOrganization(data.orgs, name)
        return {
          name,
          orgId: org?.id ?? null,
          typeLabel: org ? ORG_TYPE_LABELS[org.type] : null,
          logoUrl: orgLogoUrl(org),
          acronym: orgAcronym(org),
          peerLabel: org ? PEER_GROUP_LABELS[org.type] : null,
        }
      }),
    )
  }, [data, employers])

  const peerLabel = useCallback(
    (r: RequirementOf<'org_history'>) => {
      const type = data ? peerTypeOf(r.value, data.orgs) : null
      return type ? PEER_GROUP_LABELS[type] : null
    },
    [data],
  )

  const gridOnlyChips = useMemo(
    () => gridOnlyMustHaves(requirements).map((r) => ({ id: r.id, label: `Employer: ${orgNames(r.value)}` })),
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
    if (!ranking || !data || !expertise) return 0
    const searchPool = applyMustHaves(data.profiles, data.portfolioByProfile, [], search, expertise, data.orgs)
    return searchPool.length - filtered.length
  }, [ranking, data, expertise, search, filtered])

  /** Requirements as stored for this run: the current Required rows plus the
   *  preference rows the run was scored with. */
  const persistable = useMemo(
    () => (ranking ? withRunPreferences(requirements, ranking.jd.requirements ?? []) : null),
    [ranking, requirements],
  )

  /** Priorities the run on screen was set with (the header button's badge). */
  const priorityCount = useMemo(() => priorityRows(requirements).length, [requirements])

  /** The mode of the run on screen. */
  const rankMode: RankingMode = ranking?.jd.mode ?? 'jd'

  /** Preference rows or (for a JD run) the JD differ from what was scored →
   *  Re-run prompt (edits restored from a draft; the modal always re-runs). */
  const requirementsChanged = useMemo(
    () =>
      !!ranking &&
      (preferenceKey(requirements) !== preferenceKey(ranking.jd.requirements ?? []) ||
        (rankMode === 'jd' && jdText.trim() !== ranking.jd.raw_text.trim())),
    [ranking, requirements, jdText, rankMode],
  )

  const results = useMemo(
    () => (ranked ? ranked.map((r) => r.profile) : sortProfiles(filtered, sort)),
    [ranked, filtered, sort],
  )
  const rankedById = useMemo(() => new Map((ranked ?? []).map((r) => [r.profile.id, r])), [ranked])
  const about = aboutId ? rankedById.get(aboutId) ?? null : null

  // ---- ranking mode: URL → state --------------------------------------------

  // ?rank=1 opens the modal once (the /match redirect and openings land here).
  useEffect(() => {
    if (!rankParam) return
    updateParams({ rank: null })
    if (gateRanking()) {
      setModalView(null)
      setModalOpen(true)
    }
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
    // Old saved rankings are read through the expertise list, so wait for it.
    if (!expertise) return
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
      // A run saved before the unified list (skill rows, old names, category
      // rows) is read through it; the stored rows stay as they are, and the
      // scores and build-up show exactly as they were scored.
      const upgraded = upgradeLegacyRequirements(rec.jd.requirements ?? [], expertise)
      // Rows of kinds the grid no longer offers (Type while firms are hidden)
      // are left out the same way.
      const offered = withoutHiddenKinds(upgraded.requirements)
      const jd = { ...rec.jd, requirements: offered.requirements, extracted: upgradeLegacyExtracted(rec.jd.extracted, expertise) }
      setRanking({ ...rec, jd })
      const notes: string[] = []
      if (upgraded.dropped.length > 0)
        notes.push(
          `This ranking was saved before the unified expertise list. ${upgraded.dropped.length} expertise row` +
            `${upgraded.dropped.length === 1 ? '' : 's'} with no match on the new list (${upgraded.dropped.join(', ')}) ` +
            `${upgraded.dropped.length === 1 ? 'was' : 'were'} left out; re-run to score it under the new list.`,
        )
      if (offered.dropped.length > 0)
        notes.push(
          `${offered.dropped.join(', ')} ${offered.dropped.length === 1 ? 'is' : 'are'} no longer a requirement, ` +
            `so ${offered.dropped.length === 1 ? 'that row was' : 'those rows were'} left out; re-run to score without ${offered.dropped.length === 1 ? 'it' : 'them'}.`,
        )
      if (notes.length > 0) setNotice(notes.join(' '))
      // Unsaved preference / JD edits made before leaving come back as a
      // draft (the stored ranking itself is unchanged until a re-run).
      const draft = readDraft(rankingId)
      reqs.hydrate({
        requirements: draft
          ? withoutHiddenKinds(upgradeLegacyRequirements(draft.requirements, expertise).requirements).requirements
          : jd.requirements,
        search: { term: params.get('q') ?? '', mode: params.get('qm') === 'full' ? 'full' : 'names' },
      })
      const text = draft?.jdText ?? rec.jd.raw_text
      setJdText(text)
      setExtracted(draft ? upgradeLegacyExtracted(draft.extracted, expertise) : jd.extracted)
      // A preferences run has no JD to preview: leave the box open for one.
      setJdCollapsed(!!text.trim())
      setEpoch((e) => e + 1)
    })
    return () => {
      cancelled = true
    }
    // Runs per ranking id (once the expertise list is in); the other values are
    // read at load time on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankingId, expertise])

  // While ranked, the search term rides in the URL so a reload restores the pool.
  useEffect(() => {
    if (!ranking) return
    updateParams({ q: search.term || null, qm: search.mode === 'full' ? 'full' : null })
  }, [ranking, search.term, search.mode, updateParams])

  // Unsaved edits (preference rows, JD) are kept as a per-tab draft so they
  // survive leaving and returning; matching the run again discards it.
  useEffect(() => {
    if (!ranking) return
    if (requirementsChanged) writeDraft(ranking.jd.id, { requirements, jdText, extracted, tab: rankMode })
    else clearDraft(ranking.jd.id)
  }, [ranking, requirementsChanged, requirements, jdText, extracted, rankMode])

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

  // ---- ranking mode: actions ------------------------------------------------

  /** Opens the modal, on the tab holding `focusId` when given (a filter-bar
   *  chip). */
  const openModal = (focusId?: string) => {
    if (!gateRanking()) return
    const row = focusId ? requirements.find((r) => r.id === focusId) : undefined
    setModalView(row ? tabOf(row.kind) : null)
    setModalOpen(true)
  }
  const closeModal = useCallback(() => setModalOpen(false), [])

  /** Clearing the JD drops its suggestions: the run becomes preferences-only. */
  const changeJdText = (text: string) => {
    setJdText(text)
    if (!text.trim()) setExtracted(null)
  }

  /** Reads the JD; the modal adds what it found (places and languages, at
   *  Nice to have) to its draft. Expertise only feeds Fit. */
  const readJd = async (): Promise<ExtractedRequirements | null> => {
    if (!data || !options) return null
    setReading(true)
    try {
      const found = await extractRequirements(jdText, {
        taxonomy: { categories: data.taxonomyCategories, items: data.taxonomyItems },
        locationOptions: options.locations.flatMap((g) => [g.label, ...g.items]),
        languageOptions: options.languages,
      })
      setExtracted(found)
      setJdCollapsed(true)
      return found
    } finally {
      setReading(false)
    }
  }

  const countFn = useCallback<CountFn>(
    (reqRows, s) =>
      data && expertise ? applyMustHaves(data.profiles, data.portfolioByProfile, reqRows, s, expertise, data.orgs).length : 0,
    [data, expertise],
  )

  const runBlocker = runBlockerFor({ mode: rankMode, jdText, read: !!extracted, requirements, poolCount: filtered.length })

  /** Run: Required rows pre-filter the pool, the survivors are scored, the
   *  grid turns into the ranked list and the modal closes. A JD run is scored
   *  by the engine; a priorities run by priorities alone (spec §11). */
  const run = async (state: RequirementsState = reqs.state, mode: RankingMode = rankMode) => {
    if (!data || !expertise) return
    const pool = applyMustHaves(data.profiles, data.portfolioByProfile, state.requirements, state.search, expertise, data.orgs)
    if (runBlockerFor({ mode, jdText, read: !!extracted, requirements: state.requirements, poolCount: pool.length })) return
    setRunning(true)
    try {
      const rec = await runRanking({
        openingId,
        mode,
        rawText: mode === 'jd' ? jdText : '',
        extracted: mode === 'jd' ? extracted : null,
        requirements: state.requirements,
        pool,
      })
      if (ranking) clearDraft(ranking.jd.id) // the edits are now scored
      loadedFor.current = rec.jd.id
      setRanking(rec)
      updateParams(
        { ranking: rec.jd.id, q: state.search.term || null, qm: state.search.mode === 'full' ? 'full' : null },
        { push: !ranking },
      )
      setModalOpen(false)
      setEpoch((e) => e + 1)
    } catch (e) {
      setNotice(`Ranking failed: ${e instanceof Error ? e.message : e}`)
    } finally {
      setRunning(false)
    }
  }

  /** "See my matches" / "See your matches": the draft becomes the directory's
   *  requirements. With nothing to weigh (only Must haves, or nothing), it
   *  just filters: any ranking on screen is cleared and the Must haves stay
   *  on as filters. Otherwise it ranks. */
  const commitPriorities = (state: RequirementsState, mode: RankingMode) => {
    reqs.hydrate(state)
    setEpoch((e) => e + 1)
    if (mode === 'preferences' && !hasPreferenceRows(state.requirements)) {
      if (ranking) exitRanking()
      setModalOpen(false)
      return
    }
    void run(state, mode)
  }

  /** Loosening: score only the newly eligible candidates and merge them in. */
  const scoreThem = async () => {
    if (!ranking || !persistable || newcomers.length === 0) return
    setScoring(true)
    try {
      const merged = await scoreNewcomers({
        jobDescriptionId: ranking.jd.id,
        mode: ranking.jd.mode ?? 'jd',
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

  /** Leaves ranking mode without touching the rows. */
  const exitRanking = () => {
    if (ranking) clearDraft(ranking.jd.id)
    setRanking(null)
    loadedFor.current = null
    updateParams({ ranking: null, opening: null, q: null, qm: null })
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
          <h1 className="text-3xl font-semibold">Find an Expert</h1>
          <p className="mt-1 text-sm text-ink-soft">
            A curated pool of vetted {FIRMS_ENABLED ? 'consultants and firms' : 'experts'} in international development.{' '}
            {/* The verification statement (profiles-membership §3.2). */}
            <span className="relative top-0.5">
              <InfoTip text={VERIFIED_IDENTITY_STATEMENT} />
            </span>
          </p>
        </div>
        {/* Ranking — deliberately separate from the filter bar (PRD 7.1). */}
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-ink/85"
        >
          <Sparkles size={16} className="text-gold-300" />
          {ranking ? 'Edit ranking' : 'Rank candidates'}
          {ranking && priorityCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-500 px-1.5 text-xs font-semibold text-ink">
              {priorityCount}
            </span>
          )}
        </button>
      </div>

      <div className="mt-6">
        {data && options && (
          <FilterBar
            filters={filters}
            onChange={handleFilterChange}
            locations={options.locationTree}
            languages={options.languages}
            taxonomyCategories={data.taxonomyCategories}
            taxonomyItems={data.taxonomyItems}
            expertise={expertise ?? EMPTY_EXPERTISE_INDEX}
            countFor={countFor}
            onClearAll={handleClearAll}
            gridOnlyMustHaves={gridOnlyChips}
            onOpenRequirement={(id) => openModal(id)}
            employers={employers}
            employerSearchTerms={(name) => orgAliases(data.orgs, name)}
          />
        )}
      </div>

      <hr className="mt-6 border-line" />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0" aria-live="polite">
          {ranking && openingName && ranking.jd.opening_id && (
            <p className="text-xs font-medium text-gold-800">Ranking for: {openingName}</p>
          )}
          <p className="text-[15px] text-ink-soft">
            {!data
              ? 'Loading…'
              : ranked
                ? `${ranked.length} expert${ranked.length === 1 ? '' : 's'} ranked by your ${rankMode === 'jd' ? 'job description and priorities' : 'priorities'}`
                : `${results.length} result${results.length === 1 ? '' : 's'}`}
            {ranking && excludedCount > 0 && (
              <span className="text-ink-faint"> · {excludedCount} filtered out by your Must haves</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {ranking && (
            <>
              <button
                type="button"
                onClick={clearRanking}
                className="px-1.5 text-sm text-ink-soft underline underline-offset-[3px] hover:text-ink"
              >
                Clear ranking
              </button>
              {!ranking.jd.opening_id && (
                <button
                  type="button"
                  onClick={() => setSaveOpen(true)}
                  className="flex h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-medium text-ink hover:border-[#B9C3C7]"
                >
                  <Bookmark size={15} className="text-brand-500" aria-hidden />
                  Save ranking
                </button>
              )}
            </>
          )}
          <SortDropdown value={sort} onChange={setSort} ranked={!!ranking} />
        </div>
      </div>

      {ranking && (newcomers.length > 0 || requirementsChanged) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {newcomers.length > 0 && (
            <button
              type="button"
              onClick={scoreThem}
              disabled={scoring}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-[13px] font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60"
            >
              <UserPlus size={14} aria-hidden />
              {scoring
                ? 'Scoring…'
                : `${newcomers.length} more expert${newcomers.length === 1 ? '' : 's'} now meet your Must haves — score ${newcomers.length === 1 ? 'them' : 'them'}`}
            </button>
          )}
          {requirementsChanged && (
            <button
              type="button"
              onClick={() => void run()}
              disabled={running || !!runBlocker}
              title={runBlocker ?? undefined}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold-300 bg-gold-300/20 px-3.5 py-1.5 text-[13px] font-medium text-gold-800 hover:bg-gold-300/30 disabled:opacity-60"
            >
              <RefreshCw size={14} aria-hidden />
              {running ? 'Ranking…' : 'Priorities changed since this ranking — re-run'}
            </button>
          )}
        </div>
      )}

      {!data && <DirectorySkeleton />}

      <div className="mt-4 grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data &&
          results.map((p) => (
            <FlipCard
              key={`${p.id}-${epoch}`}
              profile={p}
              portfolio={data.portfolioByProfile.get(p.id) ?? []}
              testimonialOrgs={data.testimonialOrgsByProfile.get(p.id) ?? []}
              orgs={data.orgs}
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

      {/* Phones: a sticky way back into the priorities while ranked. */}
      {ranking && !modalOpen && (
        <button
          onClick={() => openModal()}
          className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg md:hidden"
        >
          <SlidersHorizontal size={14} aria-hidden /> Edit ranking
        </button>
      )}

      {gridOptions && (
        <PrioritiesModal
          open={modalOpen}
          onClose={closeModal}
          committed={reqs.state}
          initialView={modalView}
          options={gridOptions}
          employers={employerOptions}
          peerLabel={peerLabel}
          countFn={countFn}
          poolSize={data?.profiles.length ?? 0}
          jd={{
            text: jdText,
            setText: changeJdText,
            collapsed: jdCollapsed,
            setCollapsed: setJdCollapsed,
            reading,
            read: readJd,
            extracted,
          }}
          onCommit={commitPriorities}
          running={running}
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

      <JumpToTop />

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
