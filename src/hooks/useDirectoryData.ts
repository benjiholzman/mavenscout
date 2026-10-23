import { useEffect, useMemo, useState } from 'react'
import { isListed } from '../lib/listing'
import { loadOrgIndex, type OrgIndex } from '../lib/organizations'
import { supabase } from '../lib/supabase'
import type {
  AudioTestimonial,
  PortfolioItem,
  Profile,
  TaxonomyCategory,
  TaxonomyItem,
  VideoResponse,
} from '../types/db'

export interface DirectoryData {
  profiles: Profile[]
  portfolioByProfile: Map<string, PortfolioItem[]>
  introByProfile: Map<string, VideoResponse>
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
      const [profilesRes, portfolioRes, videosRes, audioRes, catsRes, itemsRes, orgs] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('approval_status', 'approved')
            .eq('subscription_status', 'active'),
          supabase.from('portfolio_items').select('*').order('sort_order'),
          supabase.from('video_responses').select('*').eq('kind', 'intro'),
          supabase.from('audio_testimonials').select('id,profile_id').eq('status', 'published'),
          supabase.from('taxonomy_categories').select('*').order('sort_order'),
          supabase.from('taxonomy_items').select('*').order('sort_order'),
          loadOrgIndex(),
        ])
      if (cancelled) return
      const firstError =
        profilesRes.error ?? portfolioRes.error ?? videosRes.error ?? audioRes.error ??
        catsRes.error ?? itemsRes.error
      if (firstError) {
        setError(firstError.message)
        return
      }

      const profiles = (profilesRes.data as Profile[]).filter(isListed)
      const profileIds = new Set(profiles.map((p) => p.id))

      const portfolioByProfile = new Map<string, PortfolioItem[]>()
      for (const item of portfolioRes.data as PortfolioItem[]) {
        if (!profileIds.has(item.profile_id)) continue
        const list = portfolioByProfile.get(item.profile_id) ?? []
        list.push(item)
        portfolioByProfile.set(item.profile_id, list)
      }

      const introByProfile = new Map<string, VideoResponse>()
      for (const v of videosRes.data as VideoResponse[]) {
        if (profileIds.has(v.profile_id)) introByProfile.set(v.profile_id, v)
      }

      const audioCountByProfile = new Map<string, number>()
      for (const a of audioRes.data as Pick<AudioTestimonial, 'id' | 'profile_id'>[]) {
        audioCountByProfile.set(a.profile_id, (audioCountByProfile.get(a.profile_id) ?? 0) + 1)
      }

      setData({
        profiles,
        portfolioByProfile,
        introByProfile,
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
