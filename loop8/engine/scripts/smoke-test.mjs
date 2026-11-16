// Runs against a deployed API. Usage: ENGINE_URL=<api base url> node scripts/smoke-test.mjs
import { readFileSync } from 'node:fs'

const base = process.env.ENGINE_URL?.replace(/\/+$/, '')
if (!base) {
  console.error('ENGINE_URL is not set. Set it to the base URL of the deployed API.')
  process.exit(1)
}

const fail = (message) => {
  console.error(`Smoke test failed: ${message}`)
  process.exit(1)
}

const body = readFileSync(new URL('../samples/sample-job.json', import.meta.url), 'utf8')
const key = `smoke-${Date.now()}`
const post = () =>
  fetch(`${base}/jobs`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key }, body })

const started = Date.now()
const first = await post()
if (first.status !== 202) fail(`POST /jobs returned ${first.status}`)
const { jobId } = await first.json()
const second = await post()
if (second.status !== 202) fail(`second POST /jobs returned ${second.status}`)
if ((await second.json()).jobId !== jobId) fail('the same idempotency key returned a different job id')

const TERMINAL = new Set(['DONE', 'PARTIAL', 'FAILED'])
let job
while (true) {
  if (Date.now() - started > 120000) fail('timed out after 120 s')
  const res = await fetch(`${base}/jobs/${jobId}`)
  if (res.status !== 200) fail(`GET /jobs/${jobId} returned ${res.status}`)
  job = await res.json()
  if (TERMINAL.has(job.state)) break
  await new Promise((resolve) => setTimeout(resolve, 1000))
}
if (job.state === 'FAILED') fail(`job failed with ${job.errorCode ?? 'no error code'}`)

const resultRes = await fetch(job.resultUrl)
if (!resultRes.ok) fail(`result download returned ${resultRes.status}`)
const result = await resultRes.json()
if (!Array.isArray(result.results)) fail('result has no results array')
if (!result.settings) fail('result has no settings')

console.log(`OK job ${jobId} ${job.state}, ${result.results.length} results, ${job.endToEndMs} ms end to end`)
process.exit(0)
