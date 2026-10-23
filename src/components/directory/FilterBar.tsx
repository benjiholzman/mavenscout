import { CalendarClock, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  firmsOnlySelected,
  hasActiveFilters,
  locationLabel,
  type FilterCountKey,
  type FilterState,
  type SearchMode,
  availabilitySummary,
  toggleAvailableNow,
} from '../../lib/filters'
import type { TaxonomyCategory, TaxonomyItem } from '../../types/db'
import { FIRMS_ENABLED } from '../../lib/config'
import { describeExpertiseSelection, type ExpertiseIndex } from '../../lib/expertise'
import { MIN_PROFICIENCY_LABELS } from '../../lib/languages'
import { treeValues } from '../../lib/tree'
import { MultiSelect, type OptionGroup, type TreeNode } from '../ui/MultiSelect'
import { FilterChip } from '../ui/FilterChip'
import { Segmented } from '../ui/Segmented'
import { Switch } from '../ui/Switch'
import { AvailabilityModal } from './AvailabilityModal'

const TYPE_OPTIONS = ['Individual', 'Small Firm', 'Large Firm']
const CAREER_LEVEL_OPTIONS = ['Early Career (0–5 yrs)', 'Mid-Career (5–15 yrs)', 'Senior (15+ yrs)']
const CAREER_LEVEL_VALUES: Record<string, string> = {
  'Early Career (0–5 yrs)': 'early_career',
  'Mid-Career (5–15 yrs)': 'mid_career',
  'Senior (15+ yrs)': 'senior',
}
const CAREER_LEVEL_LABELS_BY_VALUE = Object.fromEntries(
  Object.entries(CAREER_LEVEL_VALUES).map(([label, value]) => [value, label]),
)

export function FilterBar({
  filters,
  onChange,
  locations,
  languages,
  taxonomyCategories,
  taxonomyItems,
  expertise,
  countFor,
  onClearAll,
  gridOnlyMustHaves = [],
  onOpenRequirement,
  employers = [],
  employerSearchTerms,
  employersLockedNote,
}: {
  filters: FilterState
  onChange: (next: FilterState) => void
  /** Continent → sub-region → country → city (lib/locations). */
  locations: TreeNode[]
  languages: string[]
  taxonomyCategories: TaxonomyCategory[]
  taxonomyItems: TaxonomyItem[]
  /** The unified expertise list (groups for browsing, kinds for matching). */
  expertise: ExpertiseIndex
  /** Faceted counts for one filter's option values (see lib/filters facetCounts). */
  countFor: (key: FilterCountKey, values: string[]) => Map<string, number>
  /** Previous employers options: the pool's work-history organizations by type. */
  employers?: OptionGroup[]
  /** Extra words an employer is found by (the list's aliases). */
  employerSearchTerms?: (name: string) => string[]
  /** Set while the Required Org History row is at another scope (Currently
   *  at, or a peer): the filter can't show it, so it's locked. */
  employersLockedNote?: string
  /** Clear All. Defaults to clearing every filter through onChange; the
   *  directory passes the requirements store's clearMustHaves so must-haves
   *  without a filter-bar control (Org History) are cleared too. */
  onClearAll?: () => void
  /** Must-have rows the filter bar has no control for (match rework §2.1),
   *  shown as a chip at the end of the bar. */
  gridOnlyMustHaves?: { id: string; label: string }[]
  /** Opens the ranking panel at a requirement row (the chip's action). */
  onOpenRequirement?: (id: string) => void
}) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [availabilityOpen, setAvailabilityOpen] = useState(false)

  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value })

  const toggleFor = (key: string) => (open: boolean) => setOpenKey(open ? key : null)
  const firmsOnly = firmsOnlySelected(filters.types)

  const workArrangements = taxonomyItems
    .filter((i) => {
      const cat = taxonomyCategories.find((c) => c.id === i.category_id)
      return cat?.type === 'work_arrangement'
    })
    .map((i) => i.name)

  // Counts are computed only for the dropdown that's open.
  const openCounts = useMemo(() => {
    switch (openKey) {
      case 'type':
        return countFor('types', TYPE_OPTIONS)
      case 'expertise':
        return countFor('expertise', expertise.items.map((i) => i.name))
      case 'career': {
        const byValue = countFor('careerLevels', Object.values(CAREER_LEVEL_VALUES))
        return new Map(CAREER_LEVEL_OPTIONS.map((l) => [l, byValue.get(CAREER_LEVEL_VALUES[l]) ?? 0]))
      }
      case 'arrangement':
        return countFor('workArrangements', workArrangements)
      case 'location':
        return countFor('locations', treeValues(locations))
      case 'language':
        return countFor('languages', languages)
      case 'employers':
        return countFor('previousEmployers', employers.flatMap((g) => g.items))
      default:
        return undefined
    }
  }, [openKey, countFor, filters])

  return (
    <div className="space-y-3">
      {/* Search — two modes (PRD 7.1), picked inside the field; switching
          modes re-runs the same term. The two toggles share its line. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <div className="flex h-10 w-full min-w-0 items-center rounded-xl border border-line bg-white transition focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 sm:w-auto sm:flex-1 lg:max-w-xl">
          <div role="radiogroup" aria-label="Search mode" className="flex shrink-0 items-center gap-0.5 p-1">
            {(
              [
                ['names', 'Names', ' only'],
                ['full', 'Full profiles', ''],
              ] as [SearchMode, string, string][]
            ).map(([mode, label, wide]) => {
              const active = filters.searchMode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set('searchMode', mode)}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    active ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {label}
                  {/* Phones drop " only" to leave the input room. */}
                  {wide && <span className="hidden sm:inline">{wide}</span>}
                </button>
              )
            })}
          </div>
          <span className="h-full w-px shrink-0 bg-line" aria-hidden />
          <label className="flex h-full min-w-0 flex-1 items-center gap-2 pl-3 pr-2">
            <Search size={16} className="shrink-0 text-ink-faint" aria-hidden />
            <span className="sr-only">Search</span>
            <input
              type="search"
              value={filters.searchTerm}
              onChange={(e) => set('searchTerm', e.target.value)}
              placeholder={filters.searchMode === 'names' ? 'Search names' : 'Search full profiles'}
              className="h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-faint"
            />
          </label>
        </div>

        {/* Featured Members' interview videos; a filter only, never scored. */}
        <Switch
          checked={filters.hasVideoQnas}
          onChange={(v) => set('hasVideoQnas', v)}
          label="Video Q&As only"
        />
        {/* Shares state with the Availability filter and its requirement
            row: on = available now on either chosen track (fresh within
            AVAILABILITY_FRESH_DAYS); off drops the timing, keeping the tracks. */}
        <Switch
          checked={filters.availability?.when === 'now'}
          onChange={(on) => set('availability', toggleAvailableNow(filters.availability, on))}
          label="Available now"
        />
        {/* Off by default; a filter only, never scored (testimonials never
            feed ranking). */}
        <Switch
          checked={filters.hasAudioTestimonial}
          onChange={(v) => set('hasAudioTestimonial', v)}
          label="Audio testimonials only"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Hidden while firm listings are off (spec §1): everyone is an individual. */}
        {FIRMS_ENABLED && (
          <MultiSelect
            label="Type"
            options={TYPE_OPTIONS}
            selected={filters.types}
            onChange={(v) => set('types', v)}
          onClear={() => set('types', [])}
            counts={openKey === 'type' ? openCounts : undefined}
            open={openKey === 'type'}
            onToggle={toggleFor('type')}
          />
        )}
        <MultiSelect
          label="Expertise"
          groups={expertise.groups}
          searchable
          searchTerms={(v) => {
            const item = expertise.byName.get(v)
            return item ? [...item.aliases, ...item.legacyNames] : []
          }}
          selected={filters.expertise}
          onChange={(v) => set('expertise', v)}
          onClear={() => set('expertise', [])}
          counts={openKey === 'expertise' ? openCounts : undefined}
          open={openKey === 'expertise'}
          onToggle={toggleFor('expertise')}
          header={
            // The setting lives on the Required rows, so it appears once something is picked.
            filters.expertise.length > 0 ? (
              <Switch
                checked={filters.expertiseIncludeWorking}
                onChange={(v) => set('expertiseIncludeWorking', v)}
                label="Include Working knowledge"
              />
            ) : undefined
          }
          note={
            filters.expertise.length > 1
              ? `Showing experts with ${describeExpertiseSelection(filters.expertise, expertise)}: any of the same kind (sectors, themes, methods), all of different kinds.`
              : 'Matches Core and Strong expertise unless Working knowledge is included. Two sectors match either; a sector and a method need both.'
          }
        />
        <MultiSelect
          label="Career Level"
          options={CAREER_LEVEL_OPTIONS}
          selected={filters.careerLevels.map((v) => CAREER_LEVEL_LABELS_BY_VALUE[v] ?? v)}
          onChange={(labels) => set('careerLevels', labels.map((l) => CAREER_LEVEL_VALUES[l] ?? l))}
          onClear={() => set('careerLevels', [])}
          disabled={firmsOnly}
          disabledNote="Career level applies to individuals — it doesn't apply when filtering firms only"
          note={FIRMS_ENABLED ? "Firms aren't filtered by career level — they always show." : undefined}
          counts={openKey === 'career' ? openCounts : undefined}
          open={openKey === 'career'}
          onToggle={toggleFor('career')}
        />
        <MultiSelect
          label="Work Arrangement"
          options={workArrangements}
          selected={filters.workArrangements}
          onChange={(v) => set('workArrangements', v)}
          onClear={() => set('workArrangements', [])}
          counts={openKey === 'arrangement' ? openCounts : undefined}
          open={openKey === 'arrangement'}
          onToggle={toggleFor('arrangement')}
        />
        <MultiSelect
          label="Location"
          tree={locations}
          formatValue={locationLabel}
          selected={filters.locations}
          onChange={(v) => set('locations', v)}
          onClear={() => set('locations', [])}
          counts={openKey === 'location' ? openCounts : undefined}
          open={openKey === 'location'}
          onToggle={toggleFor('location')}
        />
        <MultiSelect
          label="Language"
          options={languages}
          selected={filters.languages}
          onChange={(v) => set('languages', v)}
          onClear={() => set('languages', [])}
          header={
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-ink-soft">Spoken at</span>
              <Segmented
                label="Minimum language level"
                value={filters.languageLevel}
                options={(['working', 'fluent'] as const).map((v) => ({ value: v, label: MIN_PROFICIENCY_LABELS[v] }))}
                onChange={(v) => set('languageLevel', v)}
                className="w-full"
              />
            </div>
          }
          note="Fluent counts as Working."
          counts={openKey === 'language' ? openCounts : undefined}
          open={openKey === 'language'}
          onToggle={toggleFor('language')}
        />

        {/* Availability — compound query gets its own small modal (PRD 7.1). */}
        <FilterChip
          active={!!filters.availability}
          onClick={() => setAvailabilityOpen(true)}
          onClear={() => set('availability', null)}
          clearLabel="Clear Availability"
          icon={<CalendarClock size={14} className="shrink-0" aria-hidden />}
        >
          <span className="truncate">
            {filters.availability ? availabilitySummary(filters.availability) : 'Availability'}
          </span>
        </FilterChip>

        {/* Less used: kept at the end of the row, after the main filters.
            It's the Required Org History row at "Ever at" (shared state). */}
        {employers.length > 0 && (
          <MultiSelect
            label="Previous employers"
            groups={employers}
            searchTerms={employerSearchTerms}
            selected={filters.previousEmployers}
            onChange={(v) => set('previousEmployers', v)}
            onClear={() => set('previousEmployers', [])}
            disabled={!!employersLockedNote}
            disabledNote={employersLockedNote}
            note="Experts who have worked at any of the organizations you pick, including their country offices."
            counts={openKey === 'employers' ? openCounts : undefined}
            open={openKey === 'employers'}
            onToggle={toggleFor('employers')}
          />
        )}

        {gridOnlyMustHaves.length > 0 && (
          <button
            onClick={() => onOpenRequirement?.(gridOnlyMustHaves[0].id)}
            className="rounded-full border border-dashed border-brand-400 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:border-brand-500"
          >
            +{gridOnlyMustHaves.length} Must have: {gridOnlyMustHaves.map((m) => m.label).join(', ')}
          </button>
        )}

        {(hasActiveFilters(filters) || gridOnlyMustHaves.length > 0) && (
          <button
            onClick={() =>
              onClearAll
                ? onClearAll()
                : onChange({
                    ...filters,
                    types: [],
                    expertise: [],
                    careerLevels: [],
                    workArrangements: [],
                    locations: [],
                    languages: [],
                    availability: null,
                    hasVideoQnas: false,
                    hasAudioTestimonial: false,
                    previousEmployers: [],
                    searchTerm: '',
                  })
            }
            className="flex items-center gap-1 text-sm font-medium text-ink-faint hover:text-ink"
          >
            <X size={14} /> Clear All
          </button>
        )}
      </div>

      {availabilityOpen && (
        <AvailabilityModal
          open
          onClose={() => setAvailabilityOpen(false)}
          value={filters.availability}
          onApply={(v) => set('availability', v)}
        />
      )}
    </div>
  )
}
