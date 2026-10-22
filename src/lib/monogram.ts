// Monograms: the letters shown when there's no photo or logo.

/** Words skipped when taking initials ("Ministry of Health" → MH, not MO). */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'at', 'da', 'das', 'de', 'del', 'des', 'di', 'do', 'dos', 'du', 'e', 'el', 'en', 'et',
  'for', 'fur', 'für', 'in', 'la', 'las', 'le', 'les', 'los', 'of', 'on', 'para', 'par', 'por', 'pour',
  'sur', 'the', 'to', 'y',
])

/** A leading all-caps word of 3–6 letters ("UNDP Iraq"). Two-letter words
 *  are skipped, so "UN Women" reads UW rather than UN. */
const isAcronymWord = (w: string) => /^[A-Z][A-Z0-9]{2,5}$/.test(w)

/**
 * Up to `max` letters for an organization:
 *  - a known short form (UNICEF, IRC) when the caller has one;
 *  - an acronym in parentheses ("Grupo de Análisis para el Desarrollo (GRADE)");
 *  - a name that is itself an acronym, or starts with one ("UNDP Iraq" → UNDP);
 *  - otherwise the initials of the significant words ("International Rescue
 *    Committee" → IRC; "Ministry of Health" → MH).
 */
export function orgMonogram(name: string, acronym?: string | null, max = 6): string {
  if (acronym) return acronym.slice(0, max)
  const paren = name.match(/\(([A-Z][A-Z0-9]{1,5})\)/)?.[1]
  if (paren) return paren.slice(0, max)
  const words = name
    .replace(/\([^)]*\)/g, ' ')
    // Elided articles: "l'Informatique" → "Informatique", "d'Ivoire" → "Ivoire".
    .replace(/\b[ldjLDJ]['’]/g, '')
    .split(/[\s/,–—-]+/)
    .filter(Boolean)
  if (words[0] && isAcronymWord(words[0])) return words[0].slice(0, max)
  const initials = words
    .filter((w) => !STOP_WORDS.has(w.toLowerCase()) && /^[\p{L}\p{N}]/u.test(w))
    .map((w) => w[0]!.toUpperCase())
  return initials.slice(0, Math.min(3, max)).join('') || '?'
}

/** Two initials for a person or firm name ("Dr. Sunita Patel" → SP). */
export function nameInitials(name: string): string {
  const words = name
    .split(/\s+/)
    .filter((w) => w && !/^(dr|prof|mr|mrs|ms)\.?$/i.test(w) && !STOP_WORDS.has(w.toLowerCase()))
    .filter((w) => /^[\p{L}\p{N}]/u.test(w))
  const letters = words.length > 1 ? [words[0]!, words[words.length - 1]!] : words
  return letters.map((w) => w[0]!.toUpperCase()).join('') || '?'
}

/** Muted tints, all with ≥ 4.5:1 text contrast, so neighbouring monograms in a
 *  row of logos read as different organizations. Picked by a stable hash. */
const TINTS: { bg: string; fg: string }[] = [
  { bg: '#D2EDF1', fg: '#095D6C' }, // brand cyan
  { bg: '#DDE6F0', fg: '#2F4A66' }, // slate blue
  { bg: '#E1EBDD', fg: '#3B5734' }, // sage
  { bg: '#F1E6D3', fg: '#6E5714' }, // sand
  { bg: '#F2E0DC', fg: '#7A3E33' }, // clay
  { bg: '#E6E2EF', fg: '#4B3F6B' }, // heather
]

export function monogramTint(key: string): { backgroundColor: string; color: string } {
  let h = 0
  for (const ch of key.toLowerCase()) h = (h * 31 + ch.codePointAt(0)!) >>> 0
  const t = TINTS[h % TINTS.length]!
  return { backgroundColor: t.bg, color: t.fg }
}
