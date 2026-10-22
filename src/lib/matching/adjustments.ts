import { matchesAvailability, matchesLocation, locationLabel, type AvailabilityFilter } from '../filters'
import { orgHistoryOutcome } from '../requirements/match'
import { rowHasValue } from '../requirements/model'
import { AVAILABILITY_GRACE_MONTHS, CREDIT, PREFERENCE_POINTS } from './config'
import { evidenceText, tagCredit, type CandidateInput, type TagIndex } from './fit'
import { containsTerm, normalizeText } from './text'
import type { Adjustment, Outcome, PreferenceLevel, Requirement, RequirementOf } from './types'

// ============================================================================
// ⚠ PLACEHOLDER ADJUSTMENTS (docs/MavenScout-match-rework.md §3, §5.3).
// Every Slight/Strong row becomes one Adjustment: met → full points, partial
// → points × credit, not met / not applicable → 0. Must-have rows add no
// points (they've already filtered the pool). Point values and credits live in
// config.ts. The real engine may judge outcomes differently; the Adjustment
// shape is the contract.
// ============================================================================

export interface TaxonomyIndex {
  expertise: TagIndex
  skills: TagIndex
}

const or = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`

const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

/** Plain-language label for a row ("Based in Kenya", "Speaks French"). */
export function requirementLabel(r: Requirement): string {
  switch (r.kind) {
    case 'expertise':
    case 'skill':
      return r.value.level === 'category' ? `${r.value.name} (broad)` : r.value.name
    case 'org_history': {
      const scope = { current: 'Currently at', ever: 'Ever at', ever_or_peer: 'At' }[r.value.scope]
      return r.value.scope === 'ever_or_peer' ? `${scope} ${r.value.org} or a peer` : `${scope} ${r.value.org}`
    }
    case 'location':
      return `Based in ${or(r.value.values.map(locationLabel))}`
    case 'language':
      return `Speaks ${or(r.value.values)}`
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
    case 'verified':
      return 'Verified'
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

function judgeTag(
  c: CandidateInput,
  r: RequirementOf<'expertise'> | RequirementOf<'skill'>,
  index: TaxonomyIndex,
  evidence: string,
): Judged {
  const kindWord = r.kind === 'expertise' ? 'expertise' : 'skill'
  const tags = r.kind === 'expertise' ? c.profile.expertise : c.profile.skills
  const idx = r.kind === 'expertise' ? index.expertise : index.skills
  const { credit, via, parentOnly } = tagCredit(tags, r.value, idx)
  if (via && !parentOnly) {
    const tier = via.tier === 'primary' ? 'primary' : 'secondary'
    const how = via.name === r.value.name ? '' : ` (${via.name})`
    return { outcome: 'met', credit, detail: `Tagged as ${tier} ${kindWord}${how}` }
  }
  if (via && parentOnly) return { outcome: 'partial', credit, detail: `Tagged only the broader ${via.name}` }
  // Evidence beyond tags: the term (or, for a category, any item under it)
  // appears in bio / portfolio / accreditations.
  const terms =
    r.value.level === 'category' ? [r.value.name, ...(idx.childrenOf.get(r.value.name) ?? [])] : [r.value.name]
  if (terms.some((t) => containsTerm(evidence, t)))
    return { outcome: 'partial', credit: CREDIT.textEvidence, detail: 'Not tagged, but mentioned in bio or portfolio' }
  return { outcome: 'not_met', credit: 0, detail: 'Not tagged or mentioned' }
}

function judge(c: CandidateInput, r: Requirement, index: TaxonomyIndex, evidence: string): Judged {
  const p = c.profile
  const met = (detail: string): Judged => ({ outcome: 'met', credit: 1, detail })
  const notMet = (detail: string): Judged => ({ outcome: 'not_met', credit: 0, detail })
  switch (r.kind) {
    case 'expertise':
    case 'skill':
      return judgeTag(c, r, index, evidence)
    case 'org_history': {
      const o = orgHistoryOutcome(p, r.value)
      return { outcome: o.outcome, credit: o.outcome === 'met' ? 1 : o.outcome === 'partial' ? CREDIT.otherPartial : 0, detail: o.detail }
    }
    case 'location':
      return matchesLocation(p.location, r.value.values)
        ? met(`Based in ${p.location}`)
        : notMet(p.location ? `Based in ${p.location}` : 'No location listed')
    case 'language': {
      const hit = r.value.values.filter((l) => p.languages.includes(l))
      return hit.length ? met(`Speaks ${hit.join(', ')}`) : notMet(`Doesn't list ${or(r.value.values)}`)
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
    case 'verified':
      return p.verification_status === 'verified' ? met('Passed evidence-based vetting') : notMet('Not verified')
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
  index: TaxonomyIndex,
): Adjustment[] {
  const evidence = normalizeText(evidenceText(c))
  return requirements
    .filter((r): r is Requirement & { level: PreferenceLevel } => (r.level === 'slight' || r.level === 'strong') && rowHasValue(r))
    .map((r) => {
      const j = judge(c, r, index, evidence)
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

/** Must-have rows the candidate meets (they passed the pre-filter, so all
 *  of them except same-kind expertise/skill rows, which are "any of"). */
export function mustHavesPassed(
  c: CandidateInput,
  requirements: Requirement[],
  index: TaxonomyIndex,
): { requirement_id: string; label: string }[] {
  return requirements
    .filter((r) => r.level === 'must' && rowHasValue(r))
    .filter((r) => {
      if (r.kind !== 'expertise' && r.kind !== 'skill') return true
      // Filter-bar semantics: a category matches its own tag or any child tag;
      // an item needs the exact tag.
      const tags = r.kind === 'expertise' ? c.profile.expertise : c.profile.skills
      const idx = r.kind === 'expertise' ? index.expertise : index.skills
      return tags.some(
        (t) =>
          t.name === r.value.name ||
          (r.value.level === 'category' && idx.parentOf.get(t.name) === r.value.name),
      )
    })
    .map((r) => ({
      requirement_id: r.id,
      label: r.kind === 'expertise' || r.kind === 'skill' ? `${r.kind === 'expertise' ? 'Expertise' : 'Skill'}: ${requirementLabel(r)}` : requirementLabel(r),
    }))
}
