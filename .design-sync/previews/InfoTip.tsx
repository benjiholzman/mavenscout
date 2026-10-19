import { InfoTip } from 'mavenscout'

// The tooltip itself is hover/focus-only (opacity-0 by default via CSS) and
// can't be captured in a static render — shown here is the resting state,
// which is the icon as it actually appears inline in real usage (e.g.
// FirmTypeBadge). See NOTES.md "States that can't render statically".

export function Default() {
  return <InfoTip text="Small Firm: 15 or fewer people. Large Firm: more than 15. Self-reported by the firm." />
}

export function InContext() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink-soft">
      Small Firm <InfoTip text="Small Firm: 15 or fewer people. Large Firm: more than 15. Self-reported by the firm." />
    </span>
  )
}
