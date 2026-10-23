// ============================================================================
// ⚑ PLACEHOLDER SPEECH-TO-TEXT (docs/MavenScout-profiles-membership.md §4.3 step 6)
//
// The real transcript appears within seconds of submission from a
// speech-to-text service; the referee confirms it or fixes names and acronyms
// inline, and if they leave it publishes as auto-generated. Submission never
// waits on it.
//
// This placeholder returns instantly with clearly labelled text, never
// invented words attributed to the referee. Swap the body for the real
// service; keep the signature. Transcripts are never used in ranking (§4.1).
// ============================================================================

export const TRANSCRIBE_IS_PLACEHOLDER = true

export interface TranscribeInput {
  audio: Blob
  durationSeconds: number
  refereeName: string
  consultantName: string
}

export async function transcribeAudio(input: TranscribeInput): Promise<string> {
  const m = Math.floor(input.durationSeconds / 60)
  const s = String(Math.round(input.durationSeconds % 60)).padStart(2, '0')
  return `[Automatic transcript placeholder: speech-to-text isn't connected in this demo build. ${input.refereeName}'s ${m}:${s} recording about ${input.consultantName} is saved. Replace this text with what you said, or leave it.]`
}
