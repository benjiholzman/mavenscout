import { useEffect, useMemo, useState } from 'react'
import { isListed } from '../lib/listing'
import { withVideoQnaStatus } from '../lib/membership'
import { loadOrgIndex, type OrgIndex } from '../lib/organizations'
import { supabase } from '../lib/supabase'
import type {
  AudioTestimonial,
  InterviewQuestion,
  PortfolioItem,
  Profile,
  TaxonomyCategory,
  TaxonomyItem,
  VideoResponse,
} from '../types/db'

export interface DirectoryData {
  profiles: Profile[]
  portfolioByProfile: Map<string, PortfolioItem[]>
  audioCountByProfile: Map<string, number>
  taxonomyCategories: TaxonomyCategory[]
  taxonomyItems: TaxonomyItem[]
  /** Canonical organizations (009): logos, Sector Experience, Org History. */
  orgs: OrgIndex
}

/** Loads everything the directory needs in one round of parallel queries.
 *  Directory visibility (lib/listing: approved + active, individuals while
 *  firms are hidden) is enforced here in app code — the dev RLS policies are
 *  deliberately permissive (see 000_schema.sql). */
export function useDirectoryData() {
  const [data, setData] = useState<DirectoryData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [profilesRes, portfolioRes, videosRes, questionsRes, audioRes, catsRes, itemsRes, orgs] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('approval_status', 'approved')
            .eq('subscription_status', 'active'),
          supabase.from('portfolio_items').select('*').order('sort_order'),
          supabase.from('video_responses').select('profile_id,kind,question_id').eq('kind', 'question'),
          supabase.from('interview_questions').select('id').eq('active', true),
          supabase.from('audio_testimonials').select('id,profile_id').eq('status', 'published'),
          supabase.from('taxonomy_categories').select('*').order('sort_order'),
          supabase.from('taxonomy_items').select('*').order('sort_order'),
          loadOrgIndex(),
        ])
      if (cancelled) return
      const firstError =
        profilesRes.error ?? portfolioRes.error ?? videosRes.error ?? questionsRes.error ?? audioRes.error ??
        catsRes.error ?? itemsRes.error
      if (firstError) {
        setError(firstError.message)
        return
      }

      const videos = videosRes.data as Pick<VideoResponse, 'profile_id' | 'kind' | 'question_id'>[]
      // Featured status needs every standard Video Q&A (lib/membership).
      const profiles = withVideoQnaStatus(
        (profilesRes.data as Profile[]).filter(isListed),
        videos,
        questionsRes.data as Pick<InterviewQuestion, 'id'>[],
      )
      const profileIds = new Set(profiles.map((p) => p.id))

      const portfolioByProfile = new Map<string, PortfolioItem[]>()
      for (const item of portfolioRes.data as PortfolioItem[]) {
        if (!profileIds.has(item.profile_id)) continue
        const list = portfolioByProfile.get(item.profile_id) ?? []
        list.push(item)
        portfolioByProfile.set(item.profile_id, list)
      }

      const audioCountByProfile = new Map<string, number>()
      for (const a of audioRes.data as Pick<AudioTestimonial, 'id' | 'profile_id'>[]) {
        audioCountByProfile.set(a.profile_id, (audioCountByProfile.get(a.profile_id) ?? 0) + 1)
      }

      setData({
        profiles,
        portfolioByProfile,
        audioCountByProfile,
        taxonomyCategories: catsRes.data as TaxonomyCategory[],
        taxonomyItems: itemsRes.data as TaxonomyItem[],
        orgs,
      })
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(() => ({ data, error }), [data, error])
}
