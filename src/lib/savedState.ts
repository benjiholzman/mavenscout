import { useEffect, useSyncExternalStore } from 'react'
import { GENERAL_LIST_LIMITS } from './config'
import { ensureDefaultOpening } from './openings'
import { DEMO_HIRING_MANAGER_ID } from './session'
import { supabase } from './supabase'
import type { Opening, OpeningEntry } from '../types/db'

// The hiring manager's saves, shared by every bookmark and star on the page
// (cards, ranked rows, the profile page) so a save or remove updates all of
// them at once. Loaded once per page load for the mocked demo manager;
// refresh() after any write. Openings pages keep their own queries.

export type SavedEntry = Pick<OpeningEntry, 'id' | 'opening_id' | 'profile_id' | 'list_tag'>

export interface SavedState {
  loaded: boolean
  /** General first, then named openings, newest first. */
  openings: Opening[]
  entries: SavedEntry[]
}

let state: SavedState = { loaded: false, openings: [], entries: [] }
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

function emit(next: SavedState) {
  state = next
  listeners.forEach((l) => l())
}

export function refreshSaved(): Promise<void> {
  loading = (async () => {
    // General always exists, so the chooser can offer it before the first save.
    const general = await ensureDefaultOpening()
    const { data: named } = await supabase
      .from('openings')
      .select('*')
      .eq('hiring_manager_id', DEMO_HIRING_MANAGER_ID)
      .eq('is_default', false)
      .order('created_at', { ascending: false })
    const openings = [general, ...((named as Opening[]) ?? [])]
    const { data: entries } = await supabase
      .from('opening_entries')
      .select('id, opening_id, profile_id, list_tag')
      .in(
        'opening_id',
        openings.map((o) => o.id),
      )
    emit({ loaded: true, openings, entries: (entries as SavedEntry[]) ?? [] })
  })()
  return loading
}

/** The shared saves; loads them the first time a manager's page asks. */
export function useSavedState(enabled: boolean): SavedState {
  const snapshot = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
  useEffect(() => {
    if (enabled && !loading) void refreshSaved().catch(() => (loading = null))
  }, [enabled])
  return snapshot
}

/** Where a candidate is saved: any opening (bookmark filled), starred in any
 *  (star filled). */
export function savedMarks(s: SavedState, profileId: string) {
  const mine = s.entries.filter((e) => e.profile_id === profileId)
  return { saved: mine.length > 0, starred: mine.some((e) => e.list_tag === 'top_pick'), entries: mine }
}

/** General's counts against its caps. */
export function generalUsage(s: SavedState) {
  const general = s.openings.find((o) => o.is_default)
  const inGeneral = general ? s.entries.filter((e) => e.opening_id === general.id) : []
  return {
    favorites: inGeneral.length,
    starred: inGeneral.filter((e) => e.list_tag === 'top_pick').length,
    limits: GENERAL_LIST_LIMITS,
  }
}
