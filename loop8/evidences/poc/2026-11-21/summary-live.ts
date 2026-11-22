// Live check of the summary prompt (summary-v2) with the real text model. Takes real candidates of a stored job
// result and their index fragments, asks Fit for a reason as the engine does, then writes the summary.
// Reads: a result json, the index artifact, the ToR text. Calls: Bedrock Converse (Nova Lite), about 0.002 USD a run.
// Usage: bundle with esbuild next to loop8/engine, then
//   node summary-live.mjs <result.json> <index-artifact.json> docs/samples/tor-01-ethiopia-nutrition.txt 20
import { readFileSync } from 'node:fs'
import { createBedrockTextModel } from '../../../engine/src/models/text-model'
import { judgeFit } from '../../../engine/src/stage2/fit'
import { summaryProblems, writeSummary, SUMMARY_PROMPT_VERSION } from '../../../engine/src/stage2/summary'

const MODEL = 'us.amazon.nova-lite-v1:0'
const [resultPath, indexPath, torPath, countArg] = process.argv.slice(2)
const result = JSON.parse(readFileSync(resultPath, 'utf8'))
const index = JSON.parse(readFileSync(indexPath, 'utf8'))
const tor = readFileSync(torPath, 'utf8')
const byProfile = new Map<string, { fragmentId: string; type: string; text: string }[]>()
for (const f of index.fragments) {
  const list = byProfile.get(f.profileId) ?? []
  if (['portfolio', 'bio', 'tagline', 'work_history'].includes(f.type)) list.push({ fragmentId: f.fragmentId, type: f.type, text: f.text })
  byProfile.set(f.profileId, list)
}
const all = result.results as any[]
const n = Number(countArg ?? 20)
// the top candidates and an even spread below them, so every band is covered
const picks = [...all.slice(0, Math.ceil(n / 2)), ...Array.from({ length: Math.floor(n / 2) }, (_, i) => all[10 + Math.floor((i * (all.length - 10)) / Math.floor(n / 2))])]
const base = createBedrockTextModel({ region: 'us-east-1' })
console.log(`prompt ${SUMMARY_PROMPT_VERSION}, model ${MODEL}, ${picks.length} candidates of a result with ${all.length}`)
let firstOk = 0, secondOk = 0, thirdOk = 0, failed = 0, tokensIn = 0, tokensOut = 0
const wordsOk: number[] = []
const firstProblems: string[] = []
for (const [i, c] of picks.entries()) {
  const frags = (byProfile.get(c.profile_id) ?? []).slice(0, 4)
  const replies: string[] = []
  const model = async (req: any) => { const r = await base(req); replies.push(r.text.trim()); return r }
  const fit = await judgeFit(model as any, MODEL, { jdQuery: tor, fragments: frags })
  replies.length = 0
  try {
    const out = await writeSummary(model as any, MODEL, {
      fit: c.fit_score, total: c.total_score, band: c.band, adjustments: c.adjustments,
      mustHaves: (c.must_haves_passed ?? []).map((m: any) => m.label), reason: fit.reason,
      fragments: frags.map((f) => ({ type: f.type, text: f.text })),
    })
    tokensIn += out.inputTokens; tokensOut += out.outputTokens
    const w = out.text.split(/\s+/).filter(Boolean).length
    wordsOk.push(w)
    if (replies.length === 1) firstOk++; else { secondOk++; if (replies.length === 3) thirdOk++; firstProblems.push(summaryProblems(replies[0], c.band).map((p) => p.code === 'too_long' || p.code === 'too_short' ? `${p.code}:${(p as any).words}` : p.code).join('+')) }
    console.log(`#${String(i + 1).padStart(2)} ${c.band.padEnd(7)} fit=${fit.fit} tries=${replies.length} words=${w} dash=${/[—–]|--| - /.test(out.text)}`)
    if (i < 3) console.log('    ' + out.text)
  } catch (e) {
    failed++
    firstProblems.push('FAILED ' + (e as Error).message + ' first reply problems: ' + summaryProblems(replies[0] ?? '', c.band).map((p) => p.code).join('+'))
    console.log(`#${String(i + 1).padStart(2)} ${c.band.padEnd(7)} fit=${fit.fit} FAILED ${(e as Error).message} first=${(replies[0] ?? '').split(/\s+/).filter(Boolean).length} second=${(replies[1] ?? "").split(/\s+/).filter(Boolean).length}`)
  }
}
const avg = wordsOk.length ? (wordsOk.reduce((a, b) => a + b, 0) / wordsOk.length).toFixed(1) : 'n/a'
console.log(`\npassed at the first try: ${firstOk}, after retries: ${secondOk} (of them at the third try: ${thirdOk}), fell back: ${failed} of ${picks.length}`)
console.log(`words of the accepted summaries: min ${Math.min(...wordsOk)} max ${Math.max(...wordsOk)} average ${avg}`)
console.log(`summary tokens in ${tokensIn} out ${tokensOut} (summary calls only, both tries)`)
console.log('problems of the rejected first replies:', JSON.stringify(firstProblems))
