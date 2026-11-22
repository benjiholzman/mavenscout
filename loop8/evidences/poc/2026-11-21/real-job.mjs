// One real ranking against the deployed API, posted with ToR 01 and its fixed requirement rows.
// Reads Supabase (read only) for the pool ids and names.
// Never prints keys. Usage: ENGINE_URL=<api> SUPABASE_URL=<..> SUPABASE_ANON_KEY=<..> node real-job.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const base = process.env.ENGINE_URL.replace(/\/+$/, '')
const sb = process.env.SUPABASE_URL
const key = process.env.SUPABASE_ANON_KEY
// This file is at loop8/evidences/poc/2026-11-21/, four levels below the repository root.
const root = fileURLToPath(new URL('../../../../', import.meta.url))

const rest = async (path) => {
  const r = await fetch(`${sb}/rest/v1/${path}`, { headers: { apikey: key, authorization: `Bearer ${key}` } })
  if (!r.ok) throw new Error(`supabase ${r.status}`)
  return r.json()
}
const profiles = await rest('profiles?select=id,name&approval_status=eq.approved&subscription_status=eq.active&consultant_type=eq.Individual&limit=1000')
const names = new Map(profiles.map((p) => [p.id, p.name]))
const expectations = JSON.parse(readFileSync(`${root}/docs/samples/expectations.json`, 'utf8'))
const tor = expectations.tors[0]
const jdText = readFileSync(`${root}/docs/samples/${tor.file.split('/').pop()}`, 'utf8')

const body = JSON.stringify({
  jobDescriptionId: 'manual-real-run-1',
  requirements: tor.requirements,
  poolIds: profiles.map((p) => p.id),
  jdText,
})
console.log(`pool ${profiles.length} profiles, ToR ${tor.id}, ${tor.requirements.length} requirement rows`)

const started = Date.now()
const post = await fetch(`${base}/jobs`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'idempotency-key': `real-${Date.now()}` },
  body,
})
console.log('POST /jobs', post.status)
if (post.status !== 202) {
  console.log((await post.text()).slice(0, 400))
  process.exit(1)
}
const { jobId } = await post.json()

let job
let last = ''
while (true) {
  if (Date.now() - started > 300000) throw new Error('timed out after 300 s')
  const r = await fetch(`${base}/jobs/${jobId}`)
  job = await r.json()
  const line = `${job.state} ${job.progress ? `${job.progress.done}/${job.progress.total}` : ''}`
  if (line !== last) console.log(`+${((Date.now() - started) / 1000).toFixed(1)}s ${line}`)
  last = line
  if (['DONE', 'PARTIAL', 'FAILED'].includes(job.state)) break
  await new Promise((r) => setTimeout(r, 1500))
}
console.log('final state', job.state, 'errorCode', job.errorCode ?? '-', 'endToEndMs', job.endToEndMs)
if (job.state === 'FAILED') process.exit(2)

const result = await (await fetch(job.resultUrl)).json()
console.log('modelIds', JSON.stringify(result.modelIds), 'promptVersion', result.promptVersion)
console.log('fallbacks', JSON.stringify(result.fallbacks).slice(0, 200))
for (const p of job.record ?? result.record ?? []) {
  const f = ['phase', 'durationMs', 'calls', 'tokensIn', 'tokensOut', 'throttles', 'retries', 'fallbacks', 'skipped']
    .filter((k) => p[k] !== undefined).map((k) => `${k}=${p[k]}`).join(' ')
  console.log('  record', f)
}
const top = result.results.slice(0, 10)
console.log('top 10')
for (const r of top) {
  console.log(`  #${r.rank} ${names.get(r.profile_id) ?? r.profile_id} fit=${r.fit_score} total=${r.total_score} band=${r.band}`)
}
const first = top[0]
console.log('narrative #1:', first.narrative.slice(0, 380))
const flagged = result.results.filter((r) => /estimate/i.test(r.narrative)).length
console.log(`results ${result.results.length}, with an estimate note ${flagged}`)
console.log('expected top (fixture):', JSON.stringify(tor.expected_top))
