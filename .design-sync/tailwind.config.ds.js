// design-sync-only Tailwind config: identical to the app's own
// tailwind.config.js, except the content scan also covers
// .design-sync/previews/**, so classes used only in authored preview
// stories (not anywhere in real src/) still get compiled. Never used by
// the app's own build — isolated to the design-sync CSS output. Absolute
// paths throughout so this resolves the same regardless of invocation cwd.
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import real from '../tailwind.config.js'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')

export default {
  ...real,
  content: [
    resolve(repoRoot, 'index.html'),
    resolve(repoRoot, 'src/**/*.{ts,tsx}'),
    resolve(repoRoot, '.design-sync/previews/**/*.tsx'),
  ],
}
