import { useEffect, useState } from 'react'
import { withVideoQnaStatus } from '../lib/membership'
import { supabase } from '../lib/supabase'
import type {
  AudioTestimonial,
  InterviewQuestion,
  PortfolioItem,
  Profile,
  VerificationCheck,
  VideoResponse,
} from '../types/db'

export interface ProfileData {
  profile: Profile
  portfolio: PortfolioItem[]
  videos: VideoResponse[]
  /** Published testimonials only — pending/removed never leave the editor/admin. */
  testimonials: AudioTestimonial[]
  questions: InterviewQuestion[]
  /** Verification decisions, for the labels (spec §3.1): outcome, method,
   *  date and fingerprint only — no notes, names or evidence details. */
  checks: VerificationCheck[]
}

/** The columns labels need; the rest stay with the editor and admin. */
const LABEL_COLUMNS = 'id,profile_id,item_kind,item_id,item_fingerprint,outcome,method,created_at'

/** Loads one public profile by handle. Only approved + active profiles
 *  resolve (app-level enforcement of directory visibility — see 000_schema.sql).
 *  Returns `notFound` for unknown handles or unpublished profiles. */
export function useProfile(handle: string | undefined) {
  const [data, setData] = useState<ProfileData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!handle) return
    let cancelled = false
    setData(null)
    setNotFound(false)

    async function load() {
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('handle', handle!)
        .eq('approval_status', 'approved')
        .eq('subscription_status', 'active')
        .maybeSingle()
      if (cancelled) return
      if (pErr) return setError(pErr.message)
      if (!profile) return setNotFound(true)

      const [portfolioRes, videosRes, testimonialsRes, questionsRes, checksRes] = await Promise.all([
        supabase.from('portfolio_items').select('*').eq('profile_id', profile.id).order('sort_order'),
        supabase.from('video_responses').select('*').eq('profile_id', profile.id),
        supabase
          .from('audio_testimonials')
          .select('*')
          .eq('profile_id', profile.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase.from('interview_questions').select('*').eq('active', true).order('sort_order'),
        supabase
          .from('verification_checks')
          .select(LABEL_COLUMNS)
          .eq('profile_id', profile.id)
          .in('outcome', ['confirmed', 'document_reviewed', 'unverifiable']),
      ])
      if (cancelled) return
      const firstError =
        portfolioRes.error ?? videosRes.error ?? testimonialsRes.error ?? questionsRes.error ?? checksRes.error
      if (firstError) return setError(firstError.message)

      const questions = questionsRes.data as InterviewQuestion[]
      const videos = videosRes.data as VideoResponse[]
      setData({
        // Featured status needs every standard Video Q&A (lib/membership).
        profile: withVideoQnaStatus([profile as Profile], videos, questions)[0],
        portfolio: portfolioRes.data as PortfolioItem[],
        videos,
        testimonials: testimonialsRes.data as AudioTestimonial[],
        questions,
        checks: ((checksRes.data ?? []) as Partial<VerificationCheck>[]).map(
          (c) => ({ detail: {}, item_summary: null, actor: 'admin', actor_name: null, ...c }) as VerificationCheck,
        ),
      })
    }
    load()
    return () => {
      cancelled = true
    }
  }, [handle])

  return { data, notFound, error }
}
