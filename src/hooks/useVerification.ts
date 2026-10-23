import { useCallback, useEffect, useState } from 'react'
import { loadVerification } from '../lib/verification/store'
import type { VerificationCheck, VerificationEvidence } from '../types/db'

/** One profile's verification audit rows and evidence awaiting review
 *  (spec §3; 016): the editor's view. */
export function useVerification(profileId: string | undefined) {
  const [data, setData] = useState<{ checks: VerificationCheck[]; evidence: VerificationEvidence[] } | null>(null)
  const reload = useCallback(async () => {
    if (!profileId) return
    setData(await loadVerification(profileId))
  }, [profileId])
  useEffect(() => {
    reload()
  }, [reload])
  return { data, reload }
}
