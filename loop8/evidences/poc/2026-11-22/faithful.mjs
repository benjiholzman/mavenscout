// Runs the five sample ToRs and checks each AI summary of the top five against the stored numbers and adjustment rows.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const base = process.env.ENGINE_URL.replace(/\/+$/, '')
const sb = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY
// This file is at loop8/evidences/poc/2026-11-22/, four levels below the repository root.
const root = fileURLToPath(new URL('../../../../', import.meta.url))
const rest = async (p) => (await fetch(`${sb}/rest/v1/${p}`, { headers: { apikey: key, authorization: `Bearer ${key}` } })).json()
const profiles = await rest('profiles?select=id,name&approval_status=eq.approved&subscription_status=eq.active&consultant_type=eq.Individual&limit=1000')
const nameOf = new Map(profiles.map((p) => [p.id, p.name]))
const tors = JSON.parse(readFileSync(root + 'docs/samples/expectations.json', 'utf8')).tors
const stats = { checked: 0, template: 0, numbersOk: 0, numbersBad: 0, overclaim: 0, firstWordThe: 0, proven: 0, fitExcluded: 0, words: [] }
const issues = []
for (const tor of tors) {
  const jdText = readFileSync(root + 'docs/samples/' + tor.file.split('/').pop(), 'utf8')
  const post = await fetch(`${base}/jobs`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': `faith-${tor.id}-${Date.now()}` }, body: JSON.stringify({ jobDescriptionId: 'manual-faith-check', requirements: tor.requirements, poolIds: profiles.map((p) => p.id), jdText }) })
  const { jobId } = await post.json()
  let job
  while (true) { job = await (await fetch(`${base}/jobs/${jobId}`)).json(); if (['DONE', 'PARTIAL', 'FAILED'].includes(job.state)) break; await new Promise((r) => setTimeout(r, 1500)) }
  const result = await (await fetch(job.resultUrl)).json()
  for (const r of result.results.slice(0, 5)) {
    stats.checked++
    const n = r.narrative
    if (/standard summary/.test(n)) { stats.template++; continue }
    stats.words.push(n.split(/\s+/).length)
    const notMet = r.adjustments.filter((a) => a.outcome !== 'met')
    const total = (n.match(/total (?:score )?of (\d+)/i) ?? [])[1]
    const fit = (n.match(/fit(?: score)? (?:of|is) (\d+)/i) ?? [])[1]
    const bad = []
    if (total !== undefined && Number(total) !== r.total_score) bad.push(`total says ${total}, data ${r.total_score}`)
    if (fit !== undefined && Number(fit) !== r.fit_score) bad.push(`fit says ${fit}, data ${r.fit_score}`)
    if (bad.length) stats.numbersBad++; else stats.numbersOk++
    if (/(met|meets|meeting) all (?:\w+[- ])?(?:priority|priorities|rows|must)|all priority rows|all priorities/i.test(n) && notMet.length > 0) {
      stats.overclaim++; issues.push(`${tor.id} #${r.rank} ${nameOf.get(r.profile_id)}: says all priorities met, data has ${notMet.length} not fully met (${notMet.map((a) => a.label + ':' + a.outcome).join(', ')})\n      "${n}"`)
    }
    if (/^The candidate ranks/.test(n)) stats.firstWordThe++
    if (/proven/i.test(n)) stats.proven++
    if (/fit[^.]*\b(location|language|career level|seniority|employer|based in)\b/i.test(n.split('.').find((s) => /fit/i.test(s)) ?? '')) { stats.fitExcluded++; issues.push(`${tor.id} #${r.rank}: Fit sentence names an excluded attribute: "${n.split('.').find((s) => /fit/i.test(s))}"`) }
    if (bad.length) issues.push(`${tor.id} #${r.rank} ${nameOf.get(r.profile_id)}: ${bad.join('; ')}`)
  }
}
const real = stats.checked - stats.template
console.log(`top five summaries checked: ${stats.checked}, template fallback: ${stats.template}, real text: ${real}`)
console.log(`numbers match the data: ${stats.numbersOk} of ${real} (wrong: ${stats.numbersBad})`)
console.log(`claims that every priority was met while one was not: ${stats.overclaim}`)
console.log(`Fit sentence naming an excluded attribute (location, language, career level, employer): ${stats.fitExcluded}`)
console.log(`start with "The candidate ranks": ${stats.firstWordThe} of ${real}; use the word "proven": ${stats.proven} of ${real}`)
console.log(`words: min ${Math.min(...stats.words)} max ${Math.max(...stats.words)} average ${(stats.words.reduce((a, b) => a + b, 0) / stats.words.length).toFixed(1)}`)
console.log('\nISSUES:'); for (const i of issues) console.log(' - ' + i)
