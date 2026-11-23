// Reads the reply of the extraction model into the three lists it asks for.

/** The arrays extraction expects back from the model, before validation. */
export interface RawExtraction {
  expertise: string[]
  locations: string[]
  languages: string[]
}

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : []

/** Parse the model reply into three string arrays, tolerant of a reply wrapped
 *  in a fenced code block or with text around the JSON object. Throws only when
 *  no JSON object can be found at all; a present-but-partial object yields empty
 *  arrays for the missing keys, so a thin reply degrades to the deterministic
 *  floor rather than failing the whole extraction. */
export function parseExtraction(reply: string): RawExtraction {
  const fenced = reply.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : reply
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Model reply contained no JSON object')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(body.slice(start, end + 1))
  } catch {
    throw new Error('Model reply was not valid JSON')
  }
  const obj = (parsed ?? {}) as Record<string, unknown>
  return {
    expertise: asStrings(obj.expertise),
    locations: asStrings(obj.locations),
    languages: asStrings(obj.languages),
  }
}
