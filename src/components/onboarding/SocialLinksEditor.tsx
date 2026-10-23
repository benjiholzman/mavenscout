import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { MEMBERSHIP_LIMITS } from '../../lib/config'
import { PLATFORMS, platformIcon } from '../../lib/socials'
import { validateSocialUrl } from '../../lib/validation'
import type { SocialLink } from '../../types/db'

// Social/account links editor (PRD 7.13): fixed platform list + Other,
// per-platform URL validation (lenient about www/country variants),
// count capped by membership level (2 Member / 5 Featured Member).

export function SocialLinksEditor({
  value,
  onChange,
  cap,
}: {
  value: SocialLink[]
  onChange: (next: SocialLink[]) => void
  cap: number
}) {
  const [platform, setPlatform] = useState<string>('LinkedIn')
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const add = () => {
    const check = validateSocialUrl(platform, url.trim())
    if (!check.ok) return setError(check.message ?? 'Invalid URL')
    if (platform === 'Other' && !label.trim()) return setError('Give this link a label')
    onChange([
      ...value,
      { platform, label: platform === 'Other' ? label.trim() : platform, url: url.trim() },
    ])
    setUrl('')
    setLabel('')
    setError(null)
  }

  return (
    <div>
      <div className="space-y-2">
        {value.map((link, i) => {
          const Icon = platformIcon(link.platform)
          return (
            <div key={i} className="flex items-center gap-2.5 rounded-lg bg-paper/70 px-3 py-2 text-sm">
              <Icon size={15} className="shrink-0 text-ink-soft" />
              <span className="font-medium">{link.label}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-ink-faint">{link.url}</span>
              <button
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label={`Remove ${link.label}`}
                className="rounded-full p-1 text-ink-faint hover:bg-white hover:text-red-600"
              >
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>

      {value.length < cap ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="rounded-lg border border-line bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-400"
            >
              {PLATFORMS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            {platform === 'Other' && (
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label"
                className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400 sm:w-32"
              />
            )}
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
            <button
              onClick={add}
              className="inline-flex items-center justify-center gap-1 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-brand-400 hover:text-brand-600"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <p className="mt-3 text-xs text-ink-faint">
          Link limit reached ({cap}).
          {cap < MEMBERSHIP_LIMITS.featured.socialLinks &&
            ` Featured Members can add up to ${MEMBERSHIP_LIMITS.featured.socialLinks}.`}
        </p>
      )}
    </div>
  )
}
