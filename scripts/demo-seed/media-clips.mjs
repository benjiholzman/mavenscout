// The demo clips (scripts/demo-seed/media.mjs makes them; build.ts points rows at them).

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

