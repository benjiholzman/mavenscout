import { build } from 'esbuild'
import { readdirSync, rmSync } from 'node:fs'

rmSync('.test-dist', { recursive: true, force: true })
const entryPoints = readdirSync('test')
  .filter((f) => f.endsWith('.test.ts'))
  .map((f) => `test/${f}`)

await build({
  entryPoints,
  outdir: '.test-dist',
  outExtension: { '.js': '.mjs' },
  platform: 'node',
  format: 'esm',
  target: 'node22',
  bundle: true,
  packages: 'external',
})
