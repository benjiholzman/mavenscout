import { useCallback, useMemo, useReducer } from 'react'
import type { FilterState } from '../filters'
import type { Level, Requirement, RequirementKind, RequirementValueByKind } from '../matching/types'
import {
  applyFilterStateToRequirements,
  clearMustHaves,
  defaultRequirements,
  EMPTY_SEARCH,
  newRequirementId,
  normalizeRequirements,
  type SearchState,
  type TagLevelOf,
} from './model'

// The one store behind the filter bar and the ranking panel (spec §2.1).
// The directory mounts it; both surfaces read and write through it, so there
// is no second copy of filter state to drift. The active ranking id lives in
// the URL (?ranking=<id>), not here.

export interface RequirementsState {
  requirements: Requirement[]
  search: SearchState
}

export type RequirementsAction =
  | { type: 'fromFilterBar'; next: FilterState; tagLevelOf: TagLevelOf }
  | { type: 'clearMustHaves' }
  | { type: 'setLevel'; id: string; level: Level }
  | { type: 'setValue'; id: string; value: Requirement['value'] }
  | { type: 'addRow'; row: Requirement }
  | { type: 'removeRow'; id: string }
  | { type: 'hydrate'; state: RequirementsState }
  | { type: 'reset' }

export function initialRequirementsState(): RequirementsState {
  return { requirements: defaultRequirements(), search: EMPTY_SEARCH }
}

export function requirementsReducer(
  state: RequirementsState,
  action: RequirementsAction,
): RequirementsState {
  switch (action.type) {
    case 'fromFilterBar':
      return applyFilterStateToRequirements(state.requirements, action.next, action.tagLevelOf)
    case 'clearMustHaves':
      // Clear All clears the search term too, as it always has.
      return { requirements: clearMustHaves(state.requirements), search: { ...EMPTY_SEARCH, mode: state.search.mode } }
    case 'setLevel':
      return {
        ...state,
        requirements: state.requirements.map((r) => (r.id === action.id ? { ...r, level: action.level } : r)),
      }
    case 'setValue':
      return {
        ...state,
        requirements: state.requirements.map((r) =>
          r.id === action.id ? ({ ...r, value: action.value } as Requirement) : r,
        ),
      }
    case 'addRow':
      return { ...state, requirements: [...state.requirements, action.row] }
    case 'removeRow':
      return { ...state, requirements: state.requirements.filter((r) => r.id !== action.id) }
    case 'hydrate':
      return { requirements: normalizeRequirements(action.state.requirements), search: action.state.search }
    case 'reset':
      return initialRequirementsState()
  }
}

/** Builds a new addable row (expertise / skill) for addRow. */
export function makeRow<K extends RequirementKind>(
  kind: K,
  value: RequirementValueByKind[K],
  opts: { level?: Level; source?: Requirement['source'] } = {},
): Requirement {
  return {
    id: newRequirementId(kind),
    kind,
    level: opts.level ?? 'none',
    source: opts.source ?? 'manual',
    value,
  } as Requirement
}

export function useRequirements(init?: () => RequirementsState) {
  const [state, dispatch] = useReducer(requirementsReducer, undefined, init ?? initialRequirementsState)

  const fromFilterBar = useCallback(
    (next: FilterState, tagLevelOf: TagLevelOf) => dispatch({ type: 'fromFilterBar', next, tagLevelOf }),
    [],
  )
  const clearMustHavesCb = useCallback(() => dispatch({ type: 'clearMustHaves' }), [])
  const setLevel = useCallback((id: string, level: Level) => dispatch({ type: 'setLevel', id, level }), [])
  const setValue = useCallback(
    (id: string, value: Requirement['value']) => dispatch({ type: 'setValue', id, value }),
    [],
  )
  const addRow = useCallback((row: Requirement) => dispatch({ type: 'addRow', row }), [])
  const removeRow = useCallback((id: string) => dispatch({ type: 'removeRow', id }), [])
  const hydrate = useCallback((s: RequirementsState) => dispatch({ type: 'hydrate', state: s }), [])
  const reset = useCallback(() => dispatch({ type: 'reset' }), [])

  return useMemo(
    () => ({
      state,
      fromFilterBar,
      clearMustHaves: clearMustHavesCb,
      setLevel,
      setValue,
      addRow,
      removeRow,
      hydrate,
      reset,
    }),
    [state, fromFilterBar, clearMustHavesCb, setLevel, setValue, addRow, removeRow, hydrate, reset],
  )
}
