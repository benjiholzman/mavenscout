import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { MatchComponent, MatchSubScore } from '../../types/db'

// Expandable component breakdown + narrative (PRD 7.7) — shown on ranked
// directory results and alongside candidates inside an opening.

const LABELS: Record<MatchComponent, string> = {
  demonstrated_experience: 'Demonstrated experience',
  domain_expertise: 'Domain expertise',
  technical_skills: 'Technical skills',
  organizational_history: 'Organizational history',
  location: 'Location',
  language: 'Language',
  availability: 'Availability',
  consultant_type: 'Firm vs. individual',
}

export function MatchScoreBadge({ score, prominent }: { score: number; prominent: boolean }) {
  return (
    <span
      className={
        prominent
          ? 'rounded-full bg-ink px-3 py-1 text-sm font-bold text-white'
          : 'rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-semibold text-ink-soft'
      }
      title="AI match score (placeholder engine this build)"
    >
      {score}
      <span className={prominent ? 'text-white/60' : 'text-ink-faint'}>/100</span>
    </span>
  )
}

export function MatchBreakdown({
  subScores,
  narrative,
  defaultOpen = false,
}: {
  subScores: MatchSubScore[] | null
  narrative: string | null
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
      >
        <ChevronDown size={13} className={open ? 'rotate-180 transition' : 'transition'} />
        {open ? 'Hide match breakdown' : 'Why this score?'}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg bg-paper p-3">
          {(subScores ?? []).map((s) => (
            <div key={s.component}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium">
                  {LABELS[s.component]}
                  {s.org_tier && (
                    <span className="ml-1 text-ink-faint">({s.org_tier} org)</span>
                  )}
                </span>
                <span className="font-semibold text-ink-soft">{s.score}/100</span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${s.score}%` }} />
              </div>
              {s.detail && <p className="mt-0.5 text-[11px] text-ink-faint">{s.detail}</p>}
            </div>
          ))}
          {narrative && (
            <p className="border-t border-line pt-2 text-xs leading-relaxed text-ink-soft">
              {narrative}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
