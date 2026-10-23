// Demo media for the step 5 re-seed (docs/MavenScout-profiles-membership.md
// §13 step 5): clearly labelled, with no real person's voice or likeness.
//
//   node scripts/demo-seed/media.mjs                     generate into node_modules/.cache/demo-media
//   node scripts/demo-seed/media.mjs --upload            generate, then upload to Storage
//   node scripts/demo-seed/media.mjs --clean [--yes]     list (with --yes, delete) leftover uploads
//                                                        in demo profiles' folders (test recordings)
//   node scripts/demo-seed/media.mjs --remove-demo [--yes]  list (with --yes, delete) the demo/ clips,
//                                                        before purge_demo.sql
//
// Needs ffmpeg and the database (for the question text) to generate. Storage and the database are read through .env (VITE_SUPABASE_URL /
// _ANON_KEY) and use the dev storage policies (anon upload and delete,
// 000_schema.sql). Behind a proxy, run with NODE_USE_ENV_PROXY=1.
//
//   audio-testimonials/demo/testimonial-1..6.m4a
//     No speech: a soft synthetic tone bed with a chime at the start and end,
//     45–110 s, AAC mono (plays everywhere, lib/audioFormat). The words are in
//     each testimonial's transcript, which is labelled demo. Rows rotate
//     through the six clips.
//   videos/demo/qna-1..5.mp4
//     One title card per standard Video Q&A question, with the question text
//     read from the live interview_questions table (what the app shows above
//     the player; re-run --upload after an admin edits a question): the question, a
//     "DEMO ANSWER" banner and a waveform of the same kind of tone bed, 20 s,
//     720×1280 H.264. Every Featured demo profile shares these five.
//
// 018_reseed_demo_*.sql points audio_path / video_path at these paths, and
// purge_demo.sql says to clear the two demo/ folders.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AUDIO_CLIPS, VIDEO_CLIPS } from './media-clips.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const outDir = join(root, 'node_modules', '.cache', 'demo-media')
mkdirSync(outDir, { recursive: true })

const FONT = '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
const FONT_BOLD = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'
const CYAN = '0x0C8C9F'

const ffmpeg = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args])

// A quiet, slowly pulsing two-note bed (fifth above the root) between two
// short chimes. Not speech, not music anyone would mistake for a voice.
function bedFilter(seconds, rootHz) {
  const end = seconds - 1.2
  return (
    `sine=f=${rootHz}:d=${seconds}[a0];sine=f=${(rootHz * 1.5).toFixed(1)}:d=${seconds}[a1];` +
    `[a0][a1]amix=inputs=2,tremolo=f=0.35:d=0.6,volume=0.9[bed];` +
    `sine=f=880:d=0.5,afade=t=out:st=0.05:d=0.45,volume=1.2[c1];` +
    `sine=f=660:d=0.5,afade=t=out:st=0.05:d=0.45,volume=1.2,adelay=${Math.round(end * 1000)}[c2];` +
    `[bed][c1][c2]amix=inputs=3:duration=first:normalize=0,afade=t=in:d=1.5,afade=t=out:st=${seconds - 2}:d=2,aformat=channel_layouts=mono`
  )
}

function audioClip({ name, seconds, root: rootHz }) {
  const out = join(outDir, name)
  ffmpeg(['-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono', '-filter_complex', `${bedFilter(seconds, rootHz)}[out]`,
    '-map', '[out]', '-t', String(seconds), '-c:a', 'aac', '-b:a', '32k', '-ar', '22050', '-movflags', '+faststart', out])
  return out
}

// drawtext doesn't wrap: break the question into lines of at most `width` characters.
function wrap(text, width) {
  const lines = []
  let line = ''
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > width) {
      lines.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) lines.push(line)
  return lines
}

function videoClip({ name, seconds }, index, question) {
  const out = join(outDir, name)
  const texts = []
  const text = (body, font, size, color, y, x = '(w-text_w)/2') => {
    const file = join(outDir, `${name}.${texts.length}.txt`)
    writeFileSync(file, body)
    texts.push(`drawtext=fontfile=${font}:textfile=${file}:fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}`)
  }
  text('MavenScout  ·  Video Q&A', FONT, 30, 'white', 70)
  text('DEMO ANSWER', FONT_BOLD, 76, CYAN, 250)
  text('Illustrative only. No real person appears or speaks.', FONT, 25, '0x55606A', 350)
  text(`Question ${index + 1} of 5`, FONT, 30, '0x55606A', 500)
  wrap(question, 34).forEach((l, i) => text(l, FONT_BOLD, 36, '0x1E2A33', 560 + i * 52))
  text('Demo data: the transcript below is fictional.', FONT, 26, '0x55606A', 1150)
  const graph =
    `${bedFilter(seconds, 196 + index * 12)}[aud];[aud]asplit[aout][aw];` +
    `[aw]volume=6,showwaves=s=200x60:mode=cline:scale=sqrt:rate=25:colors=0x0C8C9Fff,scale=600:180:flags=neighbor[wave];` +
    `color=c=0xF3F6F6:s=720x1280:r=25:d=${seconds},drawbox=x=0:y=0:w=720:h=170:color=${CYAN}:t=fill[bg];` +
    `[bg][wave]overlay=60:900:shortest=1,${texts.join(',')},format=yuv420p[v]`
  ffmpeg(['-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono', '-filter_complex', graph, '-map', '[v]', '-map', '[aout]',
    '-t', String(seconds), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-c:a', 'aac', '-b:a', '32k',
    '-movflags', '+faststart', out])
  return out
}

async function storage() {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(
    readFileSync(join(root, '.env'), 'utf8').split('\n')
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, '')]),
  )
  return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
}

// The question text exactly as the app shows it, minus markdown emphasis
// (drawtext would print the asterisks).
async function questions() {
  const db = await storage()
  const { data, error } = await db.from('interview_questions').select('question_text, sort_order').eq('active', true).order('sort_order')
  if (error) throw new Error(`interview_questions: ${error.message}`)
  if (!data || data.length < VIDEO_CLIPS.length) throw new Error(`need ${VIDEO_CLIPS.length} active questions, found ${data?.length ?? 0}`)
  return data.map((q) => q.question_text.replace(/\*([^*]+)\*/g, '$1'))
}

const args = new Set(process.argv.slice(2))
const storageOnly = (args.has('--clean') || args.has('--remove-demo')) && !args.has('--upload')
const questionText = storageOnly ? [] : await questions()
const files = storageOnly
  ? []
  : [
      ...AUDIO_CLIPS.map((c) => ({ bucket: 'audio-testimonials', path: `demo/${c.name}`, file: audioClip(c), type: 'audio/mp4' })),
      ...VIDEO_CLIPS.map((c, i) => ({ bucket: 'videos', path: `demo/${c.name}`, file: videoClip(c, i, questionText[i]), type: 'video/mp4' })),
    ]
for (const f of files) console.log(`${f.bucket}/${f.path}  ${(readFileSync(f.file).length / 1024).toFixed(0)} KB`)


async function list(db, bucket, folder) {
  const { data, error } = await db.storage.from(bucket).list(folder, { limit: 1000 })
  if (error) throw new Error(`${bucket}/${folder}: ${error.message}`)
  return (data ?? []).filter((o) => o.id).map((o) => `${folder}/${o.name}`)
}

// Lists the objects, and deletes them only with --yes.
async function remove(db, bucket, paths) {
  for (const p of paths) console.log(`${args.has('--yes') ? 'deleting' : 'would delete'} ${bucket}/${p}`)
  if (!args.has('--yes') || !paths.length) return
  const { error } = await db.storage.from(bucket).remove(paths)
  if (error) throw new Error(`${bucket}: ${error.message}`)
}

if (args.has('--upload')) {
  const db = await storage()
  for (const f of files) {
    const { error } = await db.storage.from(f.bucket).upload(f.path, readFileSync(f.file), { contentType: f.type, upsert: true, cacheControl: '60' })
    if (error) throw new Error(`${f.bucket}/${f.path}: ${error.message}`)
    console.log(`uploaded ${f.bucket}/${f.path}`)
  }
}

if (args.has('--clean')) {
  // Uploads live at <profileId>/<file>: everything in a demo profile's folder
  // is a test upload (the re-seed points only at demo/).
  const db = await storage()
  const { data, error } = await db.from('profiles').select('id').eq('is_demo', true)
  if (error) throw new Error(`profiles: ${error.message}`)
  for (const bucket of ['audio-testimonials', 'videos'])
    for (const { id } of data) await remove(db, bucket, await list(db, bucket, id))
}

if (args.has('--remove-demo')) {
  const db = await storage()
  for (const bucket of ['audio-testimonials', 'videos']) await remove(db, bucket, await list(db, bucket, 'demo'))
}
