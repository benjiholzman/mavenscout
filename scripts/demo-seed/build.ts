// Step 5 re-seed (docs/MavenScout-profiles-membership.md §13 step 5): builds
// supabase/018_reseed_demo_*.sql from scripts/demo-seed/profiles/*.mjs.
//
//   npm run demo:build             validate + write the SQL files
//   npm run demo:build -- --check  validate only
//
// Every profile is checked with the app's own rules before anything is
// written: the completeness rules (bio, tiers, languages, portfolio per
// membership level, the employer testimonial), verification labels, the
// testimonial confirmation line, the referee email rules, Featured status
// and the listing rule. Fingerprints come from src/lib/verification/items.ts
// and go into the SQL as literals. A baseline guard keeps every profile's
// role in docs/samples/expectations.json (see guard() below).
//
// The old seed (supabase/007_*, scripts/demo-seed/data + build-007.mjs) is
// frozen history; this replaces its output on existing databases.

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { completenessGaps } from '../../src/lib/completeness'
import { isListed } from '../../src/lib/listing'
import { isFeatured, withVideoQnaStatus } from '../../src/lib/membership'
import { buildOrgIndex, normalizeOrgName, resolveOrganization } from '../../src/lib/organizations'
import { checkRefereeEmail } from '../../src/lib/testimonials/integrity'
import { confirmationLine, visibleTestimonials } from '../../src/lib/testimonials/display'
import {
  certificationSummary,
  degreeSummary,
  employerSummary,
  entryFingerprint,
  identityFingerprint,
  mostRecentDegree,
  mostRecentEmployer,
} from '../../src/lib/verification/items'
import { profileLabels, verificationState } from '../../src/lib/verification/state'
import { AUDIO_CLIPS, VIDEO_CLIPS } from './media-clips.mjs'

const root = process.cwd()
const here = join(root, 'scripts', 'demo-seed')
const checkOnly = process.argv.includes('--check')
const sql = (f: string) => readFileSync(join(root, 'supabase', f), 'utf8')

// Matches DEMO_ADMIN_NAME in src/lib/session.tsx (not imported: it pulls in React).
const ADMIN = 'Demo Admin'
const NOW = new Date()
const DAY = 86_400_000
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString()

// ---- reference lists, read from the migrations (single source of truth) -------

const orgRows = [...sql('009_organizations.sql').matchAll(/\(\$\$([^$]+)\$\$, (ARRAY\[[^\]]*\]|'\{\}'::text\[\]), (ARRAY\[[^\]]*\]|'\{\}'::text\[\]), '(\w+)'\)/g)].map((m) => ({
  id: m[1], // the name stands in for the uuid; the SQL looks organizations up by name
  name: m[1],
  aliases: [...m[2].matchAll(/\$\$([^$]+)\$\$/g)].map((x) => x[1]),
  domains: [...m[3].matchAll(/\$\$([^$]+)\$\$/g)].map((x) => x[1]),
  type: m[4],
  logo_url: null,
  created_at: '2026-10-01T00:00:00Z',
}))
const orgs = buildOrgIndex(orgRows as any)
const expertiseItems = new Map(
  [...sql('011_unified_expertise.sql').matchAll(/\(\$\$([^$]+)\$\$, \$\$([^$]+)\$\$, \d+, \$\$(\w+)\$\$, /g)].map((m) => [m[2], { group: m[1], kind: m[3] }]),
)
const languageNames = new Set([...sql('010_languages.sql').matchAll(/\(\$\$([^$]+)\$\$\)/g)].map((m) => m[1]))
const QUESTION_IDS = [1, 2, 3, 4, 5].map((n) => `question-${n}`) // stand-ins; SQL looks them up by sort_order
const expectations = JSON.parse(readFileSync(join(root, 'docs', 'samples', 'expectations.json'), 'utf8'))
const before: Record<string, { tiers: Record<string, string[]>; languages: [string, string][] }> = JSON.parse(
  readFileSync(join(here, 'before-reseed.json'), 'utf8'),
)

// ---- ids --------------------------------------------------------------------------

/** Deterministic uuid (v5-shaped), as scripts/demo-seed/build-007.mjs's idOf. */
function uuid(key: string): string {
  const h = createHash('sha1').update(`mavenscout-demo:${key}`).digest('hex')
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`
}
const hex = (key: string) => createHash('sha256').update(`mavenscout-demo-token:${key}`).digest('hex').slice(0, 32)
const slugify = (s: string) => normalizeOrgName(s).replace(/ /g, '-').slice(0, 40)

// ---- load + normalize -------------------------------------------------------------

type Tuple = (string | number | null)[]
const files = readdirSync(join(here, 'profiles')).filter((f) => f.endsWith('.mjs')).sort()
const raw: any[] = []
for (const f of files) {
  const mod = await import(pathToFileURL(join(here, 'profiles', f)).href)
  for (const p of mod.default) raw.push({ ...p, _file: f })
}

function availability(t: any) {
  if (!Array.isArray(t)) return { json: t, sql: `$$${JSON.stringify(t)}$$::jsonb` }
  const [status, a, b] = t as [string, number?, number?]
  const date = (n: number) => new Date(NOW.getTime() + n * DAY).toISOString().slice(0, 10)
  const day = (n: number) => `(current_date ${n < 0 ? '-' : '+'} ${Math.abs(n)})::text`
  if (status === 'off') return { json: { status: 'unavailable', from: null, until: null }, sql: `jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL)` }
  if (status === 'now')
    return {
      json: { status: 'available_now', from: null, until: a == null ? null : date(a) },
      sql: `jsonb_build_object('status', 'available_now', 'from', NULL, 'until', ${a == null ? 'NULL' : day(a)})`,
    }
  return {
    json: { status: 'available_from', from: date(a!), until: b == null ? null : date(b) },
    sql: `jsonb_build_object('status', 'available_from', 'from', ${day(a!)}, 'until', ${b == null ? 'NULL' : day(b)})`,
  }
}

const profiles = raw.map((p) => {
  const handle: string = p.handle ?? `demo-${p.slug}`
  const id: string = p.id ?? uuid(handle)
  const history = (p.history ?? []).map((h: any) =>
    Array.isArray(h)
      ? { id: uuid(`${handle}:work:${h[0]}:${h[1]}:${h[2]}`), organization: h[0], role: h[1], start_year: h[2], end_year: h[3], logo_url: null, description: h[4] }
      : h,
  )
  const education = (p.education ?? []).map((e: any) =>
    Array.isArray(e) ? { id: uuid(`${handle}:edu:${e[0]}:${e[1]}`), institution: e[0], degree_or_course: e[1], start_year: e[2], end_year: e[3], logo_url: null } : e,
  )
  const accreditations = (p.accreditations ?? []).map((a: any) =>
    Array.isArray(a)
      ? { id: uuid(`${handle}:cert:${a[0]}:${a[1]}`), name: a[0], issuing_organization: a[1], year: a[2], credential_id_or_url: a[3] ?? null }
      : a,
  )
  const portfolio = (p.portfolio ?? []).map((it: any, i: number) => ({
    id: it.id ?? uuid(`${handle}:portfolio:${it.name}`),
    project_name: it.name,
    organization: it.org,
    organization_id: resolveOrganization(orgs, it.org)?.name ?? null, // name; looked up in SQL
    start_year: it.years[0],
    end_year: it.years[1],
    role: it.role,
    description: it.desc,
    results: it.results ?? null,
    // Up to 3 (spec §7.2); the first is the cover. New items get picsum images.
    images: it.images
      .slice(0, 3)
      .map((im: any, k: number) =>
        typeof im === 'string' ? { url: `https://picsum.photos/seed/${handle}-${slugify(it.name)}-${k + 1}/900/600`, caption: im } : im,
      ),
    links: (it.links ?? []).map((l: any) => (Array.isArray(l) ? { label: l[0], url: l[1] } : l)),
    video_url: null,
    sort_order: i + 1,
  }))
  const pt = availability(p.pt)
  const ft = availability(p.ft)
  return {
    src: p,
    handle,
    id,
    isNew: !before[handle],
    profile: {
      id,
      user_id: null,
      consultant_type: 'Individual',
      handle,
      name: p.name,
      headline: p.headline,
      location: `${p.city}, ${p.country}`,
      career_level: p.level,
      year_founded: null,
      contracting_work_eligibility: p.eligibility ?? null,
      work_types: p.work,
      part_time_availability: pt.json,
      full_time_availability: ft.json,
      availability_updated_at: p.updatedAt ?? ago(p.updated),
      photo_url: '', // assigned below
      cover_image_url: p.cover ?? `https://picsum.photos/seed/${handle}/800/200`,
      detailed_bio: p.bio.trim(),
      tiered_expertise: (['core', 'strong', 'working'] as const).flatMap((tier) => (p.tiers[tier] ?? []).map((name: string) => ({ name, tier }))),
      spoken_languages: p.languages.map(([name, proficiency]: [string, string]) => ({ name, proficiency })),
      accreditations,
      work_history: history,
      education_history: education,
      additional_experience: (p.additional ?? []).map((a: any) =>
        Array.isArray(a) ? { organization: a[0], role: a[1], start_year: a[2], end_year: a[3], description: a[4] } : a,
      ),
      is_premium: !!p.featured,
      subscription_status: 'active',
      approval_status: 'approved',
      submitted_at: null as string | null,
      email: `${handle}@example.org`, // reserved domain (RFC 2606): never anyone's address
      testimonial_grace_until: null,
      verification_recheck_until: p.verify?.recheck ? new Date(NOW.getTime() + 18 * DAY).toISOString() : null,
      website_url: null,
      custom_domain: null,
      is_demo: true,
      video_qnas_complete: false,
    } as any,
    sqlAvailability: { pt: pt.sql, ft: ft.sql, updated: p.updatedAt ? `'${p.updatedAt}'::timestamptz` : `now() - interval '${p.updated} days'` },
    portfolio,
  }
})

// ---- photos: gender-matched, never repeated ---------------------------------------
// randomuser.me portraits (0–99 per gender). An entry's `photo` pins an index;
// the rest take the next free index in a fixed shuffled order, by profile id.

const shuffled = (g: string) =>
  [...Array(100).keys()].sort((a, b) => hex(`${g}:${a}`).localeCompare(hex(`${g}:${b}`)))
const pinned = new Map<string, Set<number>>([['F', new Set()], ['M', new Set()]])
for (const p of profiles) if (p.src.photo != null) pinned.get(p.src.gender)!.add(p.src.photo)
const order = { F: shuffled('women').filter((n) => !pinned.get('F')!.has(n)), M: shuffled('men').filter((n) => !pinned.get('M')!.has(n)) } as Record<string, number[]>
for (const p of [...profiles].sort((a, b) => a.id.localeCompare(b.id))) {
  const g = p.src.gender
  const n = p.src.photo ?? order[g].shift()
  p.profile.photo_url = `https://randomuser.me/api/portraits/${g === 'F' ? 'women' : 'men'}/${n}.jpg`
}

// ---- testimonials, Video Q&As, verification ---------------------------------------

// Members without an audio testimonial (it's optional for Members, required
// for Featured; config TESTIMONIAL_REQUIRED), so "Has audio testimonial" has
// something to filter: about 40% of Members. Never Featured, never a profile
// in the ranking baseline (named in docs/samples/expectations.json or in a
// t*-*.mjs test-case file), never the demo consultant (Amara). Their authored
// testimonial stays in the source; it's dropped here, after the audio clips
// are dealt out, so everyone else keeps the same clip.
const WITHOUT_TESTIMONIAL = new Set([
  'james-okafor', 'rohan-mehta', 'tariq-hassan',
  'demo-achta-mahamat-saleh', 'demo-aline-uwimana', 'demo-celso-mabunda', 'demo-edvania-kiala',
  'demo-grace-wanjiru-kamau', 'demo-kwabena-owusu-ansah', 'demo-lerato-mokoena',
  'demo-aigerim-toktogulova', 'demo-arjun-raghavan', 'demo-joana-ximenes-soares', 'demo-mehwish-tariq-khan',
  'demo-rajan-shrestha', 'demo-sherzod-yuldashev', 'demo-sushila-gurung-thapa',
  'demo-alvaro-choque-mendoza', 'demo-daniel-whitfield-okoro', 'demo-mariana-ospina-restrepo',
  'demo-rafael-tavares-moura', 'demo-rosa-quispe-mamani', 'demo-yokasta-feliz-matos',
  'demo-elif-kaya-demir', 'demo-jonas-weber-lindqvist', 'demo-kila-nangui', 'demo-losana-vakaloloma',
  'demo-oksana-melnyk-hrytsenko', 'demo-thomas-ashworth', 'demo-youssef-ben-amor',
])

let clip = 0
for (const p of profiles) {
  const prof = p.profile
  const submittedDaysAgo = Math.max(...(p.src.testimonials ?? []).map((t: any) => t.recorded + 5), 60)
  prof.submitted_at = p.src.submittedAt ?? ago(submittedDaysAgo + 20)
  ;(p as any).testimonials = (p.src.testimonials ?? []).map((t: any, i: number) => {
    const [where, index] = t.on
    const target = where === 'history' ? prof.work_history[index] : p.portfolio[index]
    const recorded = ago(t.recorded)
    const audio = AUDIO_CLIPS[clip++ % AUDIO_CLIPS.length]
    const domain = t.referee.email.split('@')[1]
    const refOrg = orgRows.find((o) => o.domains.some((d) => domain === d || domain.endsWith(`.${d}`)))
    return {
      id: uuid(`${p.handle}:testimonial:${i}`),
      profile_id: p.id,
      work_history_entry_id: where === 'history' ? target?.id ?? null : null,
      portfolio_item_id: where === 'portfolio' ? target?.id ?? null : null,
      reference_name: t.referee.name,
      reference_org: t.referee.org,
      reference_title: t.referee.title,
      relationship: t.relationship,
      referee_email: t.referee.email,
      referee_org_id: refOrg?.name ?? null, // name; looked up in SQL
      period_start: t.period[0],
      period_end: t.period[1],
      context: t.context,
      reference_date: null,
      verification_url: null,
      audio_path: `demo/${audio.name}`,
      transcript: `[Demo testimonial: fictional referee, synthetic audio] ${t.transcript}`,
      transcript_source: 'auto',
      transcript_confirmed_at: i % 3 === 2 ? null : recorded,
      duration_seconds: audio.seconds,
      source: 'reference_direct',
      submission_token: null,
      status: 'published',
      precheck_status: 'passed',
      review_flags: [],
      replaces_id: null,
      opened_at: ago(t.recorded + 2),
      confirmed_at: ago(t.recorded + 0.01),
      details_accepted_at: ago(t.recorded + 0.005),
      consent_at: recorded,
      submitted_at: recorded,
      published_at: ago(t.recorded - 1),
      removed_at: null,
      withdrawn_at: null,
      withdraw_token: hex(`${p.handle}:withdraw:${i}`),
      created_at: ago(t.recorded + 3),
      _on: t.on,
    }
  })
  if (WITHOUT_TESTIMONIAL.has(p.handle)) (p as any).testimonials = []
  ;(p as any).videos = (p.src.featured ? p.src.qna ?? [] : []).map((transcript: string, i: number) => ({
    id: uuid(`${p.handle}:qna:${i + 1}`),
    question: i + 1,
    video_path: `demo/${VIDEO_CLIPS[i].name}`,
    transcript: `[Demo answer] ${transcript}`,
    duration_seconds: VIDEO_CLIPS[i].seconds,
  }))
}

// Verification (spec §3.1). Defaults, varied by a hash of the handle:
//   identity: ID provider passed, then Confirmed;
//   most recent employer: Confirmed by the testimonial when the referee's
//     email organization matches it, else a public document (Confirmed) or a
//     contract (Document reviewed); pseudo-employers ("Independent
//     consultant") always Document reviewed;
//   most recent degree: degree service (Confirmed) or certificate (Document reviewed);
//   certifications: public registry (Confirmed).
// `verify` on an entry: { pendingCert: i } leaves certification i unchecked
// (Pending check; with a credential ID it waits in the admin queue);
// { evidence: i } leaves certification i unchecked with a link-only evidence
// row awaiting review; { recheck: true } leaves the most recent employer
// unchecked and opens the re-check window.
const bit = (key: string, n: number) => parseInt(hex(key).slice(0, 8), 16) % n
for (const p of profiles) {
  const prof = p.profile
  const v = p.src.verify ?? {}
  const checks: any[] = []
  const evidence: any[] = []
  const base = Date.parse(prof.submitted_at)
  let seq = 0
  const at = () => new Date(base + (++seq) * 3_600_000).toISOString()
  const add = (kind: string, itemId: string, summary: string, fingerprint: string, outcome: string, method: string, actor = 'admin', detail: any = {}) =>
    checks.push({
      id: uuid(`${p.handle}:check:${kind}:${itemId}:${outcome}`),
      profile_id: p.id,
      item_kind: kind,
      item_id: itemId,
      item_summary: summary,
      item_fingerprint: fingerprint,
      outcome,
      method,
      detail,
      actor,
      actor_name: actor === 'admin' ? ADMIN : actor === 'provider' ? 'ID provider (placeholder)' : null,
      created_at: at(),
    })
  const idFp = identityFingerprint(prof)
  add('identity', 'identity', prof.name, idFp, 'provider_passed', 'id_provider', 'provider', { note: 'Demo: placeholder ID + selfie result.' })
  add('identity', 'identity', prof.name, idFp, 'confirmed', 'id_provider', 'admin', { note: 'Photo matches the ID check.' })

  const employer = mostRecentEmployer(prof)
  const confirmedByReferee = (p as any).testimonials.some((t: any) => {
    const entryOrg = employer && resolveOrganization(orgs, employer.organization, employer.organization_id)
    return t.work_history_entry_id === employer?.id && entryOrg && entryOrg.id === t.referee_org_id
  })
  if (employer && !v.recheck && !confirmedByReferee) {
    const pseudo = !resolveOrganization(orgs, employer.organization)
    const doc = pseudo || bit(`${p.handle}:employer`, 2) === 0
    add('employer', employer.id, employerSummary(employer), entryFingerprint('employer', employer), doc ? 'document_reviewed' : 'confirmed', doc ? 'document' : 'public_document', 'admin', {
      note: pseudo ? 'Demo: contract with most recent client reviewed.' : doc ? 'Demo: employment letter reviewed.' : 'Demo: named on the organization’s public staff page.',
      ...(doc ? { evidence: [{ kind: 'file', mime_type: 'application/pdf' }], evidence_deleted_at: at() } : {}),
    })
  }
  const degree = mostRecentDegree(prof, NOW)
  if (degree) {
    const doc = bit(`${p.handle}:degree`, 5) < 2
    add('degree', degree.id, degreeSummary(degree), entryFingerprint('degree', degree), doc ? 'document_reviewed' : 'confirmed', doc ? 'document' : 'degree_service', 'admin', {
      note: doc ? 'Demo: certificate checked for format, dates and consistency.' : 'Demo: confirmed by degree-verification service (placeholder).',
      ...(doc ? { evidence: [{ kind: 'file', mime_type: 'application/pdf' }], evidence_deleted_at: at() } : {}),
    })
  }
  prof.accreditations.forEach((a: any, i: number) => {
    if (v.pendingCert === i) return
    if (v.evidence === i) {
      evidence.push({
        id: uuid(`${p.handle}:evidence:${a.id}`),
        profile_id: p.id,
        item_kind: 'certification',
        item_id: a.id,
        link_url: v.evidenceUrl,
        file_path: null,
        file_name: null,
        file_size: null,
        mime_type: null,
        explanation: 'Demo: link to the issuer’s public register entry.',
        created_at: ago(4),
      })
      return
    }
    add('certification', a.id, certificationSummary(a), entryFingerprint('certification', a), 'confirmed', 'registry', 'admin', { note: 'Demo: found in the issuer’s public register.' })
  })
  ;(p as any).checks = checks
  ;(p as any).evidence = evidence
}

// ---- validate ---------------------------------------------------------------------

const errors: string[] = []
const err = (p: any, msg: string) => errors.push(`${p.handle} (${p.src._file}): ${msg}`)
const withQna = withVideoQnaStatus(
  profiles.map((p) => p.profile),
  profiles.flatMap((p: any) => p.videos.map((v: any) => ({ profile_id: p.id, kind: 'question', question_id: QUESTION_IDS[v.question - 1] }))),
  QUESTION_IDS.map((id) => ({ id })),
)
profiles.forEach((p, i) => (p.profile.video_qnas_complete = withQna[i].video_qnas_complete))

const seen = { handle: new Set<string>(), id: new Set<string>(), name: new Set<string>(), photo: new Set<string>(), referee: new Map<string, number>() }
for (const p of profiles as any[]) {
  const prof = p.profile
  for (const [k, v] of [['handle', p.handle], ['id', p.id], ['name', prof.name], ['photo', prof.photo_url]] as const) {
    if (seen[k].has(v)) err(p, `duplicate ${k} ${v}`)
    seen[k].add(v)
  }
  if (!['F', 'M'].includes(p.src.gender)) err(p, 'gender must be F or M')
  if (!['early_career', 'mid_career', 'senior'].includes(prof.career_level)) err(p, 'bad level')
  if (!prof.headline || prof.headline.length > 120) err(p, `headline length ${prof.headline?.length}`)
  if (JSON.stringify(p.src).includes('$$')) err(p, 'contains $$')
  for (const l of prof.spoken_languages) {
    if (!languageNames.has(l.name)) err(p, `language not on the list: ${l.name}`)
    if (!['fluent', 'working'].includes(l.proficiency)) err(p, `bad proficiency ${l.proficiency}`)
  }
  for (const t of prof.tiered_expertise) if (!expertiseItems.has(t.name)) err(p, `expertise not on the list: ${t.name}`)
  if (new Set(prof.tiered_expertise.map((t: any) => t.name)).size !== prof.tiered_expertise.length) err(p, 'duplicate expertise tag')
  for (const it of p.portfolio) {
    if (!it.project_name || !it.organization || !it.role || !it.description) err(p, `portfolio "${it.project_name}" missing a required field`)
    if (it.description.length > 1000) err(p, `portfolio "${it.project_name}" description ${it.description.length} chars`)
    if ((it.results ?? '').length > 500) err(p, `portfolio "${it.project_name}" results too long`)
    if (it.links.length > 3 || it.links.some((l: any) => !l.label)) err(p, `portfolio "${it.project_name}" links`)
    if (!Number.isInteger(it.start_year) || (it.end_year !== null && it.end_year < it.start_year)) err(p, `portfolio "${it.project_name}" years`)
  }
  for (const e of [...prof.work_history, ...prof.education_history, ...prof.accreditations]) if (!e.id) err(p, 'entry without id')

  // Completeness (the editor panel, Submit and Approve).
  for (const g of completenessGaps({ profile: prof, portfolioCount: p.portfolio.length, testimonials: p.testimonials }))
    err(p, `completeness: ${g.message}`)
  if (!isListed(prof)) err(p, 'not listed')
  if (prof.is_premium !== isFeatured(prof)) err(p, `Featured chosen but ${p.videos.length}/5 Video Q&As`)
  if (!prof.is_premium && p.videos.length) err(p, 'Video Q&As on a Member')

  // Testimonials: targets, referee email rules, confirmation line, visibility.
  for (const t of p.testimonials) {
    if (!t.work_history_entry_id && !t.portfolio_item_id) err(p, `testimonial ${t._on} has no target`)
    if (t.portfolio_item_id && !prof.is_premium) err(p, 'portfolio testimonial on a Member')
    const recent = seen.referee.get(t.referee_email) ?? 0
    seen.referee.set(t.referee_email, recent + 1)
    const check = checkRefereeEmail(t.referee_email, { consultant: prof, orgs, refereeName: t.reference_name, recentCount: recent })
    if (check.blocks.length || check.flags.length) err(p, `referee ${t.referee_email}: ${[...check.blocks, ...check.flags.map((f) => f.message)].join('; ')}`)
    if (check.org && check.org.name !== t.reference_org) err(p, `referee org "${t.reference_org}" but ${t.referee_email} is ${check.org.name}`)
    const line = confirmationLine(t, prof, orgs)
    if (!line.confirmed) err(p, `testimonial ${t._on}: no confirmation line`)
    t._line = line
  }
  const visible = visibleTestimonials(prof, p.testimonials)
  if (visible.length !== p.testimonials.length) err(p, `${p.testimonials.length - visible.length} testimonial(s) wouldn't show (Member: exactly 1)`)

  // Verification: labels as the profile page shows them.
  const input = { profile: prof, checks: p.checks, evidence: p.evidence, testimonials: p.testimonials, orgs }
  const state = verificationState(input as any, NOW)
  const labels = profileLabels(input as any)
  p._state = state
  p._labels = labels
  const v = p.src.verify ?? {}
  if (v.recheck) {
    if (state.corePassed) err(p, 're-check profile: core should be waiting')
  } else if (!state.corePassed) err(p, `verification incomplete: ${state.required.filter((i: any) => i.status !== 'labelled').map((i: any) => i.title).join(', ')}`)
  const pendingCerts = [...labels.values()].filter((l) => l === 'pending').length
  const expectPending = (v.pendingCert != null ? 1 : 0) + (v.evidence != null ? 1 : 0)
  if (pendingCerts !== expectPending) err(p, `${pendingCerts} Pending check certification(s), expected ${expectPending}`)
  if (v.pendingCert != null && !prof.accreditations[v.pendingCert]?.credential_id_or_url) err(p, 'pending certification needs a credential ID (admin queue)')
}

// Mix and coverage.
const n = profiles.length
const featured = profiles.filter((p) => p.profile.is_premium).length
if (Math.abs(featured / n - 0.25) > 0.02) errors.push(`mix: ${featured}/${n} Featured, want about 25%`)
const tagged = new Map<string, number>()
for (const p of profiles) for (const t of p.profile.tiered_expertise) tagged.set(t.name, (tagged.get(t.name) ?? 0) + 1)
const unused = [...expertiseItems.keys()].filter((k) => !tagged.has(k))
if (unused.length) errors.push(`coverage: ${unused.length} items never tagged: ${unused.join('; ')}`)
const queue = (profiles as any[]).filter(
  (p) => p.profile.verification_recheck_until || p._state.items.some((i: any) => i.status === 'waiting' && i.waitingFor === 'admin'),
)
const recheck = profiles.filter((p) => p.profile.verification_recheck_until).length
if (recheck !== 1) errors.push(`demo: ${recheck} profiles in a re-check window, want 1`)

// ---- baseline guard (docs/samples/expectations.json) -------------------------------
// Profiles keep their role in the ranking baseline:
//  - a tag added to an existing profile is never one of a ToR's rows or
//    expected extraction items (new tags only add off-ToR evidence);
//  - a profile named in a ToR keeps its languages (none gained); a language
//    a Required row asks for never drops from Fluent;
//  - each tie pair stays identical in tags, languages and portfolio text.
const torItems = new Set<string>()
const requiredLanguages = new Set<string>()
const named = new Set<string>()
for (const tor of expectations.tors) {
  for (const r of tor.requirements) {
    if (r.kind === 'expertise') torItems.add(r.value.name)
    if (r.kind === 'language' && r.level === 'must') r.value.values.forEach((l: string) => requiredLanguages.add(l))
  }
  tor.expected_extraction.expertise.forEach((e: string) => torItems.add(e))
  for (const h of [...tor.expected_top.map((e: any) => e.handle), ...tor.checks.flatMap((c: any) => [c.handle, c.other])]) if (h) named.add(h)
}
for (const h of WITHOUT_TESTIMONIAL) {
  const p = profiles.find((x) => x.handle === h)
  if (!p) errors.push(`WITHOUT_TESTIMONIAL: no profile ${h}`)
  else if (p.profile.is_premium || named.has(h) || /^t\d/.test(p.src._file) || p.handle === 'amara-diallo')
    err(p, 'WITHOUT_TESTIMONIAL: Featured, baseline test case or the demo consultant')
}
for (const p of profiles) {
  const old = before[p.handle]
  if (!old) continue
  const had = new Set(Object.values(old.tiers).flat())
  for (const t of p.profile.tiered_expertise) if (!had.has(t.name) && torItems.has(t.name)) err(p, `guard: new tag "${t.name}" is a ToR item`)
  const oldLangs = new Map(old.languages)
  for (const l of p.profile.spoken_languages) {
    if (!oldLangs.has(l.name) && named.has(p.handle)) err(p, `guard: ToR test profile gains ${l.name}`)
    if (requiredLanguages.has(l.name) && oldLangs.get(l.name) === 'fluent' && l.proficiency !== 'fluent') err(p, `guard: ${l.name} drops to Working`)
  }
  for (const [name, level] of oldLangs) if (!p.profile.spoken_languages.some((l: any) => l.name === name)) err(p, `guard: loses ${name} (${level})`)
}
for (const tor of expectations.tors)
  for (const c of tor.checks.filter((c: any) => c.type === 'tie_pair')) {
    const [a, b] = [c.handle, c.other].map((h: string) => profiles.find((p) => p.handle === h))
    if (!a || !b) {
      errors.push(`guard: tie pair ${c.handle} / ${c.other} missing`)
      continue
    }
    const sig = (p: any) =>
      JSON.stringify([p.profile.tiered_expertise, p.profile.spoken_languages, p.portfolio.map((i: any) => [i.project_name, i.description, i.results, i.role])])
    if (sig(a) !== sig(b)) errors.push(`guard: tie pair ${c.handle} / ${c.other} differ in tags, languages or portfolio`)
  }

// ---- report -----------------------------------------------------------------------

const tiers = (t: string) => profiles.reduce((s, p) => s + p.profile.tiered_expertise.filter((x: any) => x.tier === t).length, 0)
const allTestimonials = (profiles as any[]).flatMap((p) => p.testimonials)
console.log(`${n} profiles (${profiles.filter((p) => p.isNew).length} new) from ${files.length} files`)
console.log(`Featured ${featured} (${Math.round((featured / n) * 100)}%), Members ${n - featured}`)
console.log(`expertise: ${tagged.size}/${expertiseItems.size} items used; tags core ${tiers('core')}, strong ${tiers('strong')}, working ${tiers('working')}`)
console.log(
  `testimonials ${allTestimonials.length} (${allTestimonials.filter((t) => t.portfolio_item_id).length} on portfolio items, ${allTestimonials.filter((t) => t._line?.relationship?.includes('details confirmed by referee')).length} "now at" lines)`,
)
console.log(`video Q&As ${(profiles as any[]).reduce((s, p) => s + p.videos.length, 0)}; verification checks ${(profiles as any[]).reduce((s, p) => s + p.checks.length, 0)}; admin queue ${queue.length}: ${queue.map((p) => p.handle).join(', ')}`)
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n` + errors.map((e) => `  - ${e}`).join('\n'))
  process.exit(1)
}
if (checkOnly) process.exit(0)

// ---- emit SQL ---------------------------------------------------------------------

const q = (s: any) => (s === null || s === undefined ? 'NULL' : `$$${s}$$`)
const jsonb = (v: any) => `$$${JSON.stringify(v)}$$::jsonb`
const ts = (s: string | null) => (s ? `'${s}'::timestamptz` : 'NULL')
const orgId = (name: string | null) => (name ? `(SELECT id FROM organizations WHERE name = ${q(name)})` : 'NULL')

const PROFILE_COLUMNS = [
  'id', 'user_id', 'consultant_type', 'handle', 'name', 'headline', 'location', 'career_level', 'year_founded',
  'contracting_work_eligibility', 'work_types', 'part_time_availability', 'full_time_availability', 'availability_updated_at',
  'photo_url', 'cover_image_url', 'detailed_bio', 'tiered_expertise', 'spoken_languages', 'accreditations', 'work_history',
  'education_history', 'additional_experience', 'is_premium', 'subscription_status', 'approval_status', 'submitted_at', 'email',
  'testimonial_grace_until', 'verification_recheck_until', 'is_demo',
]

function profileSql(p: any): string {
  const x = p.profile
  const values = [
    `'${x.id}'`, 'NULL', q('Individual'), q(x.handle), q(x.name), q(x.headline), q(x.location), q(x.career_level), 'NULL',
    q(x.contracting_work_eligibility), `ARRAY[${x.work_types.map(q).join(', ')}]::text[]`, p.sqlAvailability.pt, p.sqlAvailability.ft,
    p.sqlAvailability.updated, q(x.photo_url), q(x.cover_image_url), q(x.detailed_bio), jsonb(x.tiered_expertise), jsonb(x.spoken_languages),
    jsonb(x.accreditations), jsonb(x.work_history), jsonb(x.education_history), jsonb(x.additional_experience), String(x.is_premium),
    `'active'`, `'approved'`, ts(x.submitted_at), q(x.email), 'NULL',
    x.verification_recheck_until ? `now() + interval '18 days'` : 'NULL', 'true',
  ]
  const updates = PROFILE_COLUMNS.filter((c) => c !== 'id').map((c) => `${c} = EXCLUDED.${c}`).join(', ')
  return `-- ${x.name} (${x.handle})${p.isNew ? ' [new]' : ''}\nINSERT INTO profiles (${PROFILE_COLUMNS.join(', ')}) VALUES (\n  ${values.join(',\n  ')}\n)\nON CONFLICT (id) DO UPDATE SET ${updates};\n`
}

function childrenSql(p: any): string {
  const out: string[] = []
  if (p.portfolio.length)
    out.push(
      `INSERT INTO portfolio_items (id, profile_id, project_name, organization, organization_id, start_year, end_year, role, description, results, images, links, video_url, sort_order) VALUES\n` +
        p.portfolio
          .map((it: any) =>
            `  ('${it.id}', '${p.id}', ${q(it.project_name)}, ${q(it.organization)}, ${orgId(it.organization_id)}, ${it.start_year}, ${it.end_year ?? 'NULL'}, ${q(it.role)}, ${q(it.description)}, ${q(it.results)}, ${jsonb(it.images)}, ${jsonb(it.links)}, NULL, ${it.sort_order})`,
          )
          .join(',\n') +
        ';',
    )
  for (const t of p.testimonials) {
    out.push(
      `INSERT INTO audio_testimonials (id, profile_id, work_history_entry_id, portfolio_item_id, reference_name, reference_org, reference_title, relationship, referee_email, referee_org_id, period_start, period_end, context, audio_path, transcript, transcript_source, transcript_confirmed_at, duration_seconds, source, submission_token, status, precheck_status, review_flags, opened_at, confirmed_at, details_accepted_at, consent_at, submitted_at, published_at, withdraw_token, created_at) VALUES (` +
        [
          `'${t.id}'`, `'${p.id}'`, q(t.work_history_entry_id), t.portfolio_item_id ? `'${t.portfolio_item_id}'` : 'NULL', q(t.reference_name), q(t.reference_org),
          q(t.reference_title), q(t.relationship), q(t.referee_email), orgId(t.referee_org_id), t.period_start, t.period_end ?? 'NULL', q(t.context),
          q(t.audio_path), q(t.transcript), q(t.transcript_source), ts(t.transcript_confirmed_at), t.duration_seconds, q(t.source), 'NULL', `'published'`,
          `'passed'`, `'[]'::jsonb`, ts(t.opened_at), ts(t.confirmed_at), ts(t.details_accepted_at), ts(t.consent_at), ts(t.submitted_at), ts(t.published_at),
          q(t.withdraw_token), ts(t.created_at),
        ].join(', ') +
        ');',
    )
    // The audit trail a real request leaves (lib/testimonials: requests, referee, lifecycle).
    const events: [string, string, string][] = [
      ['requested', 'consultant', t.created_at],
      ['link_created', 'consultant', t.created_at],
      ['link_opened', 'referee', t.opened_at],
      ['code_confirmed', 'referee', t.confirmed_at],
      ['details_accepted', 'referee', t.details_accepted_at],
      ['consent_given', 'referee', t.consent_at],
      ['recording_submitted', 'referee', t.submitted_at],
      ...(t.transcript_confirmed_at ? [['transcript_confirmed', 'referee', t.transcript_confirmed_at] as [string, string, string]] : []),
      ['published', 'consultant', t.published_at],
    ]
    out.push(
      `INSERT INTO testimonial_events (id, testimonial_id, event, actor, detail, created_at) VALUES\n` +
        events.map(([e, actor, at], i) => `  ('${uuid(`${t.id}:event:${i}`)}', '${t.id}', '${e}', '${actor}', '{"demo": true}'::jsonb, ${ts(at)})`).join(',\n') +
        ';',
    )
  }
  if (p.videos.length)
    out.push(
      `INSERT INTO video_responses (id, profile_id, kind, question_id, video_url, video_path, transcript, duration_seconds) VALUES\n` +
        p.videos
          .map((v: any) => `  ('${v.id}', '${p.id}', 'question', (SELECT id FROM interview_questions WHERE sort_order = ${v.question} AND active ORDER BY id LIMIT 1), NULL, ${q(v.video_path)}, ${q(v.transcript)}, ${v.duration_seconds})`)
          .join(',\n') +
        ';',
    )
  if (p.checks.length)
    out.push(
      `INSERT INTO verification_checks (id, profile_id, item_kind, item_id, item_summary, item_fingerprint, outcome, method, detail, actor, actor_name, created_at) VALUES\n` +
        p.checks
          .map((c: any) => `  ('${c.id}', '${p.id}', '${c.item_kind}', ${q(c.item_id)}, ${q(c.item_summary)}, '${c.item_fingerprint}', '${c.outcome}', '${c.method}', ${jsonb(c.detail)}, '${c.actor}', ${q(c.actor_name)}, ${ts(c.created_at)})`)
          .join(',\n') +
        ';',
    )
  for (const e of p.evidence)
    out.push(
      `INSERT INTO verification_evidence (id, profile_id, item_kind, item_id, link_url, file_path, explanation, created_at) VALUES ('${e.id}', '${p.id}', '${e.item_kind}', ${q(e.item_id)}, ${q(e.link_url)}, NULL, ${q(e.explanation)}, ${ts(e.created_at)});`,
    )
  return out.join('\n')
}

const PARTS = 4
const per = Math.ceil(n / PARTS)
const header = (title: string) =>
  `-- 018 ${title}: step 5 demo re-seed (docs/MavenScout-profiles-membership.md §13 step 5).\n` +
  `-- GENERATED by scripts/demo-seed/build.ts from scripts/demo-seed/profiles/*.mjs: do not edit by hand.\n` +
  `--\n` +
  `-- Run in the Supabase SQL editor after 017, part 0 first, then parts 1 → ${PARTS}.\n` +
  `-- Idempotent: each part replaces its profiles' rows (profiles upsert on id;\n` +
  `-- portfolio items, testimonials, Video Q&As and verification rows are deleted\n` +
  `-- and re-inserted with fixed ids). Every row is demo data: is_demo profiles,\n` +
  `-- removed by supabase/purge_demo.sql. Demo media (audio-testimonials/demo/,\n` +
  `-- videos/demo/) is uploaded by scripts/demo-seed/media.mjs --upload.\n\n`
const guard =
  `DO $check$ BEGIN\n` +
  `  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_checks')\n` +
  `     OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_status') THEN\n` +
  `    RAISE EXCEPTION '018 needs 016 and 017 first';\n` +
  `  END IF;\n` +
  `  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hiring_managers' AND column_name = 'is_demo') THEN\n` +
  `    RAISE EXCEPTION 'run 018_reseed_demo_0.sql first';\n` +
  `  END IF;\n` +
  `END $check$;\n\n`

for (let part = 0; part < PARTS; part++) {
  const slice = profiles.slice(part * per, (part + 1) * per)
  const ids = slice.map((p) => `'${p.id}'`).join(', ')
  const body =
    header(`(part ${part + 1} of ${PARTS})`) +
    guard +
    `BEGIN;\n\n` +
    // Leftovers first: test testimonials (events cascade), any Video Q&As,
    // verification rows and portfolio items of these profiles.
    `DELETE FROM audio_testimonials WHERE profile_id IN (${ids});\n` +
    `DELETE FROM video_responses WHERE profile_id IN (${ids});\n` +
    `DELETE FROM verification_checks WHERE profile_id IN (${ids});\n` +
    `DELETE FROM verification_evidence WHERE profile_id IN (${ids});\n` +
    `DELETE FROM portfolio_items WHERE profile_id IN (${ids});\n\n` +
    // The updated_at trigger is paused so the re-seed doesn't look like edits.
    `ALTER TABLE profiles DISABLE TRIGGER profiles_updated_at;\n\n` +
    slice.map(profileSql).join('\n') +
    `\nALTER TABLE profiles ENABLE TRIGGER profiles_updated_at;\n\n` +
    slice.map((p) => `-- ${p.profile.name}\n${childrenSql(p)}`).join('\n\n') +
    `\n\nCOMMIT;\n`
  const file = join(root, 'supabase', `018_reseed_demo_${part + 1}.sql`)
  writeFileSync(file, body)
  console.log(`wrote supabase/018_reseed_demo_${part + 1}.sql (${slice.length} profiles, ${(body.length / 1024).toFixed(0)} KB)`)
}
