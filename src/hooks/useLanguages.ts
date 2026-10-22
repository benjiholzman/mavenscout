import { useEffect, useState } from 'react'
import { loadLanguageNames } from '../lib/languages'

/** The canonical language list (010), sorted; empty until it arrives. */
export function useLanguages(): string[] {
  const [names, setNames] = useState<string[]>([])
  useEffect(() => {
    let cancelled = false
    loadLanguageNames().then((n) => !cancelled && setNames(n))
    return () => {
      cancelled = true
    }
  }, [])
  return names
}
