import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import AdmZip from 'adm-zip'

test('build produces api.zip and worker.zip, each containing index.mjs', () => {
  execFileSync(process.execPath, ['build.mjs'], { stdio: 'pipe' })
  for (const name of ['api', 'worker']) {
    const entries = new AdmZip(`dist/${name}.zip`).getEntries().map((e) => e.entryName)
    assert.deepEqual(entries, ['index.mjs'])
  }
})
