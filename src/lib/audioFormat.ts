// Cross-browser audio (testimonials): Safari records AAC in MP4, Chrome and
// Firefox record Opus in WebM. Older iOS Safari can't play WebM/Opus, so
// anything that isn't already AAC/MP3/WAV is converted, on the device that
// recorded it (which can always decode its own format), to 16-bit mono WAV.
// About 2.6 MB a minute at 22.05 kHz: plenty for speech, and it plays
// everywhere. Voice memos from a phone (.m4a, AAC) pass through unchanged.

const PORTABLE = /(mp4a|aac|mpeg|mp3|wav|x-m4a)/i
const TARGET_RATE = 22_050

/** True when every browser we support can play this file as it is. */
export function isPortableAudio(file: File): boolean {
  const type = file.type.toLowerCase()
  if (PORTABLE.test(type)) return true
  // Plain audio/mp4 (or an .m4a with no type) is AAC unless it says Opus.
  if ((type.startsWith('audio/mp4') || (!type && /\.m4a$/i.test(file.name))) && !type.includes('opus')) return true
  return !type && /\.(mp3|wav|aac)$/i.test(file.name)
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const str = (offset: number, s: string) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  str(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

/** Returns a file every browser can play, plus its true duration in seconds
 *  (MediaRecorder WebM often reports none). Throws a user-facing message if
 *  the file can't be decoded. */
export async function toPortableAudio(file: File): Promise<{ file: File; duration: number | null }> {
  if (isPortableAudio(file)) return { file, duration: null }
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctx()
  let decoded: AudioBuffer
  try {
    decoded = await ctx.decodeAudioData(await file.arrayBuffer())
  } catch {
    throw new Error("We couldn't read that audio file. Try recording here, or a voice memo (.m4a).")
  } finally {
    ctx.close?.()
  }
  // Mix down to mono and resample with an offline render.
  const length = Math.ceil(decoded.duration * TARGET_RATE)
  const offline = new OfflineAudioContext(1, length, TARGET_RATE)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()
  const wav = encodeWav(rendered.getChannelData(0), TARGET_RATE)
  const name = file.name.replace(/\.[^.]+$/, '') + '.wav'
  return { file: new File([wav], name, { type: 'audio/wav' }), duration: decoded.duration }
}
