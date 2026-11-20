// Fake models and fake data for the offline local run (LOCAL_FAKE_MODELS=true). Nothing here is real:
// the embedder hashes words, the text model returns fixed shapes, and the profiles are minimal stand-ins.
// None of it may be used in a deployed worker.

import { buildExpertiseIndex } from '../../../../src/lib/expertise'
import { buildOrgIndex } from '../../../../src/lib/organizations'
import type { CandidateInput } from '../../../../src/lib/matching/fit'
import type { Profile } from '../../../../src/types/db'
import type { Extraction, ReferenceLists, ScoringData } from '../data/supabase'
import type { TextModel } from '../models/text-model'
import type { EmbedText } from '../search/cosine'

export const FAKE_MODEL_VERSION = 'fake-embed-v0'
export const FAKE_INDEX_VERSION = 'sample-fake-1'
export const FAKE_JD_TEXT =
  'We need a water and sanitation specialist to evaluate a rural health programme and write a short report.'

function hash(word: string): number {
  let h = 2166136261
  for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 16777619)
  return h >>> 0
}

/** A bag of hashed words, normalized. The same text always gives the same vector. */
export function fakeVector(text: string, dimensions: number): number[] {
  const v = new Array<number>(dimensions).fill(0)
  for (const w of text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) v[hash(w) % dimensions] += 1
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
  return v.map((x) => Math.round((x / norm) * 10000) / 10000)
}

export function createFakeEmbed(dimensions: number): EmbedText {
  return async (text) => fakeVector(text, dimensions)
}

const SUMMARY = Array.from({ length: 45 }, (_, i) => `word${i}`).join(' ')

/** Answers the Fit call with a score from a hash of the prompt, and the summary call with fixed text. */
export function createFakeTextModel(): TextModel {
  return async (req) => {
    if (req.system.startsWith('You judge')) {
      const fit = 30 + (hash(req.user) % 61)
      return { text: JSON.stringify({ fit, fragmentIds: ['E1'], reason: 'fake local model' }), inputTokens: 0, outputTokens: 0 }
    }
    return { text: SUMMARY, inputTokens: 0, outputTokens: 0 }
  }
}

const track = { status: 'available_now' as const, from: null, until: null }

function minimalProfile(id: string): Profile {
  return {
    id, user_id: null, consultant_type: 'Individual', handle: id, name: `Fake ${id.slice(0, 8)}`, headline: 'Fake sample profile',
    location: null, career_level: 'senior', year_founded: null, contracting_work_eligibility: null,
    work_types: [], part_time_availability: track, full_time_availability: track, availability_updated_at: null,
    photo_url: null, cover_image_url: null, resume_path: null, resume_url: null, detailed_bio: null,
    tiered_expertise: [], accreditations: [], spoken_languages: [], work_history: [], education_history: [],
    additional_experience: [], website_name: null, website_url: null, social_links: [], email: null,
    testimonial_grace_until: null, verification_recheck_until: null, is_premium: false, custom_domain: null,
    subscription_status: 'none', approval_status: 'approved', submitted_at: null, is_demo: true,
    created_at: '2026-01-01', updated_at: '2026-01-01',
  } as Profile
}

/** Scoring data for any ids: one minimal profile each, no taxonomy, no organizations. */
export async function fakeScoringData(ids: string[]): Promise<ScoringData> {
  const candidates: CandidateInput[] = ids.map((id) => ({ profile: minimalProfile(id), portfolio: [] }))
  return { candidates, expertise: buildExpertiseIndex([], []), orgs: buildOrgIndex([]), missing: [] }
}

export async function fakeExtraction(): Promise<Extraction> {
  return { extracted: null, hiringOrganization: null }
}

/** Fake canonical lists, so the offline run strips organization and language names as the real one does. */
export async function fakeReferenceLists(): Promise<ReferenceLists> {
  return {
    organizations: ['Fake Relief Agency', 'FRA'],
    organizationTerms: { names: ['Fake Relief Agency'], aliases: ['FRA'] },
    languages: ['Esperanto'],
  }
}

export async function fakeJobText(): Promise<string> {
  return FAKE_JD_TEXT
}

const TOPICS = [
  'water sanitation hygiene programme evaluation in rural communities',
  'public health systems strengthening and health financing',
  'education policy research and teacher training',
  'agricultural value chains and smallholder livelihoods',
  'climate adaptation and disaster risk reduction',
]

/** A tiny index over the given profile ids, two fragments each. FAKE data: vectors come from fakeVector. */
export function buildSampleIndex(profileIds: string[], dimensions = 1024) {
  return {
    modelVersion: FAKE_MODEL_VERSION,
    indexVersion: FAKE_INDEX_VERSION,
    dimensions,
    note: 'FAKE sample data for offline local runs. Not real profiles, not real embeddings.',
    fragments: profileIds.flatMap((profileId, i) =>
      ['portfolio', 'skill'].map((type, j) => {
        const text = `Fake sample ${type} fragment on ${TOPICS[(i + j) % TOPICS.length]}.`
        return { fragmentId: `${profileId}#${type}#0`, profileId, type, text, vector: fakeVector(text, dimensions) }
      }),
    ),
  }
}
