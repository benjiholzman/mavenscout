# design-sync notes — MavenScout

MavenScout is a full app (Vite + React + TypeScript + Supabase), not a packaged
component library — there's no Storybook, no `main`/`module`/`exports` in
`package.json`. This sync uses the package shape, with a hand-authored
`cfg.entry` (`.design-sync/entry.mjs`) rather than the converter's own
synth-entry fallback — see "Entry & component scope" below for why.

## Scope

Synced (19 components): `MultiSelect`, `TagPills`, `Modal`, `Switch`,
`Carousel`, `GatePrompt`, `InfoTip`, `OrgLogo`, `SignupPrompt`, the
`Skeletons.tsx` group (`Skeleton`/`DirectorySkeleton`/`ProfileSkeleton`/
`RowsSkeleton`), the `badges.tsx` component exports (`VerifiedBadge`/
`FirmTypeBadge`/`FeaturedRibbon`/`AvailabilityBadges`/`SelfAttestedMark`),
and `FlipCard`. All 19 have authored previews (not floor cards), all graded
`good`.

**No Button component exists** in this repo — buttons are inline
Tailwind-styled `<button>`/`<a>` markup repeated across pages, not an
extracted component. Deliberately not synced (would be a reimplementation,
against this skill's core rule). The button styling pattern should be
captured in the conventions header instead.

## Entry & component scope

`package.json` has no `main`/`module`/`exports`, and the converter's
`--node-modules`-based `PKG_DIR` resolution (`join(NODE_MODULES, PKG)`)
assumes the package is installed as a dependency of itself, which fails
(`ENOENT .../node_modules/mavenscout/package.json`) since this repo never
self-installs. The auto "no dist → synthesize from src/" fallback
(`deriveComponentsFromSrc`) would also pull in every PascalCase export across
all of `src/` (pages, admin screens, etc.), not just the intended UI set.

Fixed both at once with a hand-written `cfg.entry` (`.design-sync/entry.mjs`,
committed, durable): a small barrel file re-exporting exactly the 19 scoped
components by real relative path. Passing `--entry` makes `package-build.mjs`
walk up from the entry file to find the real `package.json` (repo root) —
no `node_modules/<pkg>` needed — and the bundle only contains what the entry
re-exports. `componentSrcMap` in config.json still pins every component (for
naming/grouping), but the actual bundle contents come from `entry.mjs`.

**Adding a component later**: add it to both `entry.mjs` (the re-export) and
`componentSrcMap` (the name→path pin) — neither alone is sufficient.

## Gotchas fixed during this sync

- **`src/lib/supabase.ts` threw at module-load time** if
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` were missing. `FlipCard`
  transitively imports it (via `lib/media.ts`'s `resolveVideo`), and since
  esbuild (not Vite) doesn't inject real values for
  `import.meta.env.VITE_SUPABASE_*`, that throw fired immediately when the
  bundle's IIFE ran — crashing the *entire* bundle, not just FlipCard. Fixed
  (with the user's explicit sign-off) by making the client a lazy singleton
  behind a `Proxy` — `supabase.ts` now only constructs/validates on first
  actual property access, not on import. Verified at runtime with Playwright
  against the real dev server + live Supabase project: Directory page still
  loads all 15 seeded profiles, zero console/page errors. This is a real
  product-source change (not design-sync config) — committed separately from
  the `.design-sync/` durable set.
- **Tailwind only compiles classes it sees scanned from `src/**`** — authored
  preview files live under `.design-sync/previews/`, outside that scan, so
  any class used ONLY in a preview (not already present somewhere in real
  `src/` code) silently produces no CSS at all (no error — just invisible
  styling). Caught this via `FeaturedRibbon`'s `h-32`/`w-64` wrapper
  collapsing to zero height. **Fix**: `.design-sync/tailwind.config.ds.js`
  (durable, committed) is a copy of the real `tailwind.config.js` with
  `.design-sync/previews/**/*.tsx` added to `content`. Build it with:
  ```
  npx tailwindcss -c .design-sync/tailwind.config.ds.js -i src/styles/index.css -o .design-sync/.cache/ds-styles.css
  ```
  `cfg.cssEntry` points at that generated file, **not** `dist/assets/*.css`
  directly. This never touches the real app's `tailwind.config.js` or
  production build — fully isolated to design-sync tooling.
  **On re-sync: re-run this command before `package-build.mjs`** whenever
  any preview file changes, or new preview-only classes silently won't
  style. `.design-sync/.cache/ds-styles.css` itself is gitignored (cache),
  but the config that generates it is committed.
- **Fonts load via a Google Fonts `<link>` in `index.html`**, not shipped as
  local `@font-face`/woff2 — the converter's font scraper can't see them.
  Both families (Schibsted Grotesk, Public Sans) are open-license (Google
  Fonts). Fetched the real woff2 files (latin subset only — 9 weight/style
  combos actually used: Public Sans 400/500/600/700 + 400 italic, Schibsted
  Grotesk 400/500/600/700) and wrote a local `@font-face` CSS at
  `.design-sync/fonts-src/google-fonts.css`, wired via `cfg.extraFonts`.
- **`GatePrompt`, `SignupPrompt`, and `FlipCard` use `<Link>` from
  `react-router-dom`**, which needs a Router context or throws. Added
  `react-router-dom` to `cfg.extraEntries` and set
  `cfg.provider.component = "MemoryRouter"` so previews render inside a
  router without needing real routes.
- **`MultiSelect`'s dropdown panel is `fixed`/bottom-sheet below Tailwind's
  `sm:` breakpoint** (640px) and `sm:absolute` above it. At the default grid
  capture width it's a mobile bottom sheet that clips badly in a `.ds-cell`
  (`overflow:hidden`). Fixed with
  `cfg.overrides.MultiSelect: {"cardMode": "single", "primaryStory":
  "OpenGroupedOptions", "viewport": "700x560"}` — width ≥640px keeps it on
  the desktop `sm:absolute` styling, which composes correctly inside the
  single-card transformed wrapper.
- **`Modal` and `SignupPrompt` (wraps Modal) are `position:fixed` full-page
  overlays** — need `cardMode: "single"` so the fixed backdrop/dialog is
  contained in the card's transformed wrapper instead of escaping to the
  page. Even with that, both still print `[RENDER_THIN]` (measured height
  0px) on every validate run — **triaged as benign**: the actual shipped
  `general__Modal.png`/`general__SignupPrompt.png` overview screenshots show
  correctly centered, fully-styled dialogs (confirmed visually). Only the
  PER-STORY grading capture (`?story=`) renders blank for these two — a tool
  quirk specific to measuring `position:fixed` content, not a real render
  failure. **Known render warns — do not re-chase on re-sync**:
  `[RENDER_THIN] Modal`, `[RENDER_THIN] SignupPrompt`.
- **`Carousel`, `GatePrompt`, `RowsSkeleton`, `DirectorySkeleton`,
  `ProfileSkeleton` all flagged `[GRID_OVERFLOW]`** (explicit-width wrapper
  divs or full-page layouts wider than a grid cell). Fixed with
  `cardMode: "column"` for all five.
- **`OrgLogo`'s `WithImage` story originally used a `picsum.photos` 64x64
  URL** which reliably failed to load in the headless Playwright capture
  (confirmed via raw screenshot showing the browser's broken-image glyph,
  even though `curl` could fetch it fine — some redirect/size quirk specific
  to that endpoint+size in a headless context). Other picsum URLs at larger
  sizes (FlipCard's cover photos, Carousel images) loaded fine. Switched to
  an `i.pravatar.cc` URL (already proven reliable elsewhere in this bundle)
  — resolved cleanly. If adding more `OrgLogo` stories with real images,
  prefer `i.pravatar.cc` over small `picsum.photos` requests.
- Grouping: `ui/` is in the converter's generic-directory list, so all the
  `src/components/ui/*` components default-group as `general` rather than
  something nicer. Tried the `docsMap` stub-frontmatter regroup trick, but
  it overwrites the synthesized `.prompt.md` body wholesale — not worth
  trading real per-component API docs for cosmetic grouping. Left as-is.

## Re-sync risks

- The lazy-singleton `supabase.ts` pattern is now load-bearing for this sync
  to keep working — if a future refactor reintroduces an eager
  `createClient()` call (or a new component imports something else that
  reads real env vars at module scope), the bundle will crash again the same
  way. Worth a comment in that file pointing here (already added inline).
- `entry.mjs` + `componentSrcMap` are a hand-picked, parallel pair — adding a
  new reusable UI component later means updating both explicitly; neither is
  auto-discovered.
- `cfg.cssEntry` depends on **two** generated artifacts staying in sync:
  `npm run build` (for the real app's compiled utility classes) AND the
  `tailwindcss -c .design-sync/tailwind.config.ds.js` command above (for
  preview-only classes). Skipping either on a re-sync after touching styles
  or previews will silently under-style something — there's no error, just
  missing CSS. Always re-run both before `package-build.mjs`.
- The Google Fonts woff2 files are a point-in-time fetch (Google Fonts
  `v21`/`v7` as of this sync) — if the repo's `index.html` font query string
  changes (different weights/families), re-fetch and regenerate
  `.design-sync/fonts-src/google-fonts.css`.
- `cfg.overrides` (MultiSelect/Modal/SignupPrompt/Carousel/GatePrompt/
  RowsSkeleton/DirectorySkeleton/ProfileSkeleton) are presentation-only and
  don't invalidate grades, but if any of these components' real CSS changes
  (e.g. MultiSelect's breakpoint, Modal's positioning), re-check whether the
  override is still the right fix.
