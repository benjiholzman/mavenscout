import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { resolveVideo, type VideoSource } from '../../lib/media'

export function TranscriptDisclosure({ transcript }: { transcript: string | null }) {
  const [open, setOpen] = useState(false)
  if (!transcript) return null
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
      >
        <ChevronDown size={14} className={open ? 'rotate-180 transition' : 'transition'} />
        {open ? 'Hide transcript' : 'Show transcript'}
      </button>
      {open && (
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-paper p-3 text-sm leading-relaxed text-ink-soft">
          {transcript}
        </p>
      )}
    </div>
  )
}

export function VideoPlayer({ video, title }: { video: VideoSource & { transcript?: string | null }; title: string }) {
  const playable = resolveVideo(video)
  return (
    <div>
      <div className="overflow-hidden rounded-xl bg-ink">
        {playable?.kind === 'embed' ? (
          <iframe
            src={playable.src}
            title={title}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : playable ? (
          <video src={playable.src} controls className="aspect-video w-full" preload="metadata" />
        ) : (
          <p className="p-6 text-center text-sm text-white/60">Video unavailable</p>
        )}
      </div>
      <TranscriptDisclosure transcript={video.transcript ?? null} />
    </div>
  )
}
