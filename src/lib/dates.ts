// Date-only strings ('2026-12-31') parsed with new Date() are read as UTC
// midnight and render as the PREVIOUS day in timezones behind UTC. Always
// parse date-only values as local dates via these helpers.

export function parseLocalDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
}

export function fmtDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function fmtMonthYear(value: string): string {
  return parseLocalDate(value).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

export function fmtLongMonthYear(value: string): string {
  return parseLocalDate(value).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function fmtMonth(value: string): string {
  return parseLocalDate(value).toLocaleDateString(undefined, { month: 'short' })
}

/** Portfolio year span: "2023–2024", "2023" when start and end match,
 *  "2023–ongoing" when there's no end year (spec §7.2). Null when no years
 *  are set. */
export function fmtYearSpan(start: number | null, end: number | null): string | null {
  if (!start) return end ? String(end) : null
  if (end === null) return `${start}–ongoing`
  return start === end ? String(start) : `${start}–${end}`
}

/** "2023–2024 · GIZ" — portfolio dates and organization, either optional. */
export function fmtPortfolioMeta(item: {
  organization: string | null
  start_year: number | null
  end_year: number | null
}): string | null {
  return [fmtYearSpan(item.start_year, item.end_year), item.organization?.trim()].filter(Boolean).join(' · ') || null
}
