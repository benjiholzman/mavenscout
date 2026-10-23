import { Camera, Film, Link2, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { uploadVideoFile, VIDEO_MAX_SECONDS } from '../../lib/media'
import { supabase } from '../../lib/supabase'
import type { InterviewQuestion, PortfolioItem, Profile, VideoResponse } from '../../types/db'
import { RecorderControl } from '../media/Recorder'
import { VideoPlayer } from '../media/VideoPlayer'

// Video Q&As editor (PRD 7.5): general intro (both tiers, public teaser),
// 5 standard-question videos + portfolio-attached videos (Featured Member, gated on
// display). Every video: upload to Storage OR paste a URL, hard 2-minute cap
// on uploads (client-side duration check), optional transcript.
// Native in-browser recording is the P1 fast-follow — not built here.

export function VideoQnASection({
  profile,
  portfolio,
}: {
  profile: Profile
  portfolio: PortfolioItem[]
}) {
  const [videos, setVideos] = useState<VideoResponse[] | null>(null)
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])

  const load = async () => {
    const [v, q] = await Promise.all([
      supabase.from('video_responses').select('*').eq('profile_id', profile.id),
      supabase.from('interview_questions').select('*').eq('active', true).order('sort_order'),
    ])
    setVideos((v.data as VideoResponse[]) ?? [])
    setQuestions((q.data as InterviewQuestion[]) ?? [])
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id])

  if (!videos) return <p className="text-sm text-ink-faint">Loading…</p>

  const intro = videos.find((v) => v.kind === 'intro')

  const addVideo = async (
    kind: VideoResponse['kind'],
    source: { file?: File; url?: string; recordedDuration?: number },
    refs: { question_id?: string; portfolio_item_id?: string } = {},
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
      kind,
      video_path,
      video_url,
      duration_seconds,
      ...refs,
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
    <div className="space-y-7">
      <div>
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-faint">
          General introduction — public
        </h3>
        <p className="mb-2.5 text-xs text-ink-faint">
          Your "tell us about yourself" teaser: shows on your public website, to anonymous
          browsers, and as a flip-card face. One per profile, 2 minutes max.
        </p>
        {intro ? (
          <ExistingVideo video={intro} onRemove={removeVideo} onTranscript={saveTranscript} />
        ) : (
          <UploadOrUrlVideo label="Add introduction" onSubmit={(src) => addVideo('intro', src)} />
        )}
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-faint">
          Standard questions — Featured Member
        </h3>
        <p className="mb-2.5 text-xs text-ink-faint">
          Everyone answers the same prompts so hiring managers can compare like with like.
          Visible to logged-in hiring accounts only.
        </p>
        {!profile.is_premium ? (
          <p className="rounded-lg bg-paper px-3.5 py-3 text-sm text-ink-faint">
            A Featured Member benefit — see the Tier section below.
          </p>
        ) : (
          <div className="space-y-4">
            {questions.map((q, i) => {
              const existing = videos.find((v) => v.kind === 'question' && v.question_id === q.id)
              return (
                <div key={q.id} className="rounded-xl border border-line bg-paper/60 p-3.5">
                  <p className="mb-2 text-sm font-medium">
                    {i + 1}. {q.question_text}
                  </p>
                  {existing ? (
                    <ExistingVideo video={existing} onRemove={removeVideo} onTranscript={saveTranscript} />
                  ) : (
                    <UploadOrUrlVideo
                      label="Add answer"
                      onSubmit={(src) => addVideo('question', src, { question_id: q.id })}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-faint">
          Portfolio videos — Featured Member
        </h3>
        <p className="mb-2.5 text-xs text-ink-faint">
          One video per portfolio item, embedded on that project (gated like the Q&As).
        </p>
        {!profile.is_premium ? (
          <p className="rounded-lg bg-paper px-3.5 py-3 text-sm text-ink-faint">
            A Featured Member benefit.
          </p>
        ) : portfolio.length === 0 ? (
          <p className="text-sm text-ink-faint">Add portfolio items first.</p>
        ) : (
          <div className="space-y-4">
            {portfolio.map((item) => {
              const existing = videos.find(
                (v) => v.kind === 'portfolio' && v.portfolio_item_id === item.id,
              )
              return (
                <div key={item.id} className="rounded-xl border border-line bg-paper/60 p-3.5">
                  <p className="mb-2 text-sm font-medium">{item.project_name}</p>
                  {existing ? (
                    <ExistingVideo video={existing} onRemove={removeVideo} onTranscript={saveTranscript} />
                  ) : (
                    <UploadOrUrlVideo
                      label="Attach video"
                      onSubmit={(src) => addVideo('portfolio', src, { portfolio_item_id: item.id })}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
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
