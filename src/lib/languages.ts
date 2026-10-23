import { supabase } from './supabase'
import type { Language, Profile, Proficiency, SpokenLanguage } from '../types/db'

// Languages with proficiency (profiles-membership §13 step 1). Each expert
// lists languages from the canonical list at Fluent or Working. A requirement
// asks for "Working or above" (Fluent satisfies it) or "Fluent only".

export const PROFICIENCY_LABELS: Record<Proficiency, string> = {
  fluent: 'Fluent',
  working: 'Working',
}

/** How a filter or requirement row reads its minimum. */
export const MIN_PROFICIENCY_LABELS: Record<Proficiency, string> = {
  working: 'Working or above',
  fluent: 'Fluent only',
}

export function meetsProficiency(have: Proficiency, min: Proficiency): boolean {
  return min === 'working' || have === 'fluent'
}

/** A profile's languages (010). */
export function spokenLanguages(p: Pick<Profile, 'spoken_languages'>): SpokenLanguage[] {
  return p.spoken_languages ?? []
}

/** The listed languages among `names`, at or above `min`. */
export function speaks(
  p: Pick<Profile, 'spoken_languages'>,
  names: string[],
  min: Proficiency = 'working',
): SpokenLanguage[] {
  return spokenLanguages(p).filter((l) => names.includes(l.name) && meetsProficiency(l.proficiency, min))
}

/** "English · French (Working)": Fluent is the unmarked default. */
export function formatLanguages(list: SpokenLanguage[]): string {
  return list.map((l) => (l.proficiency === 'working' ? `${l.name} (Working)` : l.name)).join(' · ')
}

// The canonical list: ~140 rows, loaded once and shared. A failed load (010
// not run yet) leaves the picker with only the languages already in the data.
let cache: Promise<string[]> | null = null

export function loadLanguageNames(): Promise<string[]> {
  cache ??= (async () => {
    const { data, error } = await supabase.from('languages').select('*').order('name')
    if (error) {
      console.warn(`languages not loaded (${error.message})`)
      cache = null
      return []
    }
    return (data as Language[]).map((l) => l.name)
  })()
  return cache
}
