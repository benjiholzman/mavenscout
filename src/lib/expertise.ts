import type { ExtractedRequirements, ExtractedTag, Level, Requirement } from './matching/types'
import type { ExpertiseKind, ExpertiseTag, ExpertiseTier, Profile, TaxonomyCategory, TaxonomyItem } from '../types/db'

// ============================================================================
// The unified expertise list (docs/MavenScout-profiles-membership.md §6).
//
// One list of items (taxonomy_items under taxonomy_categories of type
// 'expertise'). Each item has:
// - a browsing GROUP (its category): picker subheadings only;
// - a hidden KIND (sector / theme / method): the matching rule. Several
//   Required items (or filter selections) are OR within a kind and AND across
//   kinds: Nutrition + WASH = either; Nutrition + Impact Evaluation = both;
// - search ALIASES ('M&E', 'PFM') and LEGACY NAMES (old Domain Expertise /
//   Technical Skills items folded in, used to read old saved rows).
// Experts tag items at three tiers: Core, Strong, Working knowledge.
// Required rows and filters count Core and Strong, plus Working knowledge when
// the manager includes it.
// ============================================================================

export const TIERS: ExpertiseTier[] = ['core', 'strong', 'working']

export const TIER_LABELS: Record<ExpertiseTier, string> = {
  core: 'Core expertise',
  strong: 'Strong',
  working: 'Working knowledge',
}

export const KIND_ORDER: ExpertiseKind[] = ['sector', 'theme', 'method']

export const EXPERTISE_KIND_LABELS: Record<ExpertiseKind, string> = {
  sector: 'Sector',
  theme: 'Cross-cutting theme',
  method: 'Method & skill',
}

export interface ExpertiseItem {
  name: string
  kind: ExpertiseKind
  group: string
  aliases: string[]
  legacyNames: string[]
}

export interface ExpertiseIndex {
  /** Every item, in group then list order. */
  items: ExpertiseItem[]
  byName: Map<string, ExpertiseItem>
  /** Picker groups (label = browsing group), shaped like MultiSelect's OptionGroup. */
  groups: { label: string; items: string[] }[]
  /** Old item name → the item that absorbed it. */
  legacy: Map<string, string>
}

export const EMPTY_EXPERTISE_INDEX: ExpertiseIndex = { items: [], byName: new Map(), groups: [], legacy: new Map() }

export function buildExpertiseIndex(categories: TaxonomyCategory[], items: TaxonomyItem[]): ExpertiseIndex {
  const groups = categories.filter((c) => c.type === 'expertise').sort((a, b) => a.sort_order - b.sort_order)
  const list: ExpertiseItem[] = []
  for (const g of groups)
    for (const i of items.filter((i) => i.category_id === g.id).sort((a, b) => a.sort_order - b.sort_order))
      list.push({
        name: i.name,
        kind: i.kind ?? 'sector',
        group: g.name,
        aliases: i.aliases ?? [],
        legacyNames: i.legacy_names ?? [],
      })
  const legacy = new Map<string, string>()
  for (const i of list) for (const old of i.legacyNames) legacy.set(old, i.name)
  return {
    items: list,
    byName: new Map(list.map((i) => [i.name, i])),
    groups: groups.map((g) => ({ label: g.name, items: list.filter((i) => i.group === g.name).map((i) => i.name) })),
    legacy,
  }
}

/** A profile's tags (absent only on a database that hasn't run 011). */
export function expertiseTags(p: Pick<Profile, 'tiered_expertise'>): ExpertiseTag[] {
  return p.tiered_expertise ?? []
}

/** Tiers that Required rows and filters count. */
export function countedTiers(includeWorking: boolean): ExpertiseTier[] {
  return includeWorking ? TIERS : ['core', 'strong']
}

/** Selected item names grouped by kind, in kind order. Names not on the list
 *  (e.g. a row saved before an item was renamed) form their own group. */
export function selectionByKind(
  selected: string[],
  index: ExpertiseIndex,
): { kind: ExpertiseKind | null; names: string[] }[] {
  const groups: { kind: ExpertiseKind | null; names: string[] }[] = []
  for (const name of selected) {
    const kind = index.byName.get(name)?.kind ?? null
    const g = groups.find((x) => x.kind === kind)
    if (g) g.names.push(name)
    else groups.push({ kind, names: [name] })
  }
  return groups.sort(
    (a, b) => (a.kind ? KIND_ORDER.indexOf(a.kind) : 9) - (b.kind ? KIND_ORDER.indexOf(b.kind) : 9),
  )
}

/** Required rows and filters (spec §6): within a kind any selected item will
 *  do; every kind with a selection must be met. Counts Core and Strong tags,
 *  plus Working knowledge when `includeWorking`. */
export function matchesExpertiseSelection(
  tags: ExpertiseTag[],
  selected: string[],
  index: ExpertiseIndex,
  includeWorking: boolean,
): boolean {
  if (selected.length === 0) return true
  const tiers = countedTiers(includeWorking)
  const held = new Set(tags.filter((t) => tiers.includes(t.tier)).map((t) => t.name))
  return selectionByKind(selected, index).every((g) => g.names.some((n) => held.has(n)))
}

/** "(Nutrition or WASH) and Impact Evaluation" — the rule a selection applies. */
export function describeExpertiseSelection(selected: string[], index: ExpertiseIndex): string {
  const parts = selectionByKind(selected, index).map((g) =>
    g.names.length === 1 ? g.names[0]! : `(${g.names.slice(0, -1).join(', ')} or ${g.names[g.names.length - 1]})`,
  )
  return parts.join(' and ')
}

/** Picker search over names, aliases and old names: names starting with the
 *  query first, then any other match, each in list order. */
export function searchExpertise(index: ExpertiseIndex, query: string, exclude: string[] = []): ExpertiseItem[] {
  const q = query.trim().toLowerCase()
  const pool = index.items.filter((i) => !exclude.includes(i.name))
  if (!q) return pool
  const terms = (i: ExpertiseItem) => [i.name, ...i.aliases, ...i.legacyNames].map((t) => t.toLowerCase())
  const starts = pool.filter((i) => terms(i).some((t) => t.startsWith(q) || t.includes(` ${q}`)))
  const rest = pool.filter((i) => !starts.includes(i) && terms(i).some((t) => t.includes(q)))
  return [...starts, ...rest]
}

// ---- rows and extractions saved before the unified list ---------------------
// Rankings saved before 011 hold 'skill' rows, old item names and
// category-level rows; their extraction holds `skills` and `level`. They're
// read through these (nothing is rewritten in the database): old names map to
// the item that absorbed them, category-level rows are dropped (the list has
// no category tags), and two rows landing on one item merge at the higher
// level. With no list loaded yet, rows pass through unchanged.

const LEVEL_RANK: Record<Level, number> = { slight: 0, strong: 1, must: 2 }

type LegacyTagRow = {
  id: string
  kind: string
  level: Level
  source: Requirement['source']
  value: { name?: string; level?: 'category' | 'item'; includeWorking?: boolean }
}

export function upgradeLegacyRequirements(
  rows: readonly unknown[],
  index: ExpertiseIndex,
): { requirements: Requirement[]; dropped: string[] } {
  if (index.items.length === 0) return { requirements: rows as Requirement[], dropped: [] }
  const out: Requirement[] = []
  const dropped: string[] = []
  for (const raw of rows) {
    const r = raw as LegacyTagRow
    if (r.kind !== 'expertise' && r.kind !== 'skill') {
      out.push(raw as Requirement)
      continue
    }
    const old = r.value?.name ?? ''
    const name = r.value?.level === 'category' ? null : index.byName.has(old) ? old : index.legacy.get(old) ?? null
    if (!name) {
      if (old) dropped.push(old)
      continue
    }
    const value = r.value?.includeWorking ? { name, includeWorking: true } : { name }
    const same = out.find((x) => x.kind === 'expertise' && x.value.name === name)
    if (!same) out.push({ id: r.id, kind: 'expertise', level: r.level, source: r.source, value })
    else if (LEVEL_RANK[r.level] > LEVEL_RANK[same.level]) same.level = r.level
  }
  return { requirements: out, dropped }
}

export function upgradeLegacyExtracted(
  ex: ExtractedRequirements | null | undefined,
  index: ExpertiseIndex,
): ExtractedRequirements | null {
  if (!ex) return null
  const raw = ex as ExtractedRequirements & { skills?: (ExtractedTag & { level?: string })[] }
  const tags = [...(raw.expertise ?? []), ...(raw.skills ?? [])] as (ExtractedTag & { level?: string })[]
  if (index.items.length === 0 || (!raw.skills && tags.every((t) => !t.level))) return ex
  const merged = new Map<string, ExtractedTag>()
  for (const t of tags) {
    if (t.level === 'category') continue
    const name = index.byName.has(t.name) ? t.name : index.legacy.get(t.name)
    if (!name) continue
    const prev = merged.get(name)
    merged.set(name, {
      name,
      mentions: (prev?.mentions ?? 0) + t.mentions,
      suggested: prev?.suggested === 'strong' || t.suggested === 'strong' ? 'strong' : 'slight',
    })
  }
  return {
    expertise: [...merged.values()].sort((a, b) => b.mentions - a.mentions),
    locations: raw.locations ?? [],
    languages: raw.languages ?? [],
    hiring_organization: raw.hiring_organization ?? null,
  }
}
