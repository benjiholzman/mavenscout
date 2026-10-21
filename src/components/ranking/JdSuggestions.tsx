import { Check, Plus } from 'lucide-react'
import { locationLabel } from '../../lib/filters'
import { MAX_TAG_ROWS } from '../../lib/matching/config'
import type { ExtractedRequirements, Requirement } from '../../lib/matching/types'
import { isSuggestionAdded, isSuggestionBlocked, tagRowCount, type Suggestion } from '../../lib/requirements/model'

// "Found in your JD" (match rework spec §2, Step 2): extraction SUGGESTS rows;
// nothing enters the grid until the manager adds it. Each chip shows how often
// the JD mentions it; added suggestions become Nice to have rows tagged
// "from JD".

function suggestionLabel(s: Suggestion): string {
  if ('tag' in s) return s.tag.level === 'category' ? `${s.tag.name} (broad)` : s.tag.name
  return s.kind === 'location' ? locationLabel(s.item.value) : s.item.value
}

const mentions = (s: Suggestion) => ('tag' in s ? s.tag.mentions : s.item.mentions)

export function suggestionsFrom(extracted: ExtractedRequirements): { title: string; items: Suggestion[] }[] {
  return [
    { title: 'Expertise', items: extracted.expertise.map((tag) => ({ kind: 'expertise' as const, tag })) },
    { title: 'Skills', items: extracted.skills.map((tag) => ({ kind: 'skill' as const, tag })) },
    { title: 'Locations', items: extracted.locations.map((item) => ({ kind: 'location' as const, item })) },
    { title: 'Languages', items: extracted.languages.map((item) => ({ kind: 'language' as const, item })) },
  ].filter((g) => g.items.length > 0)
}

export function JdSuggestions({
  extracted,
  requirements,
  onAdd,
}: {
  extracted: ExtractedRequirements
  requirements: Requirement[]
  onAdd: (suggestions: Suggestion[]) => void
}) {
  const groups = suggestionsFrom(extracted)
  const atCap = tagRowCount(requirements) >= MAX_TAG_ROWS
  const pending = groups
    .flatMap((g) => g.items)
    .filter((s) => !isSuggestionAdded(requirements, s) && !isSuggestionBlocked(requirements, s))
  const addable = pending.filter((s) => !('tag' in s) || !atCap)

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Found in your JD</p>
        {addable.length > 0 && (
          <button
            type="button"
            onClick={() => onAdd(addable)}
            className="text-xs font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-600"
          >
            Add all
          </button>
        )}
      </div>
      {groups.length === 0 ? (
        <p className="mt-1 text-xs text-ink-faint">
          Nothing from the expertise and skills list, or known places and languages, was found in
          this text. Add requirements below.
        </p>
      ) : (
        <>
          <p className="mt-0.5 text-[11.5px] leading-snug text-ink-faint">
            Suggestions only — add the ones that matter. They join the grid as Nice to have.
          </p>
          <div className="mt-2.5 space-y-2.5">
            {groups.map((g) => (
              <div key={g.title}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{g.title}</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((s) => {
                    const label = suggestionLabel(s)
                    const count = `(${mentions(s)}×)`
                    if (isSuggestionAdded(requirements, s))
                      return (
                        <span
                          key={label}
                          className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs text-ink-faint"
                        >
                          <Check size={12} aria-hidden /> {label}
                          <span className="sr-only">added</span>
                        </span>
                      )
                    const capped = 'tag' in s && atCap
                    const blocked = isSuggestionBlocked(requirements, s)
                    return (
                      <button
                        key={label}
                        type="button"
                        disabled={capped || blocked}
                        title={
                          blocked
                            ? `Your ${s.kind === 'location' ? 'Location' : 'Language'} row is Required — edit that row to change it`
                            : capped
                              ? `Up to ${MAX_TAG_ROWS} expertise and skill rows`
                              : undefined
                        }
                        onClick={() => onAdd([s])}
                        className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-xs font-medium text-ink hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plus size={12} className="text-brand-600" aria-hidden />
                        {label} <span className="font-normal text-ink-faint">{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
