import { availabilitySummary, isDefaultAvailability, locationLabel } from '../filters'
import { placePath } from '../locations'
import type { Level, OrgScope, Requirement, RequirementKind, RequirementOf } from '../matching/types'
import { CAREER_LEVEL_SHORT, LEVEL_LABELS } from './labels'
import { countsPeers, orgTargets } from './match'
import { isMust, makeRow, normalizeRequirements, rowHasValue, rowItems, setRowLevel } from './model'

// The priorities modal's areas (tabs) and the edits its pickers make.
// Everything here reads and writes the same Requirement rows the filter bar
// and the scorer use, so a Must have set in the modal is the filter bar's
// filter, and the reverse. The modal edits a draft copy; nothing reaches the
// directory until "See my matches".

export type TabKey =
  | 'expertise'
  | 'career_level'
  | 'language'
  | 'org_history'
  | 'location'
  | 'availability'
  | 'work_arrangement'
  | 'media'

export interface TabDef {
  key: TabKey
  label: string
  /** The tab's helper line. */
  helper: string
  /** The row kinds it edits. */
  kinds: RequirementKind[]
  /** "Cleared {noun}" in the undo toast. */
  noun: string
}

export const TABS: TabDef[] = [
  {
    key: 'expertise',
    label: 'Expertise',
    helper: 'Pick up to 5 areas, then set how much each one matters.',
    kinds: ['expertise'],
    noun: 'expertise',
  },
  {
    key: 'career_level',
    label: 'Career level',
    helper: 'Choose one level, then how much it matters.',
    kinds: ['career_level'],
    noun: 'career level',
  },
  {
    key: 'language',
    label: 'Languages',
    helper: 'Up to 3, each with a minimum level and its own weight.',
    kinds: ['language'],
    noun: 'languages',
  },
  {
    key: 'org_history',
    label: 'Employers',
    helper: 'Up to 3 organizations — currently there, worked there before, or either.',
    kinds: ['org_history'],
    noun: 'employers',
  },
  {
    key: 'location',
    label: 'Location',
    helper: 'One place — a continent, region, country or city.',
    kinds: ['location'],
    noun: 'location',
  },
  {
    key: 'availability',
    label: 'Availability',
    helper: 'When you need them, and for which kind of engagement.',
    kinds: ['availability'],
    noun: 'availability',
  },
  {
    key: 'work_arrangement',
    label: 'Work arrangement',
    helper: 'Choose one, then how much it matters.',
    kinds: ['work_arrangement'],
    noun: 'work arrangement',
  },
  {
    key: 'media',
    label: 'Profile media',
    helper: 'Tick what you want on their profile, then set how much each one matters.',
    kinds: ['video_qna', 'audio_testimonial'],
    noun: 'profile media',
  },
]

export const TAB_BY_KEY = new Map(TABS.map((t) => [t.key, t]))

/** The tab that edits a row kind (Type, hidden while firms are, has none). */
export function tabOf(kind: RequirementKind): TabKey | null {
  return TABS.find((t) => t.kinds.includes(kind))?.key ?? null
}

/** New picks start at Important; nothing defaults to Must have. */
export const DEFAULT_LEVEL: Level = 'strong'

// ---- reading -------------------------------------------------------------------

/** Rows a tab holds that can count (a value chosen). */
export function tabRows(reqs: Requirement[], tab: TabKey): Requirement[] {
  const kinds = TAB_BY_KEY.get(tab)!.kinds
  return reqs.filter((r) => kinds.includes(r.kind) && rowHasValue(r))
}

/** Every row the modal shows as a priority, in tab order. */
export function priorityRows(reqs: Requirement[]): Requirement[] {
  return TABS.flatMap((t) => tabRows(reqs, t.key))
}

export const AREA_LABELS: Record<RequirementKind, string> = {
  expertise: 'Expertise',
  career_level: 'Career level',
  language: 'Language',
  org_history: 'Employer',
  location: 'Location',
  availability: 'Availability',
  work_arrangement: 'Work arrangement',
  video_qna: 'Profile media',
  audio_testimonial: 'Profile media',
  type: 'Type',
}

export const CAREER_LEVEL_RANGES: Record<string, string> = {
  early_career: '0–5 yrs',
  mid_career: '5–15 yrs',
  senior: '15+ yrs',
}

export const ORG_RELATIONS: { value: Exclude<OrgScope, 'ever_or_peer'>; label: string }[] = [
  { value: 'current', label: 'Now' },
  { value: 'past', label: 'Before' },
  { value: 'ever', label: 'Either' },
]

const RELATION_TEXT: Record<OrgScope, string> = {
  current: 'Now',
  past: 'Before',
  ever: 'Now or before',
  ever_or_peer: 'Now or before',
}

/** The relation an org row shows in the modal (older peer rows read as Either). */
export function relationOf(r: RequirementOf<'org_history'>): Exclude<OrgScope, 'ever_or_peer'> {
  return r.value.scope === 'ever_or_peer' ? 'ever' : r.value.scope
}

/** A priority's value as the panel and Summary show it: the label, plus
 *  " · detail" where it applies ("French · Fluent / native", "Nairobi ·
 *  Kenya"). `peerLabel` names an org row's peer group ("other UN agencies"). */
export function entryText(r: Requirement, peerLabel?: (r: RequirementOf<'org_history'>) => string | null): string {
  switch (r.kind) {
    case 'expertise':
      return r.value.name
    case 'career_level':
      return r.value.values.map((v) => CAREER_LEVEL_SHORT[v] ?? v).join(', ')
    case 'language':
      return `${r.value.values.join(', ')} · ${r.value.min === 'fluent' ? 'Fluent / native' : 'Working or above'}`
    case 'org_history': {
      const peers = countsPeers(r.value) ? (peerLabel?.(r) ?? 'peers') : null
      return `${orgTargets(r.value)
        .map((o) => o.org)
        .join(', ')} · ${RELATION_TEXT[r.value.scope]}${peers ? `, + ${peers}` : ''}`
    }
    case 'location': {
      const names = r.value.values.map(locationLabel).join(', ')
      if (r.value.values.length !== 1) return names
      const parents = placePath(r.value.values[0]).parents
      return parents.length ? `${names} · ${parents.slice(0, 2).join(', ')}` : names
    }
    case 'availability':
      return availabilitySummary(r.value)
    case 'work_arrangement':
    case 'type':
      return r.value.values.join(', ')
    case 'video_qna':
      return 'Video Q&As'
    case 'audio_testimonial':
      return 'Audio testimonial'
  }
}

/** The name an undo toast uses for a row ("Removed French"). */
export function entryName(r: Requirement): string {
  if (r.kind === 'expertise' || r.kind === 'language' || r.kind === 'org_history') return rowItems(r).join(', ')
  if (r.kind === 'availability') return 'availability'
  return entryText(r).split(' · ')[0]
}

export function levelLabel(level: Level): string {
  return LEVEL_LABELS[level]
}

// ---- writing --------------------------------------------------------------------

export function setLevel(reqs: Requirement[], id: string, level: Level): Requirement[] {
  return normalizeRequirements(setRowLevel(reqs, id, level))
}

export function removeRow(reqs: Requirement[], id: string): Requirement[] {
  return reqs.filter((r) => r.id !== id)
}

export function clearTab(reqs: Requirement[], tab: TabKey): Requirement[] {
  const kinds = TAB_BY_KEY.get(tab)!.kinds
  return reqs.filter((r) => !kinds.includes(r.kind))
}

/** The row of an item kind holding an item ("French"), if any. */
export function rowWithItem(reqs: Requirement[], kind: 'expertise' | 'language' | 'org_history', item: string) {
  return reqs.find((r) => r.kind === kind && rowItems(r).includes(item))
}

/** Takes one item out of the rows of its kind: its own row goes; a row saved
 *  with several items (before each had a row) keeps the others. */
export function withoutItem(reqs: Requirement[], kind: 'expertise' | 'language' | 'org_history', item: string): Requirement[] {
  return reqs.flatMap((r): Requirement[] => {
    if (r.kind !== kind || !rowItems(r).includes(item)) return [r]
    if (r.kind === 'language') {
      const values = r.value.values.filter((v) => v !== item)
      return values.length ? [{ ...r, value: { ...r.value, values } }] : []
    }
    if (r.kind === 'org_history') {
      const refs = orgTargets(r.value).filter((o) => o.org !== item)
      if (refs.length === 0) return []
      const { also: _also, ...rest } = r.value
      return [
        {
          ...r,
          value: { ...rest, org: refs[0].org, org_id: refs[0].org_id, ...(refs.length > 1 ? { also: refs.slice(1) } : {}) },
        },
      ]
    }
    return []
  })
}

export function addExpertise(reqs: Requirement[], name: string): Requirement[] {
  return normalizeRequirements([...reqs, makeRow('expertise', { name }, { level: DEFAULT_LEVEL })])
}

export function addLanguage(reqs: Requirement[], name: string): Requirement[] {
  return normalizeRequirements([...reqs, makeRow('language', { values: [name], min: 'working' }, { level: DEFAULT_LEVEL })])
}

export function addEmployer(reqs: Requirement[], org: string, orgId: string | null): Requirement[] {
  return normalizeRequirements([
    ...reqs,
    makeRow('org_history', { org, org_id: orgId, scope: 'ever', peers: [] }, { level: DEFAULT_LEVEL }),
  ])
}

/** A single-choice tab (career level, work arrangement, location): the one
 *  value, at the level its row had (Important for a new pick). Null clears
 *  it — "No preference". Replaces any rows the filter bar left with several
 *  values. */
export function selectOne(
  reqs: Requirement[],
  kind: 'career_level' | 'work_arrangement' | 'location',
  value: string | null,
): Requirement[] {
  const existing = reqs.filter((r) => r.kind === kind)
  const rest = reqs.filter((r) => r.kind !== kind)
  if (value === null) return rest
  const level = existing.length === 1 ? existing[0].level : (existing.find(isMust)?.level ?? DEFAULT_LEVEL)
  return normalizeRequirements([...rest, makeRow(kind, { values: [value] }, { level })])
}

/** The value a single-choice tab shows as chosen (the first, if the filter
 *  bar left several). */
export function selectedValues(reqs: Requirement[], kind: 'career_level' | 'work_arrangement' | 'location'): string[] {
  return reqs.flatMap((r) => (r.kind === kind ? r.value.values : []))
}

export function updateRow(reqs: Requirement[], row: Requirement): Requirement[] {
  return normalizeRequirements(reqs.map((r) => (r.id === row.id ? row : r)))
}

/** Profile media: ticks a row on (Important) or off. */
export function toggleMedia(reqs: Requirement[], kind: 'video_qna' | 'audio_testimonial', on: boolean): Requirement[] {
  if (!on) return reqs.filter((r) => r.kind !== kind)
  if (reqs.some((r) => r.kind === kind)) return reqs
  return normalizeRequirements([...reqs, makeRow(kind, {}, { level: DEFAULT_LEVEL })])
}

/** Availability rows that haven't picked a time yet don't count. */
export function availabilityRow(reqs: Requirement[]): RequirementOf<'availability'> | undefined {
  return reqs.find((r): r is RequirementOf<'availability'> => r.kind === 'availability')
}

export function hasAvailabilityTime(r: RequirementOf<'availability'> | undefined): boolean {
  return !!r && !isDefaultAvailability(r.value) && r.value.when !== 'any'
}
