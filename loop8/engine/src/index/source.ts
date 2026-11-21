// Adapters to FragmentSource (issue #20). The fragmenter stays production
// faithful by depending on FragmentSource; these map the two concrete shapes
// to it. fromProfile is the production path (the DB Profile the app loads).
// fromDemoSeed is the POC path (the local demo profiles under
// scripts/demo-seed/profiles), so Task 2a needs no client database access.

import { createHash } from 'node:crypto'
import type { PortfolioItem, Profile } from '../../../../src/types/db'
import type { FragmentMetadata, FragmentSource } from './types'

// ---- Production path: the canonical DB Profile ------------------------------

export function fromProfile(profile: Profile, portfolio: PortfolioItem[]): FragmentSource {
  const expertiseTags = profile.tiered_expertise.map((t) => t.name)
  const metadata: FragmentMetadata = {
    location: profile.location,
    languages: profile.spoken_languages.map((l) => l.name),
    expertiseTags,
    careerLevel: profile.career_level,
    availability: {
      partTime: profile.part_time_availability,
      fullTime: profile.full_time_availability,
    },
  }
  return {
    profileId: profile.id,
    tagline: profile.headline,
    bio: profile.detailed_bio,
    portfolio: portfolio.map((p) => ({
      id: p.id,
      projectName: p.project_name,
      role: p.role,
      description: p.description,
      results: p.results,
      organization: p.organization,
    })),
    workHistory: profile.work_history.map((w) => ({
      id: w.id ?? null,
      role: w.role,
      organization: w.organization,
      description: w.description,
    })),
    education: profile.education_history.map((e) => ({
      id: e.id ?? null,
      degreeOrCourse: e.degree_or_course,
      institution: e.institution,
    })),
    additionalExperience: profile.additional_experience.map((a) => ({
      id: null,
      role: a.role,
      organization: a.organization,
      description: a.description,
    })),
    credentials: profile.accreditations.map((c) => ({
      id: c.id ?? null,
      name: c.name,
      issuingOrganization: c.issuing_organization,
    })),
    expertiseTags,
    metadata,
  }
}

// ---- POC path: the local demo seed shape ------------------------------------

/** The subset of a demo profile (scripts/demo-seed/profiles/*.mjs) used here.
 *  Most profiles carry a UUID `id` and a `handle`; the ToR-05 individuals seed
 *  (t6-tor05-individuals.mjs) instead carries a `slug` and no id/handle, so both
 *  shapes are accepted and reconciled in demoKey/demoHandle. */
export interface DemoProfile {
  id?: string
  slug?: string
  handle?: string
  headline?: string | null
  bio?: string | null
  city?: string | null
  country?: string | null
  level?: string | null
  languages?: [string, string][]
  tiers?: { core?: string[]; strong?: string[]; working?: string[] }
  pt?: unknown
  ft?: unknown
  portfolio?: { id?: string; name: string; org?: string | null; role: string; desc: string; results?: string | null }[]
  history?: { id?: string; role: string; organization?: string | null; description?: string | null }[]
  education?: { id?: string; degree_or_course: string; institution: string }[]
  additional?: { role: string; organization?: string | null; description?: string | null }[]
  accreditations?: { id?: string; name: string; issuing_organization?: string | null }[]
}

function demoLocation(p: DemoProfile): string | null {
  const parts = [p.city, p.country].filter((x): x is string => !!x)
  return parts.length > 0 ? parts.join(', ') : null
}

/** The id the database holds for a seed profile that has no id of its own. The seed build
 *  (scripts/demo-seed/build-007.mjs, idOf) derives it from the handle `demo-<slug>` with a
 *  SHA-1. This is the same formula, so the index uses the id the app and the engine read. */
export function seedIdOf(handle: string): string {
  const h = createHash('sha1').update(`mavenscout-demo:${handle}`).digest('hex')
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`
}

/** The stable unique key for a demo profile: its UUID id, or for the id-less ToR-05
 *  individuals the id the database derived from their slug. Throws rather than emit an
 *  undefined profileId. */
export function demoKey(p: DemoProfile): string {
  if (p.id != null && p.id.trim() !== '') return p.id
  if (p.slug != null && p.slug.trim() !== '') return seedIdOf(`demo-${p.slug}`)
  throw new Error(`demo profile has neither id nor slug: ${p.headline ?? 'unknown'}`)
}

/** The display handle used in the retrieval check and expectations.json. The
 *  id-less individuals have no handle, and expectations reference them as
 *  "demo-<slug>", so that convention is applied here. */
export function demoHandle(p: DemoProfile): string {
  return p.handle ?? (p.slug != null && p.slug.trim() !== '' ? `demo-${p.slug}` : demoKey(p))
}

export function fromDemoSeed(p: DemoProfile): FragmentSource {
  const tiers = p.tiers ?? {}
  const expertiseTags = [...(tiers.core ?? []), ...(tiers.strong ?? []), ...(tiers.working ?? [])]
  const metadata: FragmentMetadata = {
    location: demoLocation(p),
    languages: (p.languages ?? []).map(([name]) => name),
    expertiseTags,
    careerLevel: p.level ?? null,
    availability: { partTime: p.pt ?? null, fullTime: p.ft ?? null },
  }
  return {
    profileId: demoKey(p),
    tagline: p.headline ?? null,
    bio: p.bio ?? null,
    portfolio: (p.portfolio ?? []).map((e) => ({
      id: e.id ?? null,
      projectName: e.name,
      role: e.role,
      description: e.desc,
      results: e.results ?? null,
      organization: e.org ?? null,
    })),
    workHistory: (p.history ?? []).map((e) => ({
      id: e.id ?? null,
      role: e.role,
      organization: e.organization ?? null,
      description: e.description ?? null,
    })),
    education: (p.education ?? []).map((e) => ({
      id: e.id ?? null,
      degreeOrCourse: e.degree_or_course,
      institution: e.institution,
    })),
    additionalExperience: (p.additional ?? []).map((e) => ({
      id: null,
      role: e.role,
      organization: e.organization ?? null,
      description: e.description ?? null,
    })),
    credentials: (p.accreditations ?? []).map((e) => ({
      id: e.id ?? null,
      name: e.name,
      issuingOrganization: e.issuing_organization ?? null,
    })),
    expertiseTags,
    metadata,
  }
}
