import { Camera, Film, Link2, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { uploadVideoFile, VIDEO_MAX_SECONDS } from '../../lib/media'
import { videoQnaStatus, type VideoQnaStatus } from '../../lib/membership'
import { supabase } from '../../lib/supabase'
import type { InterviewQuestion, Profile, VideoResponse } from '../../types/db'
import { RecorderControl } from '../media/Recorder'
import { VideoPlayer } from '../media/VideoPlayer'

// Video Q&As editor (profiles-membership §5): Featured Members answer all the
// standard questions; Featured status starts once every one is in (§2.2).
// Members have no videos, and there is no general intro video for anyone.
// Every answer: in-browser recording, upload to Storage, or a pasted URL;
// hard 2-minute cap on recordings and uploads; optional transcript, never
// used in ranking.

export function VideoQnASection({
  profile,
  onStatus,
}: {
  profile: Profile
  /** Reports answered / required after every change, so Featured status
   *  (and its caps) follow the videos without a reload. */
  onStatus?: (status: VideoQnaStatus) => void
}) {
  const [videos, setVideos] = useState<VideoResponse[] | null>(null)
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])

  const load = async () => {
    const [v, q] = await Promise.all([
      supabase.from('video_responses').select('*').eq('profile_id', profile.id).eq('kind', 'question'),
      supabase.from('interview_questions').select('*').eq('active', true).order('sort_order'),
    ])
    const vids = (v.data as VideoResponse[]) ?? []
    const qs = (q.data as InterviewQuestion[]) ?? []
    setVideos(vids)
    setQuestions(qs)
    onStatus?.(videoQnaStatus(profile.id, vids, qs))
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id])

  if (!videos) return <p className="text-sm text-ink-faint">Loading…</p>

  const status = videoQnaStatus(profile.id, videos, questions)

  const addVideo = async (
    questionId: string,
    source: { file?: File; url?: string; recordedDuration?: number },
  ) => {
    let video_path: string | null = null
    let video_url: string | null = null
    let duration_seconds = 0
    if (source.file) {
      const up = await uploadVideoFile(
        profile.id,
        source.file,
        VIDEO_MAX_SECONDS,
        source.recordedDuration,
      )
      video_path = up.path
      duration_seconds = up.duration
    } else if (source.url) {
      video_url = source.url
    }
    const { error } = await supabase.from('video_responses').insert({
      profile_id: profile.id,
      kind: 'question',
      question_id: questionId,
      video_path,
      video_url,
      duration_seconds,
    })
    if (error) throw new Error(error.message)
    await load()
  }

  const removeVideo = async (v: VideoResponse) => {
    if (v.video_path) await supabase.storage.from('videos').remove([v.video_path])
    await supabase.from('video_responses').delete().eq('id', v.id)
    await load()
  }

  const saveTranscript = async (v: VideoResponse, transcript: string) => {
    await supabase
      .from('video_responses')
      .update({ transcript: transcript.trim() || null })
      .eq('id', v.id)
    await load()
  }

  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-faint">
        Video Q&As — Featured Members
      </h3>
      {!profile.is_premium ? (
        <p className="rounded-lg bg-paper px-3.5 py-3 text-sm text-ink-faint">
          Video Q&As are part of Featured Membership: every Featured Member answers the same{' '}
          {questions.length} interview questions, shown to signed-in hiring managers only. Members
          have no videos.
        </p>
      ) : (
        <>
          <p className="mb-2.5 text-xs text-ink-faint">
            Everyone answers the same prompts so hiring managers can compare like with like. Visible
            to signed-in hiring managers only; never on your public website.
          </p>
          <p
            className={`mb-3 rounded-lg px-3.5 py-2.5 text-sm ${
              status.complete ? 'bg-brand-50 text-brand-800' : 'bg-amber-50 text-amber-900'
            }`}
            role="status"
          >
            {status.complete
              ? `All ${status.required} answered — your Featured status is active.`
              : `${status.answered} of ${status.required} answered. Featured status starts when all ${status.required} are in; until then your profile shows as a Member.`}
          </p>
          <div className="space-y-4">
            {questions.map((q, i) => {
              const existing = videos.find((v) => v.question_id === q.id)
              return (
                <div key={q.id} className="rounded-xl border border-line bg-paper/60 p-3.5">
                  <p className="mb-2 text-sm font-medium">
                    {i + 1}. {q.question_text}
                  </p>
                  {existing ? (
                    <ExistingVideo video={existing} onRemove={removeVideo} onTranscript={saveTranscript} />
                  ) : (
                    <UploadOrUrlVideo label="Add answer" onSubmit={(src) => addVideo(q.id, src)} />
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function ExistingVideo({
  video,
  onRemove,
  onTranscript,
}: {
  video: VideoResponse
  onRemove: (v: VideoResponse) => Promise<void>
  onTranscript: (v: VideoResponse, transcript: string) => Promise<void>
}) {
  const [transcript, setTranscript] = useState(video.transcript ?? '')
  const [status, setStatus] = useState<string | null>(null)
  return (
    <div>
      <div className="max-w-md">
        <VideoPlayer video={{ ...video, transcript: null }} title="Video preview" />
      </div>
      <div className="mt-2.5">
        <label className="block text-sm">
          <span className="text-xs font-medium">Transcript (optional — for accessibility; never used in ranking)</span>
          <textarea
            rows={2}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <button
            onClick={async () => {
              await onTranscript(video, transcript)
              setStatus('Saved')
              setTimeout(() => setStatus(null), 1500)
            }}
            className="rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:border-brand-400 hover:text-brand-600"
          >
            Save transcript
          </button>
          <button
            onClick={() => onRemove(video)}
            className="flex items-center gap-1 rounded-full border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 size={12} /> Remove video
          </button>
          {status && <span className="text-xs text-emerald-700">{status}</span>}
        </div>
      </div>
    </div>
  )
}

export function UploadOrUrlVideo({
  label,
  onSubmit,
  maxSeconds = VIDEO_MAX_SECONDS,
}: {
  label: string
  onSubmit: (source: { file?: File; url?: string; recordedDuration?: number }) => Promise<void>
  maxSeconds?: number
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const capLabel = `${Math.round(maxSeconds / 60)} min`

  const run = async (source: { file?: File; url?: string; recordedDuration?: number }) => {
    setBusy(true)
    setError(null)
    try {
      await onSubmit(source)
      setUrl('')
      setRecording(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (recording)
    return (
      <RecorderControl
        kind="video"
        maxSeconds={maxSeconds}
        onRecorded={(file, duration) => run({ file, recordedDuration: duration })}
        onCancel={() => setRecording(false)}
      />
    )

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) run({ file: f })
          }}
        />
        <button
          disabled={busy}
          onClick={() => setRecording(true)}
          className="flex items-center justify-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          <Camera size={13} /> {label} — record
        </button>
        <button
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-1.5 rounded-full border border-brand-500 px-4 py-2 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          <Upload size={13} /> {busy ? 'Working…' : `Upload (≤${capLabel})`}
        </button>
        <div className="flex flex-1 gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="…or paste a YouTube / Loom / direct link"
            className="w-full rounded-full border border-line px-3.5 py-2 text-xs outline-none focus:border-brand-400"
          />
          <button
            disabled={busy || !/^https?:\/\/\S+/.test(url)}
            onClick={() => run({ url: url.trim() })}
            className="flex shrink-0 items-center gap-1 rounded-full border border-line px-3.5 py-2 text-xs font-medium text-ink-soft hover:border-ink-faint disabled:opacity-50"
          >
            <Link2 size={12} /> Use link
          </button>
        </div>
      </div>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-faint">
        <Film size={11} /> Recording stops automatically at {capLabel}; uploads are
        duration-checked before saving; caps can't be verified for pasted links.
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
