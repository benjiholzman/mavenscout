import { FeaturedRibbon } from 'mavenscout'

// Absolutely positioned (top-right) — shown here in its real composition
// context, a relative-positioned card image area, matching FlipCard usage.
export function Default() {
  return (
    <div className="relative h-32 w-64 overflow-hidden rounded-t-card bg-brand-100">
      <FeaturedRibbon />
    </div>
  )
}
