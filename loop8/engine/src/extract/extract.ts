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
import type { CompleteFn } from './complete'
import { parseExtraction } from './parse'
import { buildExtractionPrompt } from './prompt'

/** What the validation did with the names the model returned. Counts only, never text. */
export interface ExtractionStats {
  expertise: {
    returned: number
    /** The name was on the list as returned. */
    exact: number
    /** The name was an old name of an item on the list, as returned. */
    legacy: number
    /** The name matched only after its trailing hint in parentheses was removed. */
    hintRemoved: number
    /** The name matched nothing and was dropped. */
    dropped: number
  }
  locations: { returned: number; kept: number }
  languages: { returned: number; kept: number }
}

export interface ExtractDeps {
  complete: CompleteFn
  /** Called when the model failed and the result is the deterministic floor. */
  onFallback?: (message: string) => void
  /** Called with the counts of the validation when the model answered. */
  onStats?: (stats: ExtractionStats) => void
}

/** The list sends each name followed by its hints in parentheses, and a model may copy the whole line. */
const TRAILING_HINT = /\s*\([^)]*\)\s*$/

/** The canonical name of a name the model returned, or null. The exact name is tried first, so a real name
 *  that contains a parenthesis could never be broken by the removal of the hint. */
function resolveExpertise(
  index: ReturnType<typeof buildExpertiseIndex>,
  name: string,
): { canonical: string; how: 'exact' | 'legacy' | 'hintRemoved' } | null {
  if (index.byName.has(name)) return { canonical: name, how: 'exact' }
  const old = index.legacy.get(name)
  if (old) return { canonical: old, how: 'legacy' }
  const bare = name.replace(TRAILING_HINT, '').trim()
  if (bare !== name && bare !== '') {
    if (index.byName.has(bare)) return { canonical: bare, how: 'hintRemoved' }
    const bareOld = index.legacy.get(bare)
    if (bareOld) return { canonical: bareOld, how: 'hintRemoved' }
  }
  return null
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
    const message = err instanceof Error ? err.message : String(err)
    log('extract_model_fallback', { jobId: 'n/a', message })
    deps.onFallback?.(message)
    return floor
  }

  // Validate expertise names against the controlled vocabulary: keep a canonical
  // name, map an old name to the item that absorbed it, drop anything unknown.
  const modelExpertise = new Set<string>()
  const expertiseStats = { returned: raw.expertise.length, exact: 0, legacy: 0, hintRemoved: 0, dropped: 0 }
  for (const name of raw.expertise) {
    const found = resolveExpertise(index, name)
    if (!found) {
      expertiseStats.dropped++
      continue
    }
    expertiseStats[found.how]++
    modelExpertise.add(found.canonical)
  }

  // Union expertise: keep every floor tag, then fill the remaining rows with
  // model-only names. The floor is the recall guarantee, so a model suggestion
  // must never push a deterministic hit out of the capped list. Because the
  // floor is already capped at MAX_TAG_ROWS, retaining all of it and topping up
  // to the cap never evicts a floor tag.
  const order = new Map(index.items.map((it, i) => [it.name, i]))
  const floorTags = floor.expertise.map((t) => ({ ...t }))
  const floorNames = new Set(floorTags.map((t) => t.name))
  const modelOnly = [...modelExpertise]
    .filter((name) => !floorNames.has(name))
    .map((name): ExtractedTag => ({ name, mentions: 1, suggested: 'slight' }))
    .sort((a, b) => (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0))
  const remaining = Math.max(0, MAX_TAG_ROWS - floorTags.length)
  const expertise = [...floorTags, ...modelOnly.slice(0, remaining)].sort(
    (a, b) => b.mentions - a.mentions || (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0),
  )

  // Validate locations and languages against the known option lists.
  const locationCanon = canonicalMap(ctx.locationOptions)
  const languageCanon = canonicalMap(ctx.languageOptions)
  const modelLocations = raw.locations.map((v) => locationCanon.get(v.trim().toLowerCase())).filter((v): v is string => !!v)
  const modelLanguages = raw.languages.map((v) => languageCanon.get(v.trim().toLowerCase())).filter((v): v is string => !!v)

  deps.onStats?.({
    expertise: expertiseStats,
    locations: { returned: raw.locations.length, kept: modelLocations.length },
    languages: { returned: raw.languages.length, kept: modelLanguages.length },
  })

  return {
    expertise,
    locations: mergeValues(floor.locations, modelLocations),
    languages: mergeValues(floor.languages, modelLanguages),
    // Never guessed; the Org History row is prefilled from the manager's own org.
    hiring_organization: null,
  }
}
