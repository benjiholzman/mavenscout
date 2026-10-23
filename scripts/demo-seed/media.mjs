// Demo media for the step 5 re-seed (docs/MavenScout-profiles-membership.md
// §13 step 5): clearly labelled, with no real person's voice or likeness.
//
//   node scripts/demo-seed/media.mjs            generate into node_modules/.cache/demo-media
//   node scripts/demo-seed/media.mjs --upload   generate, then upload to Storage
//
// Needs ffmpeg. --upload reads .env (VITE_SUPABASE_URL / _ANON_KEY) and uses
// the dev storage policies (anon upload, 000_schema.sql). Behind a proxy, run
// with NODE_USE_ENV_PROXY=1.
//
//   audio-testimonials/demo/testimonial-1..6.m4a
//     No speech: a soft synthetic tone bed with a chime at the start and end,
//     45–110 s, AAC mono (plays everywhere, lib/audioFormat). The words are in
//     each testimonial's transcript, which is labelled demo. Rows rotate
//     through the six clips.
//   videos/demo/qna-1..5.mp4
//     One title card per standard Video Q&A question: the question, a
//     "DEMO ANSWER" banner and a waveform of the same kind of tone bed, 20 s,
//     720×1280 H.264. Every Featured demo profile shares these five.
//
// 018_reseed_demo.sql points audio_path / video_path at these paths, and
// purge_demo.sql says to clear the two demo/ folders.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const outDir = join(root, 'node_modules', '.cache', 'demo-media')
mkdirSync(outDir, { recursive: true })

const FONT = '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
const FONT_BOLD = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'
const CYAN = '0x0C8C9F'

// The five standard questions, as profiles-membership §5 words them.
export const QUESTIONS = [
  "A project you're most proud of: your role, and what changed because of it.",
  'Delivering in an unfamiliar country or institutional context.',
  'Communicating difficult findings or setbacks to a client or funder.',
  'Working across cultures, languages, or with local partners.',
  "A methodology you specialise in, and when it's not the right tool.",
]
export const AUDIO_CLIPS = [
  { name: 'testimonial-1.m4a', seconds: 48, root: 196 },
  { name: 'testimonial-2.m4a', seconds: 62, root: 220 },
  { name: 'testimonial-3.m4a', seconds: 75, root: 247 },
  { name: 'testimonial-4.m4a', seconds: 88, root: 175 },
  { name: 'testimonial-5.m4a', seconds: 97, root: 208 },
  { name: 'testimonial-6.m4a', seconds: 110, root: 233 },
]
export const VIDEO_CLIPS = QUESTIONS.map((_, i) => ({ name: `qna-${i + 1}.mp4`, seconds: 20 }))

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

function videoClip({ name, seconds }, index) {
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
  wrap(QUESTIONS[index], 29).forEach((l, i) => text(l, FONT_BOLD, 40, '0x1E2A33', 560 + i * 58))
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

const files = [
  ...AUDIO_CLIPS.map((c) => ({ bucket: 'audio-testimonials', path: `demo/${c.name}`, file: audioClip(c), type: 'audio/mp4' })),
  ...VIDEO_CLIPS.map((c, i) => ({ bucket: 'videos', path: `demo/${c.name}`, file: videoClip(c, i), type: 'video/mp4' })),
]
for (const f of files) console.log(`${f.bucket}/${f.path}  ${(readFileSync(f.file).length / 1024).toFixed(0)} KB`)

if (process.argv.includes('--upload')) {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(
    readFileSync(join(root, '.env'), 'utf8').split('\n')
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, '')]),
  )
  const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
  for (const f of files) {
    const { error } = await db.storage.from(f.bucket).upload(f.path, readFileSync(f.file), { contentType: f.type, upsert: true })
    if (error) throw new Error(`${f.bucket}/${f.path}: ${error.message}`)
    console.log(`uploaded ${f.bucket}/${f.path}`)
  }
}
