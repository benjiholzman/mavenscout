import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { InterviewQuestion } from '../../types/db'

/** Manage the standard Video Q&A question list (Featured Members answer all of
 *  them, profiles-membership §5). There is no general intro video. */
export function QuestionsManager() {
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null)
  const [draft, setDraft] = useState('')

  const load = () =>
    supabase
      .from('interview_questions')
      .select('*')
      .order('sort_order')
      .then(({ data }) => setQuestions((data as InterviewQuestion[]) ?? []))
  useEffect(() => {
    load()
  }, [])

  if (!questions) return <p className="text-sm text-ink-faint">Loading…</p>

  return (
    <div className="max-w-3xl space-y-3">
      {questions.map((q, i) => (
        <div key={q.id} className="flex items-start gap-3 rounded-lg border border-line bg-white p-3">
          <span className="mt-1.5 text-xs font-bold text-ink-faint">{i + 1}</span>
          <textarea
            defaultValue={q.question_text}
            rows={2}
            onBlur={async (e) => {
              if (e.target.value !== q.question_text && e.target.value.trim()) {
                await supabase.from('interview_questions').update({ question_text: e.target.value.trim() }).eq('id', q.id)
                load()
              }
            }}
            className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm hover:border-line focus:border-brand-400 focus:outline-none"
          />
          <label className="mt-1 flex shrink-0 items-center gap-1.5 text-xs text-ink-soft">
            <input
              type="checkbox"
              checked={q.active}
              onChange={async (e) => {
                await supabase.from('interview_questions').update({ active: e.target.checked }).eq('id', q.id)
                load()
              }}
              className="accent-brand-500"
            />
            active
          </label>
        </div>
      ))}
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!draft.trim()) return
          await supabase.from('interview_questions').insert({
            question_text: draft.trim(),
            sort_order: questions.length + 1,
          })
          setDraft('')
          load()
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="New standard question…"
          className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
        <button type="submit" className="flex items-center gap-1 rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
          <Plus size={14} /> Add
        </button>
      </form>
    </div>
  )
}
