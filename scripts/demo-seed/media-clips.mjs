// The demo clips (scripts/demo-seed/media.mjs makes them; build.ts points rows at them).

export const AUDIO_CLIPS = [
  { name: 'testimonial-1.m4a', seconds: 48, root: 196 },
  { name: 'testimonial-2.m4a', seconds: 62, root: 220 },
  { name: 'testimonial-3.m4a', seconds: 75, root: 247 },
  { name: 'testimonial-4.m4a', seconds: 88, root: 175 },
  { name: 'testimonial-5.m4a', seconds: 97, root: 208 },
  { name: 'testimonial-6.m4a', seconds: 110, root: 233 },
]
// One per standard Video Q&A question (interview_questions, sort_order 1–5).
export const VIDEO_CLIPS = [1, 2, 3, 4, 5].map((n) => ({ name: `qna-${n}.mp4`, seconds: 20 }))

