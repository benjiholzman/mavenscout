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
