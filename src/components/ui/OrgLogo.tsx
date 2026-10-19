import { useState } from 'react'
import { resolveLogoUrl } from '../../lib/brandfetch'

// Org logo with a monogram fallback. Falls back when there is no URL OR the
// image fails to load — which covers dead links generally, and Brandfetch
// Logo Links in headless test browsers (the CDN redirects HeadlessChrome to
// its website; real browsers get the image). Stored Brandfetch
// Logo Links are id-free; resolveLogoUrl adds the configured client id.

function monogram(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Z0-9]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

export function OrgLogo({
  url,
  name,
  className = 'h-4 w-4 rounded-sm',
  monogramClassName = 'bg-brand-100 text-[9px] font-bold text-brand-700',
}: {
  url: string | null | undefined
  name: string
  className?: string
  monogramClassName?: string
}) {
  const [errored, setErrored] = useState(false)
  const src = resolveLogoUrl(url)
  if (!src || errored)
    return (
      <span className={`flex shrink-0 items-center justify-center ${className} ${monogramClassName}`}>
        {monogram(name)}
      </span>
    )
  return (
    <img
      src={src}
      alt=""
      className={`shrink-0 object-contain ${className}`}
      onError={() => setErrored(true)}
    />
  )
}
