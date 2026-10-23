import type {
  AdditionalExperienceEntry,
  EducationEntry,
  WorkHistoryEntry,
} from '../../types/db'
import {
  AdditionalExperienceEditor,
  EducationEditor,
  WorkHistoryEditor,
  type EntryTestimonialStatus,
} from './HistoryEditors'

/** Groups the three history editors with the firm-conditional rule (PRD 7.19):
 *  firms skip Work History + Education (Portfolio is their track record). */
export function HistoryEditorsBundle({
  isFirm,
  workHistory,
  education,
  additional,
  caps,
  onWork,
  onEducation,
  onAdditional,
  testimonials,
}: {
  isFirm: boolean
  workHistory: WorkHistoryEntry[]
  education: EducationEntry[]
  additional: AdditionalExperienceEntry[]
  caps: { work: number; education: number; additional: number }
  onWork: (v: WorkHistoryEntry[]) => void
  onEducation: (v: EducationEntry[]) => void
  onAdditional: (v: AdditionalExperienceEntry[]) => void
  /** Audio testimonial status per work-history entry id. */
  testimonials?: Record<string, EntryTestimonialStatus>
}) {
  return (
    <div className="space-y-7">
      {!isFirm && (
        <div>
          <h3 className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-ink-faint">
            Work history
          </h3>
          <WorkHistoryEditor value={workHistory} onChange={onWork} cap={caps.work} testimonials={testimonials} />
        </div>
      )}
      {!isFirm && (
        <div>
          <h3 className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-ink-faint">
            Education
          </h3>
          <EducationEditor value={education} onChange={onEducation} cap={caps.education} />
        </div>
      )}
      <div>
        <h3 className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-ink-faint">
          Additional experience
        </h3>
        <p className="-mt-1.5 mb-2.5 text-xs text-ink-faint">
          Volunteer work, board/advisory roles, fellowships — timeline roles that aren't paid
          employment or degrees (showcased deliverables belong in Portfolio).
        </p>
        <AdditionalExperienceEditor value={additional} onChange={onAdditional} cap={caps.additional} />
      </div>
    </div>
  )
}
