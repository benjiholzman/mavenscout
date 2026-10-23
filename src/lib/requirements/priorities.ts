import { FIRMS_ENABLED } from '../config'
import { availabilitySummary, isDefaultAvailability, locationLabel } from '../filters'
import type { Level, Requirement, RequirementKind } from '../matching/types'
import { CAREER_LEVEL_SHORT, KIND_LABELS, LEVEL_LABELS, ORG_SCOPE_LABELS } from './labels'
import { orgNames } from './match'
import { isMust } from './model'

// The ranking drawer's "Your priorities" list: every priority is always
// listed, at No preference until it has a row. Each shows as one summary line
// ("Location · Kenya, Ethiopia · Important") that opens its editor. "Video
// Q&As only" and "Audio testimonials only" aren't priorities: they're filter
// switches that never earn points.

export const PRIORITY_KEYS = (
  [
    'expertise',
    'location',
    'language',
    'availability',
    'org_history',
    'career_level',
    'work_arrangement',
    'type',
  ] as const
).filter((k) => FIRMS_ENABLED || k !== 'type')

export type PriorityKey = (typeof PRIORITY_KEYS)[number]

export const isPriorityKey = (kind: RequirementKind): kind is PriorityKey =>
  (PRIORITY_KEYS as readonly string[]).includes(kind)

export interface PrioritySummary {
  /** No rows: "No preference". */
  none: boolean
  /** The chosen value(s); with two rows or several expertise items, each
   *  carries its own level ("Kenya (Must have), Ethiopia (Important)"). */
  value: string
  /** The one level, when there's one row. */
  level: Level | null
}

const NOTHING = 'Nothing chosen yet'

/** The chosen value of one row, as a short phrase. */
export function rowValueText(r: Requirement): string {
  switch (r.kind) {
    case 'expertise':
      return r.value.name
    case 'org_history': {
      const names = orgNames(r.value)
      return names ? `${ORG_SCOPE_LABELS[r.value.scope]} ${names}` : 'No organization yet'
    }
    case 'availability':
      return isDefaultAvailability(r.value) ? NOTHING : availabilitySummary(r.value)
    case 'location':
      return r.value.values.map(locationLabel).join(', ') || NOTHING
    case 'language':
      return r.value.values.length
        ? `${r.value.values.join(', ')}${r.value.min === 'fluent' ? ' (Fluent)' : ''}`
        : NOTHING
    case 'career_level':
      return r.value.values.map((v) => CAREER_LEVEL_SHORT[v] ?? v).join(', ') || NOTHING
    case 'type':
    case 'work_arrangement':
      return r.value.values.join(', ') || NOTHING
    case 'video_qna':
    case 'audio_testimonial':
      return KIND_LABELS[r.kind]
  }
}

const withLevel = (r: Requirement) => `${rowValueText(r)} (${LEVEL_LABELS[r.level]})`

export function prioritySummary(key: PriorityKey, reqs: Requirement[]): PrioritySummary {
  const rows = reqs.filter((r) => r.kind === key)
  if (rows.length === 0) return { none: true, value: '', level: null }
  if (key === 'expertise') {
    // Must haves first, then Important, then Nice to have.
    const order: Record<Level, number> = { must: 0, strong: 1, slight: 2 }
    const sorted = [...rows].sort((a, b) => order[a.level] - order[b.level])
    const shown = sorted.slice(0, 2).map(withLevel).join(', ')
    return { none: false, value: sorted.length > 2 ? `${shown} +${sorted.length - 2}` : shown, level: null }
  }
  if (rows.length === 1) return { none: false, value: rowValueText(rows[0]), level: rows[0].level }
  // A Must have row and a preference row.
  const sorted = [...rows].sort((a, b) => Number(isMust(b)) - Number(isMust(a)))
  return { none: false, value: sorted.map(withLevel).join(', '), level: null }
}
