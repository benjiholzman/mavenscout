import { Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  removeEntry,
  savePostInterview,
  setListTag,
  setOutreachTag,
  upsertNoteScore,
} from '../../lib/openings'
import type { MatchResult } from '../../lib/matching/types'
import type { CandidateNoteScore, HiringManager, OpeningEntry, Profile } from '../../types/db'
import { AboutResultModal } from '../match/AboutResultModal'
import { RankStrip } from '../match/RankStrip'

// One candidate inside an opening (PRD 7.4): list-tag star (Top Pick ⊆
// Favorite), independent outreach tag, attributed team notes + 0–5 scores
// with average + rank, the current user's own note/score editor, and the
// bounded post-interview capture. `canParticipate=false` renders every input
// disabled — the share-link view-not-contribute rule.

const OUTREACH: { value: NonNullable<OpeningEntry['outreach_tag']> | ''; label: string }[] = [
  { value: '', label: 'No outreach yet' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interview_scheduled', label: 'Interview scheduled' },
  { value: 'interview_completed', label: 'Interview completed' },
]

function ScoreInput({
  value,
  onChange,
  disabled,
  label,
}: {
  value: number | null
  onChange: (v: number | null) => void
  disabled?: boolean
  label: string
}) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label={label}>
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          disabled={disabled}
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(value === n ? null : n)}
          className={`h-6 w-6 rounded-full text-xs font-semibold transition ${
            value !== null && n <= value
              ? 'bg-brand-500 text-white'
              : 'bg-ink/5 text-ink-faint hover:bg-ink/10'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

export function CandidateRow({
  entry,
  profile,
  notes,
  managers,
  average,
  rank,
  currentAuthorId,
  canParticipate,
  onChanged,
  match,
}: {
  entry: OpeningEntry
  profile: Profile
  notes: CandidateNoteScore[]
  managers: Map<string, HiringManager>
  average: number | null
  rank: number | undefined
  /** null when the viewer has no participating identity (shared view, logged out) */
  currentAuthorId: string | null
  canParticipate: boolean
  onChanged: () => void
  /** The opening's saved AI ranking result for this candidate, if any —
   *  stays visible alongside the human scores, never merged (PRD 7.4/7.7). */
  match?: MatchResult | null
}) {
  const myNote = currentAuthorId ? notes.find((n) => n.author_id === currentAuthorId) : undefined
  const [noteDraft, setNoteDraft] = useState(myNote?.note ?? '')
  const [scoreDraft, setScoreDraft] = useState<number | null>(myNote?.score ?? null)
  const [piNote, setPiNote] = useState(entry.post_interview_note ?? '')
  const [piScore, setPiScore] = useState<number | null>(entry.post_interview_score)
  const [saving, setSaving] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  const otherNotes = notes.filter((n) => n.author_id !== currentAuthorId && (n.note || n.score !== null))

  const saveMine = async () => {
    if (!currentAuthorId) return
    setSaving(true)
    await upsertNoteScore(entry.id, currentAuthorId, noteDraft.trim() || null, scoreDraft)
    setSaving(false)
    onChanged()
  }

  return (
    <div className="rounded-card border border-line bg-white p-4">
      {/* header row */}
      <div className="flex flex-wrap items-center gap-3">
        {profile.photo_url ? (
          <img src={profile.photo_url} alt="" className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {profile.name[0]}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <Link to={`/profile/${profile.handle}`} className="font-semibold hover:text-brand-700">
            {profile.name}
          </Link>
          <p className="truncate text-xs text-ink-soft">{profile.headline}</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {average !== null && (
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
              Team {average}/5{rank && ` · #${rank}`}
            </span>
          )}
          <button
            disabled={!canParticipate}
            onClick={async () => {
              await setListTag(entry.id, entry.list_tag === 'top_pick' ? 'favorite' : 'top_pick')
              onChanged()
            }}
            title={entry.list_tag === 'top_pick' ? 'Unstar (keep in Favorites)' : 'Star (short list)'}
            className="rounded-full p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Star
              size={18}
              className={entry.list_tag === 'top_pick' ? 'fill-gold-500 text-gold-500' : 'text-ink-faint'}
            />
          </button>
          <select
            disabled={!canParticipate}
            value={entry.outreach_tag ?? ''}
            onChange={async (e) => {
              await setOutreachTag(entry.id, (e.target.value || null) as OpeningEntry['outreach_tag'])
              onChanged()
            }}
            className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Outreach status"
          >
            {OUTREACH.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            disabled={!canParticipate}
            onClick={async () => {
              await removeEntry(entry.id)
              onChanged()
            }}
            title="Remove from this opening (removes from both lists)"
            className="rounded-full p-1.5 text-ink-faint hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* The opening's AI ranking — complementary to the human scores below
          (match rework spec §7: rank strip + "About this result"). */}
      {match && (
        <div className="mt-2.5">
          <RankStrip
            variant="row"
            rank={match.rank}
            total={match.total_score}
            band={match.band}
            onAbout={() => setAboutOpen(true)}
          />
          <AboutResultModal
            open={aboutOpen}
            onClose={() => setAboutOpen(false)}
            profile={profile}
            result={match}
            rank={match.rank}
          />
        </div>
      )}

      {/* attributed team notes */}
      {otherNotes.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {otherNotes.map((n) => (
            <div key={n.id} className="rounded-lg bg-paper px-3 py-2 text-sm">
              <span className="font-medium">{managers.get(n.author_id)?.name ?? 'Colleague'}</span>
              {n.score !== null && (
                <span className="ml-1.5 rounded-full bg-white px-1.5 py-0.5 text-xs font-semibold text-brand-700">
                  {n.score}/5
                </span>
              )}
              {n.note && <p className="mt-0.5 text-ink-soft">{n.note}</p>}
            </div>
          ))}
        </div>
      )}

      {/* my note/score */}
      <div className="mt-3 rounded-lg border border-dashed border-line p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {canParticipate ? 'Your note & score' : 'Notes & scores — reviewer access required'}
          </p>
          <ScoreInput value={scoreDraft} onChange={setScoreDraft} disabled={!canParticipate} label="Your score" />
        </div>
        <textarea
          rows={2}
          disabled={!canParticipate}
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder={canParticipate ? 'Add your take…' : 'Ask the opening owner for reviewer access to contribute.'}
          className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:bg-paper disabled:text-ink-faint"
        />
        {canParticipate && (
          <button
            onClick={saveMine}
            disabled={saving}
            className="mt-1.5 rounded-full bg-brand-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save note & score'}
          </button>
        )}
      </div>

      {/* post-interview capture — the deliberate end of the ATS surface */}
      {entry.outreach_tag === 'interview_completed' && (
        <div className="mt-3 rounded-lg bg-brand-50/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              Post-interview
            </p>
            <ScoreInput value={piScore} onChange={setPiScore} disabled={!canParticipate} label="Post-interview score" />
          </div>
          <textarea
            rows={2}
            disabled={!canParticipate}
            value={piNote}
            onChange={(e) => setPiNote(e.target.value)}
            placeholder="How did the interview go?"
            className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:bg-paper"
          />
          {canParticipate && (
            <button
              onClick={async () => {
                await savePostInterview(entry.id, piNote.trim() || null, piScore)
                onChanged()
              }}
              className="mt-1.5 rounded-full bg-brand-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
            >
              Save post-interview
            </button>
          )}
        </div>
      )}
    </div>
  )
}
