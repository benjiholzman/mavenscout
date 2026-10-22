import { useState } from 'react'
import { resolveLogoUrl } from '../../lib/brandfetch'
import { monogramTint, orgMonogram } from '../../lib/monogram'

// Org logo with a monogram fallback. Falls back when there is no URL OR the
// image fails to load — which covers dead links generally, and Brandfetch
// Logo Links in headless test browsers (the CDN redirects HeadlessChrome to
// its website; real browsers get the image). Stored Brandfetch
// Logo Links are id-free; resolveLogoUrl adds the configured client id.
//
// The monogram uses the organization's short form when known (`acronym`, e.g.
// from orgAcronym), else initials of its significant words, on a muted tint
// picked from the name so a row of monograms stays distinguishable. Longer
// monograms (3–6 letters) shrink to fit the tile.

const MONOGRAM_SCALE = ['1em', '1em', '1em', '0.85em', '0.72em', '0.62em', '0.54em']

export function OrgLogo({
  url,
  name,
  acronym,
  className = 'h-4 w-4 rounded-sm',
  monogramClassName = 'text-[9px] font-bold',
}: {
  url: string | null | undefined
  name: string
  /** Known short form (UNICEF, IRC) for the monogram. */
  acronym?: string | null
  className?: string
  /** Font size and weight for the monogram; the tint is applied inline. */
  monogramClassName?: string
}) {
  const [errored, setErrored] = useState(false)
  const src = resolveLogoUrl(url)
  if (!src || errored) {
    const letters = orgMonogram(name, acronym)
    return (
      <span
        className={`flex shrink-0 items-center justify-center leading-none tracking-tight ${className} ${monogramClassName}`}
        style={monogramTint(name)}
      >
        <span style={{ fontSize: MONOGRAM_SCALE[letters.length] ?? '0.54em' }}>{letters}</span>
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className={`shrink-0 object-contain ${className}`}
      onError={() => setErrored(true)}
    />
  )
}
