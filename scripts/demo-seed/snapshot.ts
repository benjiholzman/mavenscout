// Read-only snapshot of the live demo data, taken before the step 5 re-seed
// (docs/MavenScout-profiles-membership.md §13 step 5).
//
//   npm run demo:snapshot -- <out.json>
//
// SELECTs only (and Storage listings). Writes the rows to <out.json> and
// prints a summary: per-profile tier / language / portfolio counts against
// the current minimums, and every testimonial, video, verification and
// evidence row on demo profiles (what 018 will clear and re-seed).

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const out = process.argv[2]
if (!out) {
  console.error('usage: npm run demo:snapshot -- <out.json>')
  process.exit(1)
}

function readEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return env
}
const env = readEnv()
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function select(table: string): Promise<any[]> {
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select('*').range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

async function listBucket(bucket: string): Promise<string[]> {
  // Uploads live at <profileId>/<uuid>.<ext>: list the top level, then each folder.
  const { data: top, error } = await db.storage.from(bucket).list('', { limit: 1000 })
  if (error) return [`(list failed: ${error.message})`]
  const paths: string[] = []
  for (const entry of top ?? []) {
    if (entry.id) {
      paths.push(entry.name)
      continue
    }
    const { data: inner } = await db.storage.from(bucket).list(entry.name, { limit: 1000 })
    for (const f of inner ?? []) paths.push(`${entry.name}/${f.name}`)
  }
  return paths
}

const tables = [
  'profiles', 'portfolio_items', 'audio_testimonials', 'testimonial_events', 'video_responses',
  'verification_checks', 'verification_evidence', 'interview_questions', 'hiring_managers',
  'openings', 'opening_entries', 'organizations', 'languages', 'taxonomy_items', 'taxonomy_categories',
]
const data: Record<string, any[]> = {}
for (const t of tables) data[t] = await select(t)
const counts = {
  job_descriptions: (await db.from('job_descriptions').select('id', { count: 'exact', head: true })).count,
  match_results: (await db.from('match_results').select('id', { count: 'exact', head: true })).count,
}
const storage = { 'audio-testimonials': await listBucket('audio-testimonials'), videos: await listBucket('videos') }
writeFileSync(out, JSON.stringify({ taken_at: new Date().toISOString(), counts, storage, ...data }, null, 1))

// ---- summary ------------------------------------------------------------------

const demo = data.profiles.filter((p) => p.is_demo)
const listed = demo.filter((p) => p.approval_status === 'approved' && p.subscription_status === 'active' && p.consultant_type === 'Individual')
const demoIds = new Set(demo.map((p) => p.id))
const pf = new Map<string, number>()
for (const it of data.portfolio_items) pf.set(it.profile_id, (pf.get(it.profile_id) ?? 0) + 1)
const tier = (p: any, t: string) => (p.tiered_expertise ?? []).filter((e: any) => e.tier === t).length

console.log(`profiles: ${data.profiles.length} total, ${demo.length} is_demo, ${listed.length} listed demo individuals`)
console.log(`non-demo profiles: ${data.profiles.filter((p) => !p.is_demo).map((p) => p.handle).join(', ') || 'none'}`)
console.log(`job_descriptions ${counts.job_descriptions}, match_results ${counts.match_results}`)
console.log('\nhandle | core/strong/working | langs (working) | portfolio | bio chars | premium')
for (const p of listed.sort((a, b) => a.handle.localeCompare(b.handle))) {
  const langs = p.spoken_languages ?? []
  console.log(
    `${p.handle} | ${tier(p, 'core')}/${tier(p, 'strong')}/${tier(p, 'working')} | ${langs.length} (${langs.filter((l: any) => l.proficiency === 'working').length}) | ${pf.get(p.id) ?? 0} | ${(p.detailed_bio ?? '').trim().length} | ${p.is_premium}`,
  )
}
const onDemo = (t: string) => data[t].filter((r) => demoIds.has(r.profile_id))
const handleOf = new Map(data.profiles.map((p) => [p.id, p.handle]))
console.log('\naudio_testimonials on demo profiles:')
for (const t of onDemo('audio_testimonials'))
  console.log(`  ${handleOf.get(t.profile_id)} · ${t.status} · ${t.referee_email ? 'flow' : 'legacy'} · ${t.reference_name ?? '—'} · ${t.audio_path ?? 'no audio'} · ${t.created_at}`)
console.log(`video_responses on demo profiles: ${onDemo('video_responses').length}`)
for (const v of onDemo('video_responses')) console.log(`  ${handleOf.get(v.profile_id)} · ${v.video_path ?? v.video_url}`)
console.log(`verification_checks on demo profiles: ${onDemo('verification_checks').length}`)
console.log(`verification_evidence on demo profiles: ${onDemo('verification_evidence').length}`)
console.log(`hiring_managers: ${data.hiring_managers.map((h) => `${h.name} <${h.email ?? '—'}> ${h.account_status}`).join('; ')}`)
console.log(`storage audio-testimonials: ${storage['audio-testimonials'].length} objects; videos: ${storage.videos.length} objects`)
console.log(`\nwrote ${out}`)
