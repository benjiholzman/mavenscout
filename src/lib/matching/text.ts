// Text helpers shared by the PLACEHOLDER extraction and scoring.
// Deliberately simple whole-word matching; the real engine replaces both.

/** Lowercase, '&' → 'and', every other non-alphanumeric run → one space, so
 *  "Monitoring & Evaluation", "monitoring and evaluation" and
 *  "Monitoring-and-Evaluation" compare equal. Padded with spaces so a search
 *  for " wash " only hits whole words. */
export function normalizeText(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `
}

/** Whole-word occurrences of `term` in already-normalized text. */
export function countTerm(normalizedText: string, term: string): number {
  const needle = normalizeText(term)
  if (needle.trim().length < 2) return 0
  let count = 0
  let from = 0
  for (;;) {
    const at = normalizedText.indexOf(needle, from)
    if (at === -1) return count
    count += 1
    from = at + needle.length - 1 // keep the trailing space as the next match's leading space
  }
}

export function containsTerm(normalizedText: string, term: string): boolean {
  return countTerm(normalizedText, term) > 0
}

const STOPWORDS = new Set(
  (
    'a an and are as at be but by can for from has have in into is it its of on or our per should that the their ' +
    'they this to we will with within would you your who all any also other such these those than then there ' +
    'which while what when where more most must may not only over under each including include includes'
  ).split(' '),
)

/** Content words of a text, in order (stopwords and very short words dropped). */
export function contentWords(text: string): string[] {
  return normalizeText(text)
    .trim()
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
}

/** "M&E", "PFM", "WHO", "REDD+": all-caps, matched as written. */
export const isAcronym = (term: string) => /^[A-Z][A-Z0-9&+/-]*[A-Z0-9+]s?$/.test(term)

export const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
