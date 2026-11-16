import { build } from 'esbuild'
import AdmZip from 'adm-zip'
import { rmSync } from 'node:fs'

const banner = "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"

rmSync('dist', { recursive: true, force: true })

for (const [name, entry] of [
  ['api', 'src/api/handler.ts'],
  ['worker', 'src/worker/handler.ts'],
]) {
  await build({
    entryPoints: [entry],
    outfile: `dist/${name}/index.mjs`,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    bundle: true,
    banner: { js: banner },
  })
  const zip = new AdmZip()
  zip.addLocalFile(`dist/${name}/index.mjs`)
  zip.writeZip(`dist/${name}.zip`)
}
