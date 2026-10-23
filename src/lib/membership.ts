import { MEMBERSHIP_LIMITS } from './config'
import type { InterviewQuestion, Profile, VideoResponse } from '../types/db'

// Member / Featured Member (docs/MavenScout-profiles-membership.md §2).
//
// `is_premium` (internal name kept) records that the member chose Featured.
// Featured status itself starts only once all standard Video Q&As are in;
// until then the profile is shown, capped and placed as a Member. Everything
// Featured — the gold card, browse placement, the Video Q&A tab, the
// "Video Q&As only" filter, custom domain and the higher caps — reads
// isFeatured(). Membership never affects AI rank.

export type MembershipLevel = 'member' | 'featured'

export const MEMBERSHIP_LABELS: Record<MembershipLevel, string> = {
  member: 'Member',
  featured: 'Featured Member',
}

export interface VideoQnaStatus {
  answered: number
  required: number
  /** Every active standard question has an answer. False when no questions
   *  are active, so Featured can't start by accident. */
  complete: boolean
}

type QuestionVideo = Pick<VideoResponse, 'profile_id' | 'kind' | 'question_id'>

/** How many of the active standard questions one profile has answered. */
export function videoQnaStatus(
  profileId: string,
  videos: QuestionVideo[],
  questions: Pick<InterviewQuestion, 'id'>[],
): VideoQnaStatus {
  const answered = new Set(
    videos.filter((v) => v.profile_id === profileId && v.kind === 'question').map((v) => v.question_id),
  )
  const n = questions.filter((q) => answered.has(q.id)).length
  return { answered: n, required: questions.length, complete: questions.length > 0 && n === questions.length }
}

/** Sets the derived `video_qnas_complete` on each profile. */
export function withVideoQnaStatus<P extends Profile>(
  profiles: P[],
  videos: QuestionVideo[],
  questions: Pick<InterviewQuestion, 'id'>[],
): P[] {
  return profiles.map((p) => ({ ...p, video_qnas_complete: videoQnaStatus(p.id, videos, questions).complete }))
}

/** Featured status is active: chose Featured and every Video Q&A is in. */
export function isFeatured(p: Profile): boolean {
  return p.is_premium && !!p.video_qnas_complete
}

/** Chose Featured, still recording: shown as a Member until the videos are in. */
export function isFeaturedPending(p: Profile): boolean {
  return p.is_premium && !p.video_qnas_complete
}

export function membershipLevel(p: Profile): MembershipLevel {
  return isFeatured(p) ? 'featured' : 'member'
}

export function membershipLimits(p: Profile) {
  return MEMBERSHIP_LIMITS[membershipLevel(p)]
}
