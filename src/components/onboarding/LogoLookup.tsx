import { Search } from 'lucide-react'
import { useState } from 'react'
import { brandfetchClientId, logoLinkUrl, searchBrands, type BrandMatch } from '../../lib/brandfetch'

/** Brandfetch logo autocomplete (PRD 7.11 — P1): search by the org name the
 *  consultant already typed, confirm a match, write its CDN icon URL into
 *  logo_url. Renders nothing when no client id is configured — the manual
 *  URL field remains the P0 path either way. */
export function LogoLookup({
  organization,
  onPick,
}: {
  organization: string
  onPick: (iconUrl: string) => void
}) {
  const [matches, setMatches] = useState<BrandMatch[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!brandfetchClientId()) return null

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      setMatches(await searchBrands(organization))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setMatches(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={busy || organization.trim().length < 2}
        className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
      >
        <Search size={12} />
        {busy ? 'Searching…' : `Find logo for “${organization || '…'}” (Brandfetch)`}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {matches && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {matches.length === 0 && <p className="text-xs text-ink-faint">No matches found.</p>}
          {matches.map((m) => (
            <button
              key={m.domain}
              type="button"
              onClick={() => {
                // Store the durable, id-free Logo Link (search icons carry expiring tokens).
                onPick(logoLinkUrl(m.domain))
                setMatches(null)
              }}
              title={m.domain}
              className="flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink-soft hover:border-brand-400"
            >
              {m.icon && <img src={m.icon} alt="" className="h-4 w-4 rounded-sm object-contain" />}
              {m.name} <span className="text-ink-faint">{m.domain}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
