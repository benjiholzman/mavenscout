import { locationLabel } from '../filters'
import { orgNames } from './match'
import type { Requirement, RequirementKind } from '../matching/types'

// Display labels for requirement rows: grid row titles, the live count's
// "loosen" suggestions, and the filter-bar chip.

export const KIND_LABELS: Record<RequirementKind, string> = {
  expertise: 'Expertise',
  org_history: 'Organizational history',
  location: 'Location',
  language: 'Language',
  type: 'Type',
  availability: 'Availability',
  career_level: 'Career level',
  video_qna: 'Video Q&As only',
  audio_testimonial: 'Audio testimonials only',
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
      return r.value.name
    case 'org_history':
      return `${ORG_SCOPE_LABELS[r.value.scope]} ${orgNames(r.value) || '…'}`
    case 'location':
      return `${kind}: ${r.value.values.map(locationLabel).join(', ')}`
    case 'career_level':
      return `${kind}: ${r.value.values.map((v) => CAREER_LEVEL_SHORT[v] ?? v).join(', ')}`
    case 'language':
      return `${kind}: ${r.value.values.join(', ')}${r.value.min === 'fluent' ? ' (fluent only)' : ''}`
    case 'type':
    case 'work_arrangement':
      return `${kind}: ${r.value.values.join(', ')}`
    case 'availability':
      return kind
    case 'video_qna':
    case 'audio_testimonial':
      return kind
  }
}
