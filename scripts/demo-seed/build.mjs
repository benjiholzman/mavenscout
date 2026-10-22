// Builds supabase/007_seed_demo_profiles_{1..4}.sql from scripts/demo-seed/data/*.mjs.
//
//   node scripts/demo-seed/build.mjs           validate + write the SQL files
//   node scripts/demo-seed/build.mjs --check   validate only
//
// Validation fails the build on anything that would make the demo data
// inconsistent: unknown taxonomy names, tag caps, non-canonical countries or
// languages, wrong mix of types / regions / tiers, missing taxonomy coverage.
//
// Data entry shape (one object per profile):
//   slug, name, type ('Individual' | 'Small Firm' | 'Large Firm'),
//   level ('early_career' | 'mid_career' | 'senior', individuals) or founded (firms),
//   headline, city, country, languages[], work[] (Remote / On-site / Hybrid),
//   pt / ft availability: ['now'] | ['now', untilDays] | ['from', fromDays] |
//     ['from', fromDays, untilDays] | ['off']   (days relative to current_date)
//   updated (days since availability was last edited), premium, pending,
//   eligibility, bio,
//   expertise / skills: ['P:Name', 'S:Name'] (level inferred from the taxonomy),
//   accreditations: [[name, issuing_org, year, credential?]],
//   history: [[org, role, start, end|null, description]],
//   education: [[institution, degree, start, end]],
//   additional: [[org, role, start, end|null, description]],
//   portfolio: [{ name, org, years: [start, end|null], role, desc, results,
//                 images: [caption, ...], links: [[label, url], ...] }]

import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { COUNTRIES, LANGUAGES, LOGO_PREFIXES, REGION_TARGETS, regionGroup } from './vocab.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const checkOnly = process.argv.includes('--check')

// ---- taxonomy, read from the seed file (single source of truth) -------------

function loadTaxonomy() {
  const sql = readFileSync(join(root, 'supabase', '001_seed_taxonomy.sql'), 'utf8')
  const categories = new Map() // name → type
  for (const m of sql.matchAll(/\('(domain_expertise|technical_skills)', '([^']+)', \d+\)/g)) categories.set(m[2], m[1])
  const items = new Map() // item name → category name
  for (const m of sql.matchAll(/\(VALUES ([\s\S]*?)\) AS v\(name, sort_order\)\s*WHERE taxonomy_categories\.type = '(\w+)' AND taxonomy_categories\.name = '([^']+)'/g)) {
    if (m[2] === 'work_arrangement') continue
    for (const it of m[1].matchAll(/\('([^']+)',\d+\)/g)) items.set(it[1], m[3])
  }
  return { categories, items }
}

// ---- load data ----------------------------------------------------------------

const dataDir = join(here, 'data')
const files = readdirSync(dataDir).filter((f) => f.endsWith('.mjs')).sort()
const profiles = []
for (const f of files) {
  const mod = await import(pathToFileURL(join(dataDir, f)).href)
  for (const p of mod.default) profiles.push({ ...p, _file: f })
}

// ---- validate -----------------------------------------------------------------

const tax = loadTaxonomy()
const errors = []
const err = (p, msg) => errors.push(`${p?.slug ?? '?'} (${p?._file ?? '?'}): ${msg}`)
const words = (s) => s.trim().split(/\s+/).length

const kindOf = (name) => (tax.categories.has(name) ? tax.categories.get(name) : tax.categories.get(tax.items.get(name)))
const parseTag = (t) => ({ tier: t.startsWith('P:') ? 'primary' : 'secondary', name: t.slice(2) })

const seen = new Set()
const seenNames = new Set()
for (const p of profiles) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug ?? '')) err(p, 'bad slug')
  if (seen.has(p.slug)) err(p, 'duplicate slug')
  if (seenNames.has(p.name)) err(p, 'duplicate name')
  seen.add(p.slug)
  seenNames.add(p.name)
  const firm = p.type !== 'Individual'
  if (!['Individual', 'Small Firm', 'Large Firm'].includes(p.type)) err(p, `bad type ${p.type}`)
  if (!firm && !['early_career', 'mid_career', 'senior'].includes(p.level)) err(p, 'individual needs a level')
  if (firm && (p.level || !Number.isInteger(p.founded))) err(p, 'firm needs founded and no level')
  if (!p.headline || p.headline.length > 120) err(p, `headline length ${p.headline?.length}`)
  if (!(p.country in COUNTRIES)) err(p, `non-canonical country "${p.country}"`)
  if (!p.city || p.city.includes(',')) err(p, `bad city "${p.city}"`)
  for (const l of p.languages ?? []) if (!LANGUAGES.includes(l)) err(p, `non-canonical language "${l}"`)
  if (!p.languages?.length) err(p, 'no languages')
  for (const w of p.work ?? []) if (!['Remote', 'On-site', 'Hybrid'].includes(w)) err(p, `bad work type ${w}`)
  if (!p.work?.length) err(p, 'no work types')
  for (const track of [p.pt, p.ft]) if (!Array.isArray(track) || !['now', 'from', 'off'].includes(track[0])) err(p, 'bad availability track')
  if (!Number.isInteger(p.updated) || p.updated < 0) err(p, 'bad updated')
  const bw = words(p.bio ?? '')
  if (bw < 80 || bw > 175) err(p, `bio is ${bw} words`)
  if (p.premium && p.pending) err(p, 'premium and pending')
  for (const kind of ['expertise', 'skills']) {
    const want = kind === 'expertise' ? 'domain_expertise' : 'technical_skills'
    const tags = (p[kind] ?? []).map(parseTag)
    if (tags.length === 0) err(p, `no ${kind}`)
    if (tags.filter((t) => t.tier === 'primary').length > 2) err(p, `>2 primary ${kind}`)
    if (tags.filter((t) => t.tier === 'secondary').length > 4) err(p, `>4 secondary ${kind}`)
    if (new Set(tags.map((t) => t.name)).size !== tags.length) err(p, `duplicate ${kind} tag`)
    for (const t of tags) if (kindOf(t.name) !== want) err(p, `unknown ${kind} tag "${t.name}"`)
  }
  const pf = p.portfolio ?? []
  if (pf.length < 2 || pf.length > 3) err(p, `${pf.length} portfolio items`)
  for (const it of pf) {
    if (!it.name || !it.org || !it.role || !it.desc || !it.results) err(p, `incomplete portfolio item "${it.name}"`)
    if (!it.images?.length || it.images.length > 3) err(p, `portfolio "${it.name}" needs 1–3 images`)
    if ((it.links ?? []).length > 2) err(p, `portfolio "${it.name}" has >2 links`)
    const [s, e] = it.years ?? []
    if (!Number.isInteger(s) || (e !== null && (!Number.isInteger(e) || e < s)) || s > 2026) err(p, `portfolio "${it.name}" bad years`)
  }
  const hist = p.history ?? []
  if (!firm && (hist.length < 2 || hist.length > 4)) err(p, `${hist.length} work-history entries`)
  if (firm && hist.length) err(p, 'firms carry no work history')
  for (const h of hist) if (h.length !== 5 || (h[3] !== null && h[3] < h[2])) err(p, `bad history entry ${h[0]}`)
  if (!firm && !(p.education ?? []).length) err(p, 'individual needs education')
  const all = JSON.stringify(p)
  if (all.includes('$$')) err(p, 'contains $$')
}

// Mix and coverage
const count = (f) => profiles.filter(f).length
const expectEq = (label, got, want) => got !== want && errors.push(`mix: ${label} is ${got}, want ${want}`)
const expectNear = (label, got, want, tol) =>
  Math.abs(got - want) > tol && errors.push(`mix: ${label} is ${got}, want ${want}±${tol}`)

const complete = profiles.length === 100
if (complete) {
  expectEq('profiles', profiles.length, 100)
  expectEq('Individual', count((p) => p.type === 'Individual'), 80)
  expectEq('Small Firm', count((p) => p.type === 'Small Firm'), 12)
  expectEq('Large Firm', count((p) => p.type === 'Large Firm'), 8)
  expectEq('Premium', count((p) => p.premium), 30)
  expectEq('pending', count((p) => p.pending), 3)
  expectNear('early_career', count((p) => p.level === 'early_career'), 18, 3)
  expectNear('mid_career', count((p) => p.level === 'mid_career'), 32, 3)
  expectNear('senior', count((p) => p.level === 'senior'), 30, 3)
  expectNear('stale (≥200 days)', count((p) => p.updated >= 200), 15, 2)
  expectNear('fresh (≤30 days)', count((p) => p.updated <= 30), 60, 6)
  const byRegion = {}
  for (const p of profiles) {
    const g = regionGroup(COUNTRIES[p.country] ?? '?')
    byRegion[g] = (byRegion[g] ?? 0) + 1
  }
  for (const [g, n] of Object.entries(REGION_TARGETS)) expectNear(`region ${g}`, byRegion[g] ?? 0, n, 1)
  for (const g of Object.keys(byRegion)) if (!(g in REGION_TARGETS)) errors.push(`mix: unexpected region ${g}`)

  const used = new Set(profiles.flatMap((p) => [...p.expertise, ...p.skills].map((t) => t.slice(2))))
  for (const name of [...tax.categories.keys(), ...tax.items.keys()]) {
    const covered = used.has(name) || (tax.categories.has(name) && [...tax.items].some(([i, c]) => c === name && used.has(i)))
    if (!covered) errors.push(`coverage: "${name}" never tagged`)
  }
  for (const name of tax.items.keys()) if (!used.has(name)) errors.push(`coverage: item "${name}" never tagged`)
  const generalists = profiles.filter((p) => [...p.expertise, ...p.skills].some((t) => tax.categories.has(t.slice(2))))
  const catLevel = new Set(profiles.flatMap((p) => [...p.expertise, ...p.skills].map((t) => t.slice(2)).filter((n) => tax.categories.has(n))))
  if (generalists.length < 10) errors.push(`coverage: only ${generalists.length} category-level taggers`)
  if (catLevel.size < 8) errors.push(`coverage: category-level tags span only ${catLevel.size} categories`)
}

console.log(`${profiles.length} profiles from ${files.length} files`)
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n` + errors.map((e) => `  - ${e}`).join('\n'))
  process.exit(1)
}
if (!complete) console.log('(partial dataset: mix and coverage checks skipped until there are 100)')
if (checkOnly) process.exit(0)
if (!complete) {
  console.error('Not writing SQL until all 100 profiles exist.')
  process.exit(1)
}

// ---- emit SQL -------------------------------------------------------------------

const handleOf = (p) => `demo-${p.slug}`
function idOf(handle) {
  const h = createHash('sha1').update(`mavenscout-demo:${handle}`).digest('hex')
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`
}
const q = (s) => (s === null || s === undefined ? 'NULL' : `$$${s}$$`)
const jsonb = (v) => `$$${JSON.stringify(v)}$$::jsonb`
const textArr = (xs) => `ARRAY[${xs.map(q).join(', ')}]::text[]`
const day = (n) => `(current_date ${n < 0 ? '-' : '+'} ${Math.abs(n)})::text`

function track(t) {
  const [status, a, b] = t
  if (status === 'off') return `jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL)`
  if (status === 'now')
    return `jsonb_build_object('status', 'available_now', 'from', NULL, 'until', ${a === undefined || a === null ? 'NULL' : day(a)})`
  return `jsonb_build_object('status', 'available_from', 'from', ${day(a)}, 'until', ${b === undefined || b === null ? 'NULL' : day(b)})`
}

const logoFor = (org) => {
  const hit = LOGO_PREFIXES.find(([prefix]) => org.startsWith(prefix))
  return hit ? `https://cdn.brandfetch.io/${hit[1]}` : null
}

const tagsJson = (tags) =>
  tags.map(parseTag).map((t) => ({ name: t.name, tier: t.tier, level: tax.categories.has(t.name) ? 'category' : 'item' }))

const COLUMNS = [
  'id', 'user_id', 'consultant_type', 'handle', 'name', 'headline', 'location', 'career_level', 'year_founded',
  'contracting_work_eligibility', 'work_types', 'part_time_availability', 'full_time_availability',
  'availability_updated_at', 'photo_url', 'cover_image_url', 'detailed_bio', 'expertise', 'skills',
  'accreditations', 'languages', 'work_history', 'education_history', 'additional_experience',
  'is_premium', 'verification_status', 'subscription_status', 'approval_status', 'is_demo',
]

function profileSql(p) {
  const handle = handleOf(p)
  const values = [
    `'${idOf(handle)}'`,
    'NULL',
    q(p.type),
    q(handle),
    q(p.name),
    q(p.headline),
    q(`${p.city}, ${p.country}`),
    p.level ? q(p.level) : 'NULL',
    p.founded ?? 'NULL',
    q(p.eligibility ?? null),
    textArr(p.work),
    track(p.pt),
    track(p.ft),
    `now() - interval '${p.updated} days'`,
    q(`https://i.pravatar.cc/150?u=${handle}`),
    q(`https://picsum.photos/seed/${handle}/800/200`),
    q(p.bio.trim().replace(/\s+/g, ' ')),
    jsonb(tagsJson(p.expertise)),
    jsonb(tagsJson(p.skills)),
    jsonb((p.accreditations ?? []).map(([name, issuing_organization, year, cred]) => ({ name, issuing_organization, year, credential_id_or_url: cred ?? null }))),
    textArr(p.languages),
    jsonb((p.history ?? []).map(([organization, role, start_year, end_year, description]) => ({ organization, role, start_year, end_year, logo_url: logoFor(organization), description }))),
    jsonb((p.education ?? []).map(([institution, degree_or_course, start_year, end_year]) => ({ institution, degree_or_course, start_year, end_year, logo_url: null }))),
    jsonb((p.additional ?? []).map(([organization, role, start_year, end_year, description]) => ({ organization, role, start_year, end_year, description }))),
    p.premium ? 'true' : 'false',
    `'${p.premium ? 'verified' : p.pending ? 'pending' : 'unverified'}'`,
    `'active'`,
    `'approved'`,
    'true',
  ]
  const updates = COLUMNS.filter((c) => c !== 'id').map((c) => `${c} = EXCLUDED.${c}`).join(', ')
  return (
    `-- ${p.name} (${handle})\n` +
    `INSERT INTO profiles (${COLUMNS.join(', ')}) VALUES (\n  ${values.join(',\n  ')}\n)\n` +
    `ON CONFLICT (handle) DO UPDATE SET ${updates};\n`
  )
}

function portfolioSql(p) {
  const handle = handleOf(p)
  const rows = p.portfolio.map((it, i) => {
    const n = i + 1
    const images = it.images.map((caption, k) => ({ url: `https://picsum.photos/seed/${handle}-portfolio-${n}-img${k + 1}/900/600`, caption }))
    const links = (it.links ?? []).map(([label, url]) => ({ label, url }))
    return `  ((SELECT id FROM profiles WHERE handle = ${q(handle)}), ${q(it.name)}, ${q(it.org)}, ${it.years[0]}, ${it.years[1] ?? 'NULL'}, ${q(it.role)}, ${q(it.desc)}, ${q(it.results)}, ${q(`https://picsum.photos/seed/${handle}-portfolio-${n}/600/400`)}, ${jsonb(images)}, ${jsonb(links)}, ${n})`
  })
  return `INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES\n${rows.join(',\n')};\n`
}

const PARTS = 4
const per = Math.ceil(profiles.length / PARTS)
for (let part = 0; part < PARTS; part++) {
  const slice = profiles.slice(part * per, (part + 1) * per)
  const handles = slice.map((p) => q(handleOf(p))).join(', ')
  const sql =
    `-- 007 (part ${part + 1} of ${PARTS}): synthetic demo profiles — GENERATED, do not edit by hand.\n` +
    `-- Source: scripts/demo-seed/data/*.mjs → node scripts/demo-seed/build.mjs\n` +
    `--\n` +
    `-- Run in the Supabase SQL editor after 006_demo_flag.sql, parts 1 → ${PARTS}.\n` +
    `-- Idempotent: profiles upsert on handle (fixed ids), and this part's portfolio\n` +
    `-- items are deleted and re-inserted. Re-running converges to the seed.\n` +
    `-- Every profile here is fictional, is_demo = true, handle prefixed demo-.\n` +
    `-- Remove all demo data with supabase/purge_demo.sql.\n\n` +
    `DO $check$ BEGIN\n` +
    `  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_demo') THEN\n` +
    `    RAISE EXCEPTION 'profiles.is_demo is missing: run supabase/006_demo_flag.sql first';\n` +
    `  END IF;\n` +
    `END $check$;\n\n` +
    `BEGIN;\n\n` +
    slice.map(profileSql).join('\n') +
    `\n-- Portfolio items for this part: replace wholesale.\n` +
    `DELETE FROM portfolio_items WHERE profile_id IN (SELECT id FROM profiles WHERE handle IN (${handles}));\n\n` +
    slice.map(portfolioSql).join('\n') +
    `\nCOMMIT;\n`
  const out = join(root, 'supabase', `007_seed_demo_profiles_${part + 1}.sql`)
  writeFileSync(out, sql)
  console.log(`wrote ${out.slice(root.length + 1)} (${slice.length} profiles, ${(sql.length / 1024).toFixed(0)} KB)`)
}
