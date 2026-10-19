## MavenScout component conventions

This is a slice of a real app (not a published component library) — 19
reusable UI components pulled from `src/components/ui/` and
`src/components/directory/FlipCard.tsx`. Build with the real components
below; compose new layout/structure with the same Tailwind idiom the app
itself uses.

**Routing context.** `GatePrompt`, `SignupPrompt`, and `FlipCard` render a
react-router-dom `<Link>` internally. Any page using them needs a Router
ancestor (`BrowserRouter`/`MemoryRouter`) — without one they throw, not
render blank.

**Styling idiom: Tailwind utility classes, this app's palette.** No CSS-in-JS,
no separate token file — the design language IS these utility names. Real
family (from `tailwind.config.js`, verified against the compiled stylesheet):

| Role | Classes |
|---|---|
| Action/brand accent (cyan) | `bg-brand-500` / `text-brand-700` / `border-brand-300` etc., scale 50–900. Reserve for actions + emphasis, not backgrounds everywhere. |
| Page background | `bg-paper` (warm off-white, `#FAF8F5` — never stark white) |
| Body text | `text-ink` (default), `text-ink-soft` (secondary), `text-ink-faint` (tertiary/meta) |
| Borders/dividers | `border-line` |
| Premium/"Featured" accent (gold) | `bg-gold-500` / `text-gold-700`, scale 300/500/700 — reserved for premium-tier treatment (see `FeaturedRibbon`), not a general accent |
| Card corner radius | `rounded-card` (0.875rem — the app's signature card radius, distinct from Tailwind's default `rounded-xl`) |
| Headings | `font-display` (Schibsted Grotesk) — opt in on headings only |
| Body copy | Public Sans is the inherited default (applied at the `html` root) — no class needed for body text |

Status-color convention (not a token, a pattern — see `AvailabilityBadges`):
green (`bg-emerald-100 text-emerald-800`) = available now, amber
(`bg-amber-100 text-amber-800`) = available in future, grey
(`bg-ink/5 text-ink-faint`) = unavailable.

**Where the truth lives.** `styles.css` (+ its `@import` closure, including
`_ds_bundle.css`) carries every compiled utility class and the two brand
`@font-face` families. Each component's `.prompt.md` has its real prop
contract and usage examples. `guidelines/docs/MavenScout-design.md` is the
product's actual brand brief (fixed accent color + logo usage, open
typography/layout).

**No Button component.** Buttons are inline Tailwind markup, not an
extracted component — this app repeats `rounded-full bg-brand-500 px-4
py-1.5 text-sm font-medium text-white hover:bg-brand-600` (primary) or
`rounded-full border border-line bg-white px-4 py-1.5 text-sm font-medium
text-ink-soft hover:border-ink-faint` (secondary) directly wherever a button
is needed (see `GatePrompt`, `SignupPrompt` for real examples). Follow the
same pattern rather than inventing a different button style.

**One idiomatic composition** (real pattern, adapted from `FlipCard`'s
action bar + badge usage):

```tsx
<div className="flex items-center justify-between rounded-card border border-line bg-white p-4">
  <div className="flex items-center gap-2">
    <VerifiedBadge compact />
    <span className="text-sm text-ink-soft">Mid-Career (5–15 yrs)</span>
  </div>
  <a className="rounded-full bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600">
    View Profile
  </a>
</div>
```
