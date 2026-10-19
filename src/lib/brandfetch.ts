// Brandfetch employer-logo lookup (PRD 7.11 — P1). The Brand Search API
// resolves a typed organization name ("World Bank") to domain + logo matches;
// picking one writes the id-free Brandfetch CDN URL into the plain-text
// logo_url field (resolveLogoUrl adds the client id at render), so nothing
// about the schema knows or cares about the provider.
//
// Activation: needs a free Brandfetch client id. Set VITE_BRANDFETCH_CLIENT_ID
// in .env (build-time), or — handy for trying it without a rebuild — put it in
// localStorage under 'ms_brandfetch_client_id'. Without one, the lookup UI
// stays hidden and the manual paste-a-URL field (the P0 path) is unaffected.

export interface BrandMatch {
  name: string
  domain: string
  icon: string | null
}

export function brandfetchClientId(): string | null {
  return (
    (import.meta.env.VITE_BRANDFETCH_CLIENT_ID as string | undefined) ||
    localStorage.getItem('ms_brandfetch_client_id') ||
    null
  )
}

/** The durable Logo Link for a domain — this is what gets STORED in logo_url.
 *  It deliberately omits the client id: resolveLogoUrl() adds it at render
 *  time, so the id never lands in the database or seed files and rotating it
 *  fixes every stored logo. (The Search API's own `icon` URLs carry
 *  short-lived tokens and expire, so they're never stored.)
 *  Note: Brandfetch's CDN redirects headless browsers (HeadlessChrome user
 *  agent) to its website, so logos look broken in Playwright unless the test
 *  sets a regular Chrome user agent; real browsers, localhost included, get
 *  the image. OrgLogo's monogram fallback covers any load failure. */
export function logoLinkUrl(domain: string): string {
  return `https://cdn.brandfetch.io/${domain}`
}

const LOGO_LINK = /^https:\/\/cdn\.brandfetch\.io\/([^/?]+)\/?(?:\?|$)/

/** Renderable URL for a stored logo_url: adds the configured client id to an
 *  id-free Logo Link (null without one, so the monogram shows). Links already
 *  carrying `c=` and non-Brandfetch URLs pass through unchanged. */
export function resolveLogoUrl(url: string | null | undefined): string | null {
  if (!url || !LOGO_LINK.test(url) || /[?&]c=/.test(url)) return url ?? null
  const clientId = brandfetchClientId()
  return clientId ? `${url.replace(/\/$/, '')}?c=${clientId}` : null
}

/** Square-icon variant of a stored Logo Link, for small square logo tiles
 *  (Brandfetch serves its own lettermark when a brand has no icon). Any
 *  non-Brandfetch URL passes through unchanged. */
export function logoIconUrl(url: string | null): string | null {
  const domain = url?.match(LOGO_LINK)?.[1]
  const clientId = brandfetchClientId()
  if (!domain || !clientId) return url
  return `https://cdn.brandfetch.io/${domain}/icon/fallback/lettermark/w/96/h/96?c=${clientId}`
}

export async function searchBrands(name: string): Promise<BrandMatch[]> {
  const clientId = brandfetchClientId()
  if (!clientId || name.trim().length < 2) return []
  const res = await fetch(
    `https://api.brandfetch.io/v2/search/${encodeURIComponent(name.trim())}?c=${clientId}`,
  )
  if (!res.ok) throw new Error(`Brandfetch search failed (${res.status})`)
  const data = (await res.json()) as { name?: string; domain?: string; icon?: string }[]
  return data
    .filter((d) => d.domain)
    .slice(0, 6)
    .map((d) => ({ name: d.name || d.domain!, domain: d.domain!, icon: d.icon ?? null }))
}
