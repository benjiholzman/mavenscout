import { Circle, Mic, RotateCcw, Square, Video as VideoIcon, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

// In-browser recording (PRD 7.5/7.6 P1 fast-follow): MediaRecorder capture
// for webcam video or mic audio, with a live preview, a running timer, and
// an automatic stop at the cap. Because the cap is enforced DURING recording,
// callers pass the recorded duration to the upload helpers and skip the
// metadata re-check (MediaRecorder webm blobs often report Infinity duration
// — a known Chromium quirk).

type Phase = 'requesting' | 'ready' | 'recording' | 'preview' | 'denied'

function pickMimeType(kind: 'video' | 'audio'): string {
  const candidates =
    kind === 'video'
      ? ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
      : // AAC in MP4 plays everywhere; WebM/Opus is converted to WAV before
        // upload (lib/audioFormat), since older iOS Safari can't play it.
        ['audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? ''
}

export function RecorderControl({
  kind,
  maxSeconds,
  onRecorded,
  onCancel,
  large = false,
}: {
  kind: 'video' | 'audio'
  maxSeconds: number
  /** Phone-first touch targets (the referee page). */
  large?: boolean
  /** Called with the recorded file + its actual duration in seconds. */
  onRecorded: (file: File, durationSeconds: number) => void
  onCancel: () => void
}) {
  const [phase, setPhase] = useState<Phase>('requesting')
  const [elapsed, setElapsed] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef(0)
  const fileRef = useRef<{ file: File; duration: number } | null>(null)
  const liveVideoRef = useRef<HTMLVideoElement>(null)

  // Acquire the stream once on mount; release everything on unmount.
  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: kind === 'video' })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        setPhase('ready')
      })
      .catch(() => setPhase('denied'))
    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
      recorderRef.current?.state === 'recording' && recorderRef.current.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  // Attach live preview whenever we're ready/recording.
  useEffect(() => {
    if (kind === 'video' && liveVideoRef.current && streamRef.current && phase !== 'preview') {
      liveVideoRef.current.srcObject = streamRef.current
    }
  }, [kind, phase])

  const start = () => {
    const stream = streamRef.current
    if (!stream) return
    chunksRef.current = []
    const mimeType = pickMimeType(kind)
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorderRef.current = recorder
    recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data)
    recorder.onstop = () => {
      const type = recorder.mimeType || (kind === 'video' ? 'video/webm' : 'audio/webm')
      const ext = type.includes('mp4') ? 'mp4' : 'webm'
      const blob = new Blob(chunksRef.current, { type })
      const file = new File([blob], `recording.${ext}`, { type })
      fileRef.current = { file, duration: elapsedRef.current }
      setPreviewUrl(URL.createObjectURL(blob))
      setPhase('preview')
    }
    recorder.start(250)
    elapsedRef.current = 0
    setElapsed(0)
    setPhase('recording')
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
      if (elapsedRef.current >= maxSeconds) stop() // hard cap — auto-stop
    }, 1000)
  }

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const reRecord = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    fileRef.current = null
    setPhase('ready')
  }

  const btn = large ? 'px-5 py-3 text-sm' : 'px-4 py-1.5 text-xs'
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (phase === 'denied')
    return (
      <div className="rounded-xl border border-line bg-paper p-4 text-sm text-ink-soft">
        Camera/microphone access was blocked. Allow it in your browser's site settings, or use
        the upload / paste-a-link options instead.
        <button onClick={onCancel} className="ml-2 font-medium text-brand-600">Close</button>
      </div>
    )

  return (
    <div className="rounded-xl border border-line bg-ink p-3">
      {/* live / recorded preview */}
      {kind === 'video' ? (
        phase === 'preview' && previewUrl ? (
          <video src={previewUrl} controls className="aspect-video w-full rounded-lg bg-black" />
        ) : (
          <video ref={liveVideoRef} autoPlay muted playsInline className="aspect-video w-full rounded-lg bg-black" />
        )
      ) : phase === 'preview' && previewUrl ? (
        <audio src={previewUrl} controls className="w-full" />
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-black/40 py-6 text-white/80">
          <Mic size={18} className={phase === 'recording' ? 'animate-pulse text-red-400' : ''} />
          <span className="text-sm">{phase === 'recording' ? 'Recording…' : 'Microphone ready'}</span>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className={`font-mono text-sm ${phase === 'recording' ? 'text-red-400' : 'text-white/70'}`}>
          {fmt(elapsed)} / {fmt(maxSeconds)}
        </span>
        <div className="flex flex-wrap gap-2">
          {phase === 'requesting' && <span className="text-xs text-white/60">Requesting camera/mic…</span>}
          {phase === 'ready' && (
            <button
              onClick={start}
              className={`flex items-center gap-1.5 rounded-full bg-red-600 font-semibold text-white hover:bg-red-500 ${btn}`}
            >
              <Circle size={11} fill="currentColor" /> Start recording
            </button>
          )}
          {phase === 'recording' && (
            <button
              onClick={stop}
              className={`flex items-center gap-1.5 rounded-full bg-white font-semibold text-ink hover:bg-white/90 ${btn}`}
            >
              <Square size={11} fill="currentColor" /> Stop
            </button>
          )}
          {phase === 'preview' && fileRef.current && (
            <>
              <button
                onClick={() => onRecorded(fileRef.current!.file, fileRef.current!.duration)}
                className={`flex items-center gap-1.5 rounded-full bg-brand-500 font-semibold text-white hover:bg-brand-400 ${btn}`}
              >
                {kind === 'video' ? <VideoIcon size={12} /> : <Mic size={12} />} Use this recording
              </button>
              <button
                onClick={reRecord}
                className={`flex items-center gap-1.5 rounded-full border border-white/30 font-medium text-white/80 hover:text-white ${btn}`}
              >
                <RotateCcw size={11} /> Re-record
              </button>
            </>
          )}
          <button onClick={onCancel} aria-label="Cancel recording" className="rounded-full p-1.5 text-white/50 hover:text-white">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
