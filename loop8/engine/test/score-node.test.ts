import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

// The baseline harness bundles score.ts for Node, where import.meta.env does not
// exist. The module must still load and expose both functions.
test('score.ts bundles and loads in Node without import.meta.env', async () => {
  const outfile = resolve('.test-dist/score-bundle.mjs')
  await build({
    entryPoints: [resolve('../../src/lib/matching/score.ts')],
    outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent',
  })
  const mod = await import(pathToFileURL(outfile).href)
  assert.equal(typeof mod.scorePool, 'function')
  assert.equal(typeof mod.rankPool, 'function')
})
