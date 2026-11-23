// The extraction prompt (Phase 2 Task 1). A pure function so it can be unit
// tested and reviewed without a model call.
//
// The design decisions this prompt encodes, from match-rework spec section 4,
// profiles-membership section 6 and loop8/CLAUDE.md section 3:
//   1. The expertise list is a CONTROLLED VOCABULARY. The model may only return
//      names that appear in it, mapping a paraphrase in the job description to
//      the closest canonical name. This is the gap the keyword placeholder
//      cannot cross: "validation workshop" to "Workshop Facilitation".
//   2. Locations and languages come only from the known option lists.
//   3. A location is returned only when the job REQUIRES the candidate to be
//      based or work there, not when the programme merely covers that country.
//      "Based in Ethiopia" is a location; "the programme covers Nigeria" is not.
//   4. Extraction only SUGGESTS. It never marks anything as required or a must
//      have; that choice stays with the hiring manager.
//   5. The hiring organization is never guessed.
// The reply is a strict JSON object, nothing else.

import type { ExpertiseIndex } from '../../../../src/lib/expertise'

/** One line per item: the canonical name, plus a short alias hint in
 *  parentheses so the model maps domain shorthand to the right name. */
function vocabularyLines(index: ExpertiseIndex): string {
  const lines: string[] = []
  for (const g of index.groups) {
    lines.push(`# ${g.label}`)
    for (const name of g.items) {
      const item = index.byName.get(name)
      const hints = item ? [...item.aliases, ...item.legacyNames] : []
      lines.push(hints.length > 0 ? `${name} (${hints.join(', ')})` : name)
    }
  }
  return lines.join('\n')
}

/** Written to the log with every extraction, so a result can be tied to the prompt that produced it. */
export const EXTRACTION_PROMPT_VERSION = 'extract-v2'

export const EXTRACTION_SYSTEM = [
  'You read a job description for an international development consultant role and',
  'return the requirements it states, as strict JSON and nothing else.',
  '',
  'Rules:',
  '1. expertise: choose only names from the EXPERTISE LIST below. Each line of the',
  '   list is a name, sometimes followed by hints in parentheses. The hints help you',
  '   recognize the topic and are not part of the name: return only the name before',
  '   the parenthesis, spelled exactly as in the list. Read the whole description,',
  '   including the context, the tasks and the deliverables, and return every name',
  '   on the list that the role needs, also when the description uses different',
  '   words for the same idea. Do not invent names and do not return a name that is',
  '   not on the list. Omit the field if nothing fits.',
  '2. locations: choose only values from the LOCATION OPTIONS below, and only when',
  '   the role requires the consultant to be based in, located in, or travel to',
  '   that place. Do not return a place that is named only because the programme,',
  '   client or topic covers it. A home based or remote role has no location.',
  '3. languages: choose only values from the LANGUAGE OPTIONS below, and only when',
  '   the role asks for that language.',
  '4. Return suggestions only. Never mark anything as required, mandatory or a must',
  '   have. Do not rank. Do not add commentary.',
  '5. Never guess the hiring organization.',
  '',
  'Reply with exactly this shape and no other text:',
  '{"expertise": [], "locations": [], "languages": []}',
].join('\n')

export interface PromptInput {
  jdText: string
  index: ExpertiseIndex
  locationOptions: string[]
  languageOptions: string[]
}

/** Build the system and user messages for one job description. */
export function buildExtractionPrompt({ jdText, index, locationOptions, languageOptions }: PromptInput): {
  system: string
  user: string
} {
  const user = [
    'EXPERTISE LIST',
    vocabularyLines(index),
    '',
    'LOCATION OPTIONS',
    locationOptions.join(', '),
    '',
    'LANGUAGE OPTIONS',
    languageOptions.join(', '),
    '',
    'JOB DESCRIPTION',
    jdText,
  ].join('\n')
  return { system: EXTRACTION_SYSTEM, user }
}
