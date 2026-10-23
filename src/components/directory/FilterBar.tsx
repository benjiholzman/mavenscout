import { CalendarClock, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  firmsOnlySelected,
  hasActiveFilters,
  locationLabel,
  type FacetKey,
  type FilterState,
  type SearchMode,
} from '../../lib/filters'
import type { TaxonomyCategory, TaxonomyItem } from '../../types/db'
import { FIRMS_ENABLED } from '../../lib/config'
import { describeExpertiseSelection, type ExpertiseIndex } from '../../lib/expertise'
import { MIN_PROFICIENCY_LABELS } from '../../lib/languages'
import { MultiSelect, type OptionGroup } from '../ui/MultiSelect'
import { Segmented } from '../ui/Segmented'
import { Switch } from '../ui/Switch'
import { AvailabilityModal, availabilitySummary } from './AvailabilityModal'

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
}: {
  filters: FilterState
  onChange: (next: FilterState) => void
  locations: OptionGroup[]
  languages: string[]
  taxonomyCategories: TaxonomyCategory[]
  taxonomyItems: TaxonomyItem[]
  /** The unified expertise list (groups for browsing, kinds for matching). */
  expertise: ExpertiseIndex
  /** Faceted counts for one filter's option values (see lib/filters facetCounts). */
  countFor: (key: FacetKey, values: string[]) => Map<string, number>
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

  const groupValues = (groups: OptionGroup[]) => groups.flatMap((g) => [g.label, ...g.items])

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
        return countFor('locations', groupValues(locations))
      case 'language':
        return countFor('languages', languages)
      default:
        return undefined
    }
  }, [openKey, countFor, filters])

  return (
    <div className="space-y-3">
      {/* Search — two modes (PRD 7.1): switching modes re-runs the same term. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={filters.searchTerm}
            onChange={(e) => set('searchTerm', e.target.value)}
            placeholder={
              filters.searchMode === 'names' ? 'Search names & headlines…' : 'Search full profiles…'
            }
            className="w-full rounded-full border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex items-center gap-3 text-sm" role="radiogroup" aria-label="Search mode">
          {(
            [
              ['names', 'Names only'],
              ['full', 'Full profiles'],
            ] as [SearchMode, string][]
          ).map(([mode, label]) => (
            <label key={mode} className="flex cursor-pointer items-center gap-1.5 text-ink-soft">
              <input
                type="radio"
                name="search-mode"
                checked={filters.searchMode === mode}
                onChange={() => set('searchMode', mode)}
                className="accent-brand-500"
              />
              {label}
            </label>
          ))}
        </div>
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
          counts={openKey === 'arrangement' ? openCounts : undefined}
          open={openKey === 'arrangement'}
          onToggle={toggleFor('arrangement')}
        />
        <MultiSelect
          label="Location"
          groups={locations}
          selectableGroup
          formatValue={locationLabel}
          selected={filters.locations}
          onChange={(v) => set('locations', v)}
          counts={openKey === 'location' ? openCounts : undefined}
          open={openKey === 'location'}
          onToggle={toggleFor('location')}
        />
        <MultiSelect
          label="Language"
          options={languages}
          selected={filters.languages}
          onChange={(v) => set('languages', v)}
          header={
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-ink-soft">Spoken at</span>
              <Segmented
                label="Minimum language level"
                value={filters.languageLevel}
                options={(['working', 'fluent'] as const).map((v) => ({ value: v, label: MIN_PROFICIENCY_LABELS[v] }))}
                onChange={(v) => set('languageLevel', v)}
                disabled={filters.languages.length === 0}
                className="w-full"
              />
            </div>
          }
          note={filters.languages.length === 0 ? 'Pick a language to set the level. Fluent counts as Working.' : 'Fluent counts as Working.'}
          counts={openKey === 'language' ? openCounts : undefined}
          open={openKey === 'language'}
          onToggle={toggleFor('language')}
        />

        {/* Availability — compound query gets its own small modal (PRD 7.1). */}
        <button
          onClick={() => setAvailabilityOpen(true)}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
            filters.availability
              ? 'border-brand-500 bg-brand-50 text-brand-700'
              : 'border-line bg-white text-ink-soft hover:border-ink-faint'
          }`}
        >
          <CalendarClock size={14} />
          {filters.availability ? availabilitySummary(filters.availability) : 'Availability'}
        </button>

        {/* Featured Members' interview videos; a filter only, never scored. */}
        <Switch
          checked={filters.hasVideoQnas}
          onChange={(v) => set('hasVideoQnas', v)}
          label="Has video Q&As"
        />
        {/* Off by default; a filter only, never scored (testimonials never
            feed ranking). */}
        <Switch
          checked={filters.hasAudioTestimonial}
          onChange={(v) => set('hasAudioTestimonial', v)}
          label="Has audio testimonial"
        />

        {gridOnlyMustHaves.length > 0 && (
          <button
            onClick={() => onOpenRequirement?.(gridOnlyMustHaves[0].id)}
            className="rounded-full border border-dashed border-brand-400 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:border-brand-500"
          >
            +{gridOnlyMustHaves.length} required: {gridOnlyMustHaves.map((m) => m.label).join(', ')}
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
                    searchTerm: '',
                  })
            }
            className="flex items-center gap-1 text-sm font-medium text-ink-faint hover:text-ink"
          >
            <X size={14} /> Clear All
          </button>
        )}
      </div>

      <AvailabilityModal
        open={availabilityOpen}
        onClose={() => setAvailabilityOpen(false)}
        value={filters.availability}
        onApply={(v) => set('availability', v)}
      />
    </div>
  )
}
