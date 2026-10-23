import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AudioTestimonial } from '../types/db'

/** Every testimonial and request of one profile, any status, newest first:
 *  the editor's view (spec §4.2 status tracking). Public pages load only
 *  published rows (useProfile). */
export function useTestimonials(profileId: string | undefined) {
  const [rows, setRows] = useState<AudioTestimonial[] | null>(null)
  const reload = useCallback(async () => {
    if (!profileId) return
    const { data } = await supabase
      .from('audio_testimonials')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
    setRows((data as AudioTestimonial[]) ?? [])
  }, [profileId])
  useEffect(() => {
    reload()
  }, [reload])
  return { rows, reload }
}
