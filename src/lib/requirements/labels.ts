import { locationLabel } from '../filters'
import type { Requirement, RequirementKind } from '../matching/types'

// Display labels for requirement rows: grid row titles, the live count's
// "loosen" suggestions, and the filter-bar chip.

export const KIND_LABELS: Record<RequirementKind, string> = {
  expertise: 'Domain expertise',
  skill: 'Technical skill',
  org_history: 'Organizational history',
  location: 'Location',
  language: 'Language',
  type: 'Type',
  availability: 'Availability',
  career_level: 'Career level',
  verified: 'Verified',
  work_arrangement: 'Work arrangement',
}

export const CAREER_LEVEL_SHORT: Record<string, string> = {
  early_career: 'Early career',
  mid_career: 'Mid-career',
  senior: 'Senior',
}

export const ORG_SCOPE_LABELS = {
  current: 'Currently at',
  ever: 'Ever at',
  ever_or_peer: 'Ever at, or at a peer org',
} as const

/** "Location: Lagos, Kenya" — a row's kind plus its chosen value. */
export function describeRequirement(r: Requirement): string {
  const kind = KIND_LABELS[r.kind]
  switch (r.kind) {
    case 'expertise':
    case 'skill':
      return r.value.level === 'category' ? `${r.value.name} (broad)` : r.value.name
    case 'org_history':
      return `${ORG_SCOPE_LABELS[r.value.scope]} ${r.value.org || '…'}`
    case 'location':
      return `${kind}: ${r.value.values.map(locationLabel).join(', ')}`
    case 'career_level':
      return `${kind}: ${r.value.values.map((v) => CAREER_LEVEL_SHORT[v] ?? v).join(', ')}`
    case 'language':
    case 'type':
    case 'work_arrangement':
      return `${kind}: ${r.value.values.join(', ')}`
    case 'availability':
      return kind
    case 'verified':
      return 'Verified only'
  }
}
