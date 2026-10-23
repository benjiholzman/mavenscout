import { useCallback, useEffect, useState } from 'react'
import { videoQnaStatus, type VideoQnaStatus } from '../lib/membership'
import { getEditorProfileId } from '../lib/session'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/db'

/** The profile the mocked consultant session edits (PRD 7.3). Sections save
 *  independently via save(patch); edits to an approved profile auto-publish
 *  (v1 rule), while a fresh signup draft stays pending until admin review. */
export function useEditorProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [videoQnas, setVideoQnas] = useState<VideoQnaStatus | null>(null)

  useEffect(() => {
    const id = getEditorProfileId()
    Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('video_responses').select('profile_id,kind,question_id').eq('profile_id', id).eq('kind', 'question'),
      supabase.from('interview_questions').select('id').eq('active', true),
    ]).then(([{ data, error }, videos, questions]) => {
      if (error) setError(error.message)
      else if (!data) setError('Editor profile not found — try the role switcher to reset.')
      else {
        // Featured status needs every standard Video Q&A (lib/membership).
        const status = videoQnaStatus(data.id, videos.data ?? [], questions.data ?? [])
        setVideoQnas(status)
        setProfile({ ...(data as Profile), video_qnas_complete: status.complete })
      }
    })
  }, [])

  const save = useCallback(
    async (patch: Partial<Profile>): Promise<string | null> => {
      if (!profile) return 'Not loaded yet'
      setSaving(true)
      // Availability edits stamp the freshness cue (PRD 7.16).
      const stamped =
        'part_time_availability' in patch || 'full_time_availability' in patch
          ? { ...patch, availability_updated_at: new Date().toISOString() }
          : patch
      const { error } = await supabase.from('profiles').update(stamped).eq('id', profile.id)
      setSaving(false)
      if (error) return error.message
      setProfile((p) => (p ? { ...p, ...stamped } : p))
      return null
    },
    [profile],
  )

  /** The Video Q&A editor reports changes here, so Featured status (and its
   *  caps) follow the videos without a reload. */
  const updateVideoQnas = useCallback((status: VideoQnaStatus) => {
    setVideoQnas(status)
    setProfile((p) => (p ? { ...p, video_qnas_complete: status.complete } : p))
  }, [])

  return { profile, error, saving, save, setProfile, videoQnas, updateVideoQnas }
}
