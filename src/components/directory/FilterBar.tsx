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
import { MultiSelect, type OptionGroup } from '../ui/MultiSelect'
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

function taxonomyGroups(
  categories: TaxonomyCategory[],
  items: TaxonomyItem[],
  type: 'domain_expertise' | 'technical_skills',
): OptionGroup[] {
  return categories
    .filter((c) => c.type === type)
    .map((c) => ({
      label: c.name,
      items: items.filter((i) => i.category_id === c.id).map((i) => i.name),
    }))
}

export function FilterBar({
  filters,
  onChange,
  locations,
  languages,
  taxonomyCategories,
  taxonomyItems,
  countFor,
}: {
  filters: FilterState
  onChange: (next: FilterState) => void
  locations: OptionGroup[]
  languages: string[]
  taxonomyCategories: TaxonomyCategory[]
  taxonomyItems: TaxonomyItem[]
  /** Faceted counts for one filter's option values (see lib/filters facetCounts). */
  countFor: (key: FacetKey, values: string[]) => Map<string, number>
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

  const expertiseGroups = taxonomyGroups(taxonomyCategories, taxonomyItems, 'domain_expertise')
  const skillsGroups = taxonomyGroups(taxonomyCategories, taxonomyItems, 'technical_skills')
  const groupValues = (groups: OptionGroup[]) => groups.flatMap((g) => [g.label, ...g.items])

  // Counts are computed only for the dropdown that's open.
  const openCounts = useMemo(() => {
    switch (openKey) {
      case 'type':
        return countFor('types', TYPE_OPTIONS)
      case 'expertise':
        return countFor('expertise', groupValues(expertiseGroups))
      case 'skills':
        return countFor('skills', groupValues(skillsGroups))
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
        <MultiSelect
          label="Type"
          options={TYPE_OPTIONS}
          selected={filters.types}
          onChange={(v) => set('types', v)}
          counts={openKey === 'type' ? openCounts : undefined}
          open={openKey === 'type'}
          onToggle={toggleFor('type')}
        />
        <MultiSelect
          label="Domain Expertise"
          groups={expertiseGroups}
          selectableGroup
          selected={filters.expertise}
          onChange={(v) => set('expertise', v)}
          counts={openKey === 'expertise' ? openCounts : undefined}
          open={openKey === 'expertise'}
          onToggle={toggleFor('expertise')}
        />
        <MultiSelect
          label="Skills"
          groups={skillsGroups}
          selectableGroup
          selected={filters.skills}
          onChange={(v) => set('skills', v)}
          counts={openKey === 'skills' ? openCounts : undefined}
          open={openKey === 'skills'}
          onToggle={toggleFor('skills')}
        />
        <MultiSelect
          label="Career Level"
          options={CAREER_LEVEL_OPTIONS}
          selected={filters.careerLevels.map((v) => CAREER_LEVEL_LABELS_BY_VALUE[v] ?? v)}
          onChange={(labels) => set('careerLevels', labels.map((l) => CAREER_LEVEL_VALUES[l] ?? l))}
          disabled={firmsOnly}
          disabledNote="Career level applies to individuals — it doesn't apply when filtering firms only"
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

        <Switch
          checked={filters.verifiedOnly}
          onChange={(v) => set('verifiedOnly', v)}
          label="Verified only"
        />

        {hasActiveFilters(filters) && (
          <button
            onClick={() =>
              onChange({
                ...filters,
                types: [],
                expertise: [],
                skills: [],
                careerLevels: [],
                workArrangements: [],
                locations: [],
                languages: [],
                availability: null,
                verifiedOnly: false,
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
