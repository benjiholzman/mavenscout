// The ingestion module (Phase 2 Task 1): real job description understanding.
//
// Replaces the keyword placeholder's reach without lowering its floor. The
// placeholder only finds an expertise item when its exact name, an alias or an
// old name appears in the text, so it misses paraphrases ("validation workshop"
// for Workshop Facilitation). Here Sol reads the job description once against
// the expertise list as a controlled vocabulary and maps the wording to the
// right names, and the deterministic result is kept as a FLOOR: the output is
// the union of the two, so recall can only rise.
//
// Everything the model returns is validated against the known lists before it is
// used, so a wrong or invented name is dropped rather than shown to the manager.
// A model error degrades to the floor rather than failing the extraction, so a
// paste always produces suggestions (CLAUDE section 11.5, failure design).
//
// Contract (match-rework spec section 4): the output conforms to
// ExtractedRequirements, these are SUGGESTIONS only, nothing is ever marked
// required, and the hiring organization is never guessed. The job description is
// read ONCE, here.

import { buildExpertiseIndex } from '../../../../src/lib/expertise'
import { MAX_TAG_ROWS } from '../../../../src/lib/matching/config'
import { placeholderExtract } from '../../../../src/lib/matching/extract'
import type {
  ExtractedRequirements,
  ExtractedTag,
  ExtractedValue,
  ExtractionContext,
} from '../../../../src/lib/matching/types'
import { log } from '../shared/log'
import { parseExtraction, type CompleteFn } from '../bedrock/sol'
import { buildExtractionPrompt } from './prompt'

export interface ExtractDeps {
  complete: CompleteFn
}

/** Lowercase lookup from an option list back to its canonical spelling. */
function canonicalMap(options: string[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const o of options) m.set(o.trim().toLowerCase(), o)
  return m
}

/** Merge model-found values into the deterministic floor, keeping the floor's
 *  mention counts and adding model-only values at a single mention. */
function mergeValues(floor: ExtractedValue[], modelValues: string[]): ExtractedValue[] {
  const byValue = new Map(floor.map((v) => [v.value, { ...v }]))
  for (const value of modelValues) if (!byValue.has(value)) byValue.set(value, { value, mentions: 1 })
  return [...byValue.values()].sort((a, b) => b.mentions - a.mentions)
}

/** Read the job description once and suggest grid rows. Pure given `deps`, so
 *  tests inject a fake `complete` and no network is touched. */
export async function extractFromJd(
  jdText: string,
  ctx: ExtractionContext,
  deps: ExtractDeps,
): Promise<ExtractedRequirements> {
  const index = buildExpertiseIndex(ctx.taxonomy.categories, ctx.taxonomy.items)
  const floor = await placeholderExtract(jdText, ctx)
  if (jdText.trim() === '') return floor

  // Ask Sol. Any failure (throttle after retries, bad reply) falls back to the
  // deterministic floor so the manager still gets suggestions.
  let raw: { expertise: string[]; locations: string[]; languages: string[] }
  try {
    const reply = await deps.complete(
      buildExtractionPrompt({
        jdText,
        index,
        locationOptions: ctx.locationOptions,
        languageOptions: ctx.languageOptions,
      }),
    )
    raw = parseExtraction(reply)
  } catch (err) {
    log('extract_model_fallback', { jobId: 'n/a', message: err instanceof Error ? err.message : String(err) })
    return floor
  }

  // Validate expertise names against the controlled vocabulary: keep a canonical
  // name, map an old name to the item that absorbed it, drop anything unknown.
  const modelExpertise = new Set<string>()
  for (const name of raw.expertise) {
    const canonical = index.byName.has(name) ? name : index.legacy.get(name)
    if (canonical) modelExpertise.add(canonical)
  }

  // Union expertise: the floor's tags, plus model-only names at one mention.
  const order = new Map(index.items.map((it, i) => [it.name, i]))
  const byName = new Map<string, ExtractedTag>(floor.expertise.map((t) => [t.name, { ...t }]))
  for (const name of modelExpertise) {
    if (!byName.has(name)) byName.set(name, { name, mentions: 1, suggested: 'slight' })
  }
  const expertise = [...byName.values()]
    .sort((a, b) => b.mentions - a.mentions || (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0))
    .slice(0, MAX_TAG_ROWS)

  // Validate locations and languages against the known option lists.
  const locationCanon = canonicalMap(ctx.locationOptions)
  const languageCanon = canonicalMap(ctx.languageOptions)
  const modelLocations = raw.locations.map((v) => locationCanon.get(v.trim().toLowerCase())).filter((v): v is string => !!v)
  const modelLanguages = raw.languages.map((v) => languageCanon.get(v.trim().toLowerCase())).filter((v): v is string => !!v)

  return {
    expertise,
    locations: mergeValues(floor.locations, modelLocations),
    languages: mergeValues(floor.languages, modelLanguages),
    // Never guessed; the Org History row is prefilled from the manager's own org.
    hiring_organization: null,
  }
}
