// Writes samples/sample-index.json: FAKE vectors for the ids in samples/sample-job.json, made by the
// fake embedder, so the offline semantic run has an index. Run: npm run make-sample-index
import { readFileSync, writeFileSync } from 'node:fs'
import { buildSampleIndex } from '../src/engine/local-fakes'

const job = JSON.parse(readFileSync('samples/sample-job.json', 'utf8')) as { poolIds: string[] }
writeFileSync('samples/sample-index.json', JSON.stringify(buildSampleIndex(job.poolIds)) + '\n')
console.log(`wrote samples/sample-index.json for ${job.poolIds.length} profiles`)
