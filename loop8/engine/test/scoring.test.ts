import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { scoreCandidate } from '../src/scoring/score'
import { computeAdjustments, mustHavesPassed } from '../../../src/lib/matching/adjustments'
import { bandFor } from '../../../src/lib/matching/config'
import { preferenceScoring, totalScore } from '../../../src/lib/matching/total'
import { buildExpertiseIndex } from '../../../src/lib/expertise'
import { buildOrgIndex } from '../../../src/lib/organizations'
import type { CandidateInput } from '../../../src/lib/matching/fit'
import type { Requirement } from '../../../src/lib/matching/types'
import type { Profile, TaxonomyCategory, TaxonomyItem } from '../../../src/types/db'

const track = { status: 'available_now' as const, from: null, until: null }

function profile(over: Partial<Profile>): Profile {
  return {
    id: 'p', user_id: null, consultant_type: 'Individual', handle: 'p', name: 'P', headline: 'Evaluation specialist',
    location: 'Nairobi, Kenya', career_level: 'senior', year_founded: null, contracting_work_eligibility: null,
    work_types: ['Remote'], part_time_availability: track, full_time_availability: track, availability_updated_at: null,
    photo_url: null, cover_image_url: null, resume_path: null, resume_url: null, detailed_bio: null,
    tiered_expertise: [], accreditations: [], spoken_languages: [], work_history: [], education_history: [],
    additional_experience: [], website_name: null, website_url: null, social_links: [], email: null,
    testimonial_grace_until: null, verification_recheck_until: null, is_premium: false, custom_domain: null,
    subscription_status: 'none', approval_status: 'approved', submitted_at: null, is_demo: true,
    created_at: '2026-01-01', updated_at: '2026-01-01', ...over,
  } as Profile
}

const cats: TaxonomyCategory[] = [{ id: 'c1', type: 'expertise', name: 'Health', sort_order: 1 }]
const items: TaxonomyItem[] = [
  { id: 'i1', category_id: 'c1', name: 'Health systems', sort_order: 1, kind: 'sector' },
  { id: 'i2', category_id: 'c1', name: 'Nutrition', sort_order: 2, kind: 'sector' },
]
const expertise = buildExpertiseIndex(cats, items)
const orgs = buildOrgIndex([])

const candidates: CandidateInput[] = [
  {
    profile: profile({
      id: 'a', tiered_expertise: [{ name: 'Health systems', tier: 'core' }],
      spoken_languages: [{ name: 'French', proficiency: 'fluent' }],
    }),
    portfolio: [],
  },
  {
    profile: profile({
      id: 'b', location: 'Lima, Peru', career_level: 'mid_career',
      tiered_expertise: [{ name: 'Nutrition', tier: 'working' }],
      spoken_languages: [{ name: 'French', proficiency: 'working' }],
    }),
    portfolio: [],
  },
  { profile: profile({ id: 'c', consultant_type: 'Small Firm', career_level: null, location: null }), portfolio: [] },
]

const requirements: Requirement[] = [
  { id: 'r1', kind: 'expertise', level: 'must', source: 'jd', value: { name: 'Health systems' } },
  { id: 'r2', kind: 'expertise', level: 'strong', source: 'jd', value: { name: 'Nutrition' } },
  { id: 'r3', kind: 'location', level: 'slight', source: 'manual', value: { values: ['Kenya'] } },
  { id: 'r4', kind: 'language', level: 'strong', source: 'manual', value: { values: ['French'], min: 'fluent' } },
  { id: 'r5', kind: 'career_level', level: 'slight', source: 'manual', value: { values: ['senior'] } },
  {
    id: 'r6', kind: 'availability', level: 'slight', source: 'filter',
    value: { partTime: true, fullTime: true, when: 'now_1m', byMonth: null, fromMonth: null, untilMonth: null },
  },
  { id: 'r7', kind: 'language', level: 'must', source: 'manual', value: { values: ['French'] } },
]

test('scoreCandidate equals the app functions called directly', () => {
  for (const fit of [0, 41.4, 41.6, 77, 100]) {
    for (const candidate of candidates) {
      const got = scoreCandidate(fit, { candidate, requirements, expertise, orgs })
      const adjustments = computeAdjustments(candidate, requirements, expertise, orgs)
      const scoring = preferenceScoring(adjustments)
      const total = totalScore(Math.round(fit), scoring)
      assert.deepEqual(got.adjustments, adjustments)
      assert.deepEqual(got.scoring, scoring)
      assert.deepEqual(got.must_haves_passed, mustHavesPassed(candidate, requirements, orgs))
      assert.equal(got.total_score, total)
      assert.equal(got.band, bandFor(total))
    }
  }
})

test('the fixtures cover every level and a non-trivial mix of outcomes', () => {
  const got = scoreCandidate(60, { candidate: candidates[0]!, requirements, expertise, orgs })
  assert.deepEqual(new Set(got.adjustments.map((a) => a.level)), new Set(['slight', 'strong']))
  assert.ok(got.scoring.possible > 0)
  assert.ok(got.must_haves_passed.length > 0)
  const other = scoreCandidate(60, { candidate: candidates[1]!, requirements, expertise, orgs })
  assert.notEqual(other.total_score, got.total_score)
})

test('fit is rounded to an integer before the total, and no preferences means total equals fit', () => {
  const none = scoreCandidate(72.6, { candidate: candidates[0]!, requirements: [], expertise, orgs })
  assert.equal(none.total_score, 73)
  assert.equal(none.scoring.weight, 0)
})

test('a candidate score does not depend on other candidates', () => {
  const alone = scoreCandidate(55, { candidate: candidates[1]!, requirements, expertise, orgs })
  scoreCandidate(99, { candidate: candidates[0]!, requirements, expertise, orgs })
  assert.deepEqual(scoreCandidate(55, { candidate: candidates[1]!, requirements, expertise, orgs }), alone)
})

test('the app scoring modules bundle for Node and load without import.meta.env', async () => {
  for (const name of ['adjustments', 'total', 'config']) {
    const outfile = resolve(`.test-dist/scoring-${name}-bundle.mjs`)
    await build({
      entryPoints: [resolve(`../../src/lib/matching/${name}.ts`)],
      outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent',
    })
    await import(pathToFileURL(outfile).href)
  }
})
