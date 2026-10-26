import { FileText, Sparkles } from 'lucide-react'
import { JD_MAX_CHARS, JD_MIN_CHARS } from '../../lib/matching/config'

// The job description (match rework spec §2): step 2 of the priorities
// modal, optional (§11).
// Paste only this branch. FUTURE: a docx/PDF upload should FILL this textarea
// (not bypass it), so the manager sees — and can trim — the extracted text
// before it's read.

const fmt = (n: number) => n.toLocaleString('en-US')

export function JdStep({
  text,
  onText,
  collapsed,
  onEdit,
  onRead,
  reading,
}: {
  text: string
  onText: (text: string) => void
  /** After "Read job description" the textarea collapses to a preview. */
  collapsed: boolean
  onEdit: () => void
  onRead: () => void
  reading: boolean
}) {
  const length = text.length
  const short = length < JD_MIN_CHARS

  if (collapsed)
    return (
      <div className="rounded-xl border border-line bg-white p-3">
        <div className="flex items-start gap-2">
          <FileText size={15} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
          <p className="line-clamp-3 min-w-0 flex-1 whitespace-pre-line text-xs leading-relaxed text-ink-soft">
            {text}
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-faint">
          <span>{fmt(length)} characters</span>
          <button type="button" onClick={onEdit} className="font-medium text-brand-600 hover:text-brand-700">
            Edit
          </button>
        </div>
      </div>
    )

  return (
    <div>
      {/* The step heading already says "Job description". */}
      <label htmlFor="jd-text" className="sr-only">
        Job description
      </label>
      <p className="text-xs leading-snug text-ink-faint">
        Paste the scope of work and qualifications sections. You can paste the full ToR — we'll pull
        out what matters.
      </p>
      <p className="mt-1 text-xs font-medium leading-snug text-ink-soft">
        No job description? Go back to your priorities and choose See my matches.
      </p>
      <textarea
        id="jd-text"
        rows={8}
        maxLength={JD_MAX_CHARS}
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder="Paste the job description or Terms of Reference…"
        className="mt-2 w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-400"
      />
      <div className="mt-1 flex items-center justify-between text-[11.5px]">
        <span className={short && length > 0 ? 'text-gold-700' : 'text-ink-faint'}>
          {short && length > 0 ? `${fmt(JD_MIN_CHARS - length)} more characters needed` : ' '}
        </span>
        <span className={length >= JD_MAX_CHARS ? 'font-medium text-gold-700' : 'text-ink-faint'} aria-live="polite">
          {fmt(length)} / {fmt(JD_MAX_CHARS)}
        </span>
      </div>
      <button
        type="button"
        disabled={short || reading}
        onClick={onRead}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-brand-200 bg-brand-100 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles size={14} aria-hidden />
        {reading ? 'Reading…' : 'Read job description'}
      </button>
    </div>
  )
}
