import { readFileSync } from 'node:fs'
import { runLocal } from '../src/local'
import type { RankRequest } from '../src/shared/validate'

const file = process.argv[2] ?? 'samples/sample-job.json'
const job = JSON.parse(readFileSync(file, 'utf8')) as RankRequest
const out = await runLocal(job, process.env)

console.log(`Job ${out.jobId}: ${out.state}`)
console.log('rank  profile id                            fit  band')
for (const r of out.results) {
  console.log(`${String(r.rank).padEnd(6)}${r.profile_id.padEnd(38)}${String(r.fit_score).padEnd(5)}${r.band}`)
}
console.log('\nSettings:', JSON.stringify(out.settings))
console.log('Phases:')
for (const p of out.record) console.log(' ', JSON.stringify(p))
console.log(`End to end: ${out.endToEndMs} ms`)
process.exit(out.state === 'FAILED' ? 1 : 0)
