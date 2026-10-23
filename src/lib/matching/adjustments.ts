import { countedTiers, expertiseTags, type ExpertiseIndex } from '../expertise'
import { matchesAvailability, matchesLocation, locationLabel, type AvailabilityFilter } from '../filters'
import { speaks } from '../languages'
import type { OrgIndex } from '../organizations'
import { orgHistoryOutcome, orgNames } from '../requirements/match'
import { rowHasValue } from '../requirements/model'
import { AVAILABILITY_GRACE_MONTHS, CREDIT, PREFERENCE_POINTS } from './config'
import { evidenceText, type CandidateInput } from './fit'
import { containsTerm, normalizeText } from './text'
import type { Adjustment, Outcome, PreferenceLevel, Requirement, RequirementOf } from './types'
import type { ExpertiseTier } from '../../types/db'

// ============================================================================
// ⚠ PLACEHOLDER ADJUSTMENTS (docs/MavenScout-match-rework.md §3, §5.3).
// Every Slight/Strong row becomes one Adjustment: met → full points, partial
// → points × credit, not met / not applicable → 0. Must-have rows add no
// points (they've already filtered the pool). Point values and credits live in
// config.ts. The real engine may judge outcomes differently; the Adjustment
// shape is the contract.
// ============================================================================

const or = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`

const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

/** Plain-language label for a row ("Based in Kenya", "Speaks French"). */
export function requirementLabel(r: Requirement): string {
  switch (r.kind) {
    case 'expertise':
      return r.value.name
    case 'org_history': {
      const scope = { current: 'Currently at', ever: 'Ever at', ever_or_peer: 'At' }[r.value.scope]
      return r.value.scope === 'ever_or_peer' ? `${scope} ${orgNames(r.value)} or a peer` : `${scope} ${orgNames(r.value)}`
    }
    case 'location':
      return `Based in ${or(r.value.values.map(locationLabel))}`
    case 'language':
      return `Speaks ${or(r.value.values)}${r.value.min === 'fluent' ? ' fluently' : ''}`
    case 'type':
      return or(r.value.values)
    case 'availability': {
      const eng = { either: 'Available', part_time: 'Part-time', full_time: 'Full-time' }[r.value.engagement]
      if (r.value.untilMonth) return `${eng} by ${monthLabel(r.value.untilMonth)}`
      if (r.value.fromMonth) return `${eng} from ${monthLabel(r.value.fromMonth)}`
      return eng === 'Available' ? 'Available' : `Available ${eng.toLowerCase()}`
    }
    case 'career_level':
      return or(
        r.value.values.map((v) => ({ early_career: 'Early career', mid_career: 'Mid-career', senior: 'Senior' })[v] ?? v),
      )
    case 'video_qna':
      return 'Video Q&As only'
    case 'audio_testimonial':
      return 'Audio testimonials only'
    case 'work_arrangement':
      return `Works ${or(r.value.values)}`
  }
}

function addMonths(ym: string, n: number): string {
  const d = new Date(`${ym}-01T00:00:00`)
  d.setMonth(d.getMonth() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Availability "within one month after the target" → partial (spec §3.1). */
function graceWindow(v: AvailabilityFilter): AvailabilityFilter | null {
  if (v.untilMonth) return { ...v, untilMonth: addMonths(v.untilMonth, AVAILABILITY_GRACE_MONTHS) }
  if (v.fromMonth) return { ...v, untilMonth: addMonths(v.fromMonth, AVAILABILITY_GRACE_MONTHS) }
  return null // "any time" has no target to miss by a month
}

interface Judged {
  outcome: Outcome
  credit: number // multiplier for met/partial
  detail: string
}

const TIER_DETAIL: Record<ExpertiseTier, string> = {
  core: 'Tagged as Core expertise',
  strong: 'Tagged as Strong',
  working: 'Tagged as Working knowledge',
}

/** Expertise row (profiles-membership §6): Core → met ×1, Strong → met
 *  ×0.75, Working knowledge → partial ×0.4. Evidence beyond tags: the item (or
 *  an old name it absorbed) in bio / portfolio / accreditations → partial
 *  ×0.4. The row takes the better of tag credit and text credit, so an
 *  untagged mention never outscores a tag. */
function judgeTag(c: CandidateInput, r: RequirementOf<'expertise'>, index: ExpertiseIndex, evidence: string): Judged {
  const tag = expertiseTags(c.profile).find((t) => t.name === r.value.name)
  const terms = [r.value.name, ...(index.byName.get(r.value.name)?.legacyNames ?? [])]
  const textCredit = terms.some((t) => containsTerm(evidence, t)) ? CREDIT.textEvidence : 0
  const tagCredit = tag ? CREDIT[tag.tier] : 0
  if (tag && tagCredit >= textCredit)
    return { outcome: tag.tier === 'working' ? 'partial' : 'met', credit: tagCredit, detail: TIER_DETAIL[tag.tier] }
  if (textCredit > 0)
    return { outcome: 'partial', credit: textCredit, detail: 'Not tagged, but mentioned in bio or portfolio' }
  return { outcome: 'not_met', credit: 0, detail: 'Not tagged or mentioned' }
}

function judge(c: CandidateInput, r: Requirement, index: ExpertiseIndex, orgs: OrgIndex, evidence: string): Judged {
  const p = c.profile
  const met = (detail: string): Judged => ({ outcome: 'met', credit: 1, detail })
  const notMet = (detail: string): Judged => ({ outcome: 'not_met', credit: 0, detail })
  switch (r.kind) {
    case 'expertise':
      return judgeTag(c, r, index, evidence)
    case 'org_history': {
      const o = orgHistoryOutcome(p, r.value, orgs)
      return { outcome: o.outcome, credit: o.outcome === 'met' ? 1 : o.outcome === 'partial' ? CREDIT.otherPartial : 0, detail: o.detail }
    }
    case 'location':
      return matchesLocation(p.location, r.value.values)
        ? met(`Based in ${p.location}`)
        : notMet(p.location ? `Based in ${p.location}` : 'No location listed')
    case 'language': {
      // Fluent satisfies Working. A row asking for Fluent gives partial credit
      // to someone who speaks the language at Working level.
      const min = r.value.min ?? 'working'
      const hit = speaks(p, r.value.values, min)
      if (hit.length) return met(`Speaks ${hit.map((l) => l.name).join(', ')}${min === 'fluent' ? ' fluently' : ''}`)
      const working = min === 'fluent' ? speaks(p, r.value.values, 'working') : []
      if (working.length)
        return {
          outcome: 'partial',
          credit: CREDIT.otherPartial,
          detail: `Speaks ${working.map((l) => l.name).join(', ')} at working level`,
        }
      return notMet(`Doesn't list ${or(r.value.values)}`)
    }
    case 'type':
      return r.value.values.includes(p.consultant_type) ? met(p.consultant_type) : notMet(p.consultant_type)
    case 'availability': {
      if (matchesAvailability(p, r.value)) return met('Available in the requested window')
      const grace = graceWindow(r.value)
      if (grace && matchesAvailability(p, grace))
        return { outcome: 'partial', credit: CREDIT.otherPartial, detail: 'Available within a month after the target' }
      return notMet('Not available in the requested window')
    }
    case 'career_level': {
      if (p.consultant_type !== 'Individual')
        return { outcome: 'not_applicable', credit: 0, detail: 'Not applicable to firms' }
      const label = { early_career: 'Early career', mid_career: 'Mid-career', senior: 'Senior' }
      const own = p.career_level ? label[p.career_level] : 'No career level listed'
      return p.career_level && r.value.values.includes(p.career_level) ? met(own) : notMet(own)
    }
    case 'video_qna':
    case 'audio_testimonial':
      // Required only (normalizeRequirements): membership and testimonials
      // never add points.
      return { outcome: 'not_applicable', credit: 0, detail: 'A filter only; never scored' }
    case 'work_arrangement': {
      const hit = r.value.values.filter((w) => p.work_types.includes(w))
      return hit.length ? met(`Works ${hit.join(', ')}`) : notMet(`Works ${p.work_types.join(', ') || '—'}`)
    }
  }
}

/** One Adjustment per Slight/Strong row that has a value. */
export function computeAdjustments(
  c: CandidateInput,
  requirements: Requirement[],
  index: ExpertiseIndex,
  orgs: OrgIndex,
): Adjustment[] {
  const evidence = normalizeText(evidenceText(c))
  return requirements
    .filter((r): r is Requirement & { level: PreferenceLevel } => (r.level === 'slight' || r.level === 'strong') && rowHasValue(r))
    .map((r) => {
      const j = judge(c, r, index, orgs, evidence)
      const points = j.outcome === 'met' || j.outcome === 'partial' ? PREFERENCE_POINTS[r.level] * j.credit : 0
      return {
        requirement_id: r.id,
        label: requirementLabel(r),
        level: r.level,
        outcome: j.outcome,
        points,
        detail: j.detail,
      }
    })
}

/** Must-have rows the candidate meets. They passed the pre-filter, so that is
 *  all of them except expertise rows, which are "any of" within a kind: list
 *  only the items the candidate holds at a counted tier. */
export function mustHavesPassed(c: CandidateInput, requirements: Requirement[]): { requirement_id: string; label: string }[] {
  const tags = expertiseTags(c.profile)
  return requirements
    .filter((r) => r.level === 'must' && rowHasValue(r))
    .filter(
      (r) =>
        r.kind !== 'expertise' ||
        tags.some((t) => t.name === r.value.name && countedTiers(!!r.value.includeWorking).includes(t.tier)),
    )
    .map((r) => ({
      requirement_id: r.id,
      label: r.kind === 'expertise' ? `Expertise: ${requirementLabel(r)}` : requirementLabel(r),
    }))
}
