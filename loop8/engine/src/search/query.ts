export interface QueryExclusions {
  orgNames?: string[]
  places?: string[]
  languages?: string[]
}

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function buildQueryText(jdText: string, exclude?: QueryExclusions): string {
  const terms = [...(exclude?.orgNames ?? []), ...(exclude?.places ?? []), ...(exclude?.languages ?? [])]
    .map((t) => t.trim())
    .filter((t) => t !== '')
    .sort((a, b) => b.length - a.length)
  let text = jdText
  for (const term of terms) {
    // Any run of whitespace between the words of a term matches, so line breaks and double spaces do not leak a name.
    const pattern = term.split(/\s+/).map(escapeRegex).join('\\s+')
    // Lookarounds on word characters act as word boundaries even when the term starts or ends with punctuation.
    text = text.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${pattern}(?![\\p{L}\\p{N}_])`, 'giu'), '')
  }
  return text.replace(/\s+/g, ' ').trim()
}
