import { computeAdjustments, mustHavesPassed } from '../../../../src/lib/matching/adjustments'
import { bandFor } from '../../../../src/lib/matching/config'
import { preferenceScoring, totalScore } from '../../../../src/lib/matching/total'
import type { CandidateInput } from '../../../../src/lib/matching/fit'
import type { Adjustment, Band, Requirement, Scoring } from '../../../../src/lib/matching/types'
import type { ExpertiseIndex } from '../../../../src/lib/expertise'
import type { OrgIndex } from '../../../../src/lib/organizations'

export interface ScoreInputs {
  candidate: CandidateInput
  requirements: Requirement[]
  expertise: ExpertiseIndex
  orgs: OrgIndex
}

export interface CandidateScore {
  adjustments: Adjustment[]
  scoring: Scoring
  must_haves_passed: { requirement_id: string; label: string }[]
  total_score: number
  band: Band
}

/** Everything except Fit, from the app's own functions, so engine and app agree.
 *  Reads only this candidate, never the rest of the pool. */
export function scoreCandidate(fit: number, inputs: ScoreInputs): CandidateScore {
  const { candidate, requirements, expertise, orgs } = inputs
  const adjustments = computeAdjustments(candidate, requirements, expertise, orgs)
  const scoring = preferenceScoring(adjustments)
  const total_score = totalScore(Math.round(fit), scoring)
  return {
    adjustments,
    scoring,
    must_haves_passed: mustHavesPassed(candidate, requirements, orgs),
    total_score,
    band: bandFor(total_score),
  }
}
