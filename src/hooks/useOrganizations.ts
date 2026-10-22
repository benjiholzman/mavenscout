import { useEffect, useState } from 'react'
import { EMPTY_ORG_INDEX, loadOrgIndex, type OrgIndex } from '../lib/organizations'

/** The canonical organizations list (009), loaded once and shared; empty until
 *  it arrives (or if it can't load — see loadOrgIndex). */
export function useOrganizations(): OrgIndex {
  const [index, setIndex] = useState<OrgIndex>(EMPTY_ORG_INDEX)
  useEffect(() => {
    let cancelled = false
    loadOrgIndex().then((i) => !cancelled && setIndex(i))
    return () => {
      cancelled = true
    }
  }, [])
  return index
}
