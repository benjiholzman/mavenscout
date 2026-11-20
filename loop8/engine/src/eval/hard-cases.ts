// Hard ranking cases: loader for the in-memory fixtures in samples/hard-cases
// (cases 1 to 5 of loop8/docs/planning/test-cases-draft.md). Each fixture is a
// fictional consultant in the demo seed shape (scripts/demo-seed/profiles).
// The loader returns every fixture in the two shapes the rankers read:
//
// 1. the app scoring input, CandidateInput (Profile plus portfolio), built by
//    toCandidateInput below, which mirrors the demo seed build
//    (scripts/demo-seed/build.ts lines 113 to 192). That build cannot be
//    imported: it reads the migrations and writes SQL at module load.
// 2. the engine input, FragmentSource, built by fromDemoSeed, the same adapter
//    the index builder uses for the demo profiles.
//
// The fixtures stay in loop8/engine and never enter the customer demo seed.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CandidateInput } from '../../../../src/lib/matching/fit'
import type {
  Accreditation,
  AdditionalExperienceEntry,
  AvailabilityTrack,
  CareerLevel,
  EducationEntry,
  PortfolioItem,
  Profile,
  WorkHistoryEntry,
} from '../../../../src/types/db'
import { fromDemoSeed } from '../index/source'
import type { FragmentSource } from '../index/types'

/** One case of cases.json. */
export interface HardCase {
  id: string
  tor: string
  handle: string
  expect: 'top10' | 'not_top10'
  why: string
  checkType: 'vocabulary_mismatch' | 'decoy'
  /** Expertise items the profile shows without naming them; for a decoy, the
   *  items whose keywords it stuffs. Never tagged on the fixture. */
  targetItems: string[]
  /** Names and aliases of the target items plus the draft's words to avoid. */
  forbiddenTerms: string[]
  /** Keywords a decoy must contain (empty for a vocabulary mismatch). */
  requiredTerms: string[]
}

/** A fixture profile, in the object form of the demo seed profiles. */
export interface HardProfile {
  note: string
  handle: string
  id: string
  name: string
  gender: string
  level: CareerLevel
  headline: string
  city: string
  country: string
  languages: [string, 'fluent' | 'working'][]
  work: string[]
  pt: AvailabilityTrack
  ft: AvailabilityTrack
  updatedAt: string
  featured: boolean
  eligibility: string | null
  bio: string
  tiers: { core?: string[]; strong?: string[]; working?: string[] }
  accreditations: Accreditation[]
  history: WorkHistoryEntry[]
  education: EducationEntry[]
  additional: AdditionalExperienceEntry[]
  portfolio: {
    id?: string
    name: string
    org: string
    years: [number, number | null]
    role: string
    desc: string
    results?: string | null
    images: { url: string; caption?: string | null }[]
    links: { label: string; url: string }[]
  }[]
}

export interface HardFixture {
  hardCase: HardCase
  demo: HardProfile
  candidate: CandidateInput
  source: FragmentSource
}

/** Deterministic uuid (v5 shaped), as uuid() in scripts/demo-seed/build.ts
 *  lines 76 to 80. Gives portfolio items without an id the id the seed would. */
export function demoUuid(key: string): string {
  const h = createHash('sha1').update(`mavenscout-demo:${key}`).digest('hex')
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`
}

/** The Profile row and portfolio items the demo seed build would make, field
 *  by field as scripts/demo-seed/build.ts lines 113 to 192. Differences: the
 *  photo is null (the build assigns stock portraits later), organization_id is
 *  null (the build resolves it from the migrations), and the Profile fields the
 *  build leaves to column defaults are filled with their empty values. */
export function toCandidateInput(p: HardProfile): CandidateInput {
  const handle = p.handle
  const id = p.id
  const portfolio: PortfolioItem[] = p.portfolio.map((it, i) => ({
    id: it.id ?? demoUuid(`${handle}:portfolio:${it.name}`),
    profile_id: id,
    project_name: it.name,
    organization: it.org,
    organization_id: null,
    start_year: it.years[0],
    end_year: it.years[1],
    role: it.role,
    description: it.desc,
    results: it.results ?? null,
    images: it.images.slice(0, 3),
    links: it.links,
    video_url: null,
    sort_order: i + 1,
  }))
  const profile: Profile = {
    id,
    user_id: null,
    consultant_type: 'Individual',
    handle,
    name: p.name,
    headline: p.headline,
    location: `${p.city}, ${p.country}`,
    career_level: p.level,
    year_founded: null,
    contracting_work_eligibility: p.eligibility ?? null,
    work_types: p.work,
    part_time_availability: p.pt,
    full_time_availability: p.ft,
    availability_updated_at: p.updatedAt,
    photo_url: null,
    cover_image_url: `https://picsum.photos/seed/${handle}/800/200`,
    resume_path: null,
    resume_url: null,
    detailed_bio: p.bio.trim(),
    tiered_expertise: (['core', 'strong', 'working'] as const).flatMap((tier) =>
      (p.tiers[tier] ?? []).map((name) => ({ name, tier })),
    ),
    spoken_languages: p.languages.map(([name, proficiency]) => ({ name, proficiency })),
    accreditations: p.accreditations,
    work_history: p.history,
    education_history: p.education,
    additional_experience: p.additional,
    website_name: null,
    website_url: null,
    social_links: [],
    email: `${handle}@example.org`,
    testimonial_grace_until: null,
    verification_recheck_until: null,
    is_premium: !!p.featured,
    custom_domain: null,
    subscription_status: 'active',
    approval_status: 'approved',
    submitted_at: null,
    is_demo: true,
    created_at: p.updatedAt,
    updated_at: p.updatedAt,
    video_qnas_complete: false,
  }
  return { profile, portfolio }
}

/** The default fixture folder, relative to the engine package (npm scripts and
 *  tests run from loop8/engine). */
export const HARD_CASES_DIR = join(process.cwd(), 'samples', 'hard-cases')

/** Every case of cases.json with its fixture in both shapes. */
export function loadHardCases(dir: string = HARD_CASES_DIR): HardFixture[] {
  const { cases } = JSON.parse(readFileSync(join(dir, 'cases.json'), 'utf8')) as { cases: HardCase[] }
  return cases.map((hardCase) => {
    const demo = JSON.parse(readFileSync(join(dir, `${hardCase.handle}.json`), 'utf8')) as HardProfile
    if (demo.handle !== hardCase.handle) throw new Error(`fixture_handle_mismatch: ${hardCase.id}`)
    return { hardCase, demo, candidate: toCandidateInput(demo), source: fromDemoSeed(demo) }
  })
}

/** Every string value in a fixture (all fields, nested), for vocabulary checks. */
export function fixtureStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(fixtureStrings)
  if (value != null && typeof value === 'object') return Object.values(value).flatMap(fixtureStrings)
  return []
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** True when `text` contains `term` as a whole word or phrase, in any case. A
 *  letter or digit on either side breaks the match; a hyphen does not, so
 *  "e-procurement" contains "procurement". */
export function containsTerm(text: string, term: string): boolean {
  return new RegExp(`(?<![A-Za-z0-9])${escapeRe(term)}(?![A-Za-z0-9])`, 'i').test(text)
}
