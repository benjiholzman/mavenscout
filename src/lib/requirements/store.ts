import { useCallback, useMemo, useReducer } from 'react'
import type { FilterState } from '../filters'
import { MAX_TAG_ROWS } from '../matching/config'
import type { Level, Requirement } from '../matching/types'
import {
  addRowChecked,
  addSuggestion,
  withoutRequiredValues,
  applyFilterStateToRequirements,
  clearMustHaves,
  dropPreferences,
  EMPTY_SEARCH,
  normalizeRequirements,
  setRowLevel,
  type SearchState,
  type Suggestion,
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
  | { type: 'fromFilterBar'; next: FilterState }
  | { type: 'clearMustHaves' }
  | { type: 'dropPreferences' }
  | { type: 'setLevel'; id: string; level: Level }
  | { type: 'setValue'; id: string; value: Requirement['value'] }
  | { type: 'addRow'; row: Requirement }
  | { type: 'removeRow'; id: string }
  | { type: 'addSuggestions'; suggestions: Suggestion[] }
  | { type: 'apply'; fn: (rows: Requirement[]) => Requirement[] }
  | { type: 'clearSearch' }
  | { type: 'hydrate'; state: RequirementsState }
  | { type: 'reset' }

export function initialRequirementsState(): RequirementsState {
  return { requirements: [], search: EMPTY_SEARCH }
}

export function requirementsReducer(state: RequirementsState, action: RequirementsAction): RequirementsState {
  const withRows = (requirements: Requirement[]) => ({ ...state, requirements })
  switch (action.type) {
    case 'fromFilterBar':
      return applyFilterStateToRequirements(state.requirements, action.next)
    case 'clearMustHaves':
      // Clear All clears the search term too, as it always has.
      return { requirements: clearMustHaves(state.requirements), search: { ...EMPTY_SEARCH, mode: state.search.mode } }
    case 'dropPreferences':
      return withRows(dropPreferences(state.requirements))
    case 'setLevel':
      // Merges rather than ever creating a second Required (or preference)
      // row of a multi-value kind.
      return withRows(setRowLevel(state.requirements, action.id, action.level))
    case 'setValue':
      // A value newly picked in a Required row moves out of the preference row.
      return withRows(
        withoutRequiredValues(
          state.requirements.map((r) => (r.id === action.id ? ({ ...r, value: action.value } as Requirement) : r)),
        ),
      )
    case 'addRow':
      // Respects the row limits: adding a row that would clash is a no-op.
      return withRows(addRowChecked(state.requirements, action.row))
    case 'removeRow':
      return withRows(state.requirements.filter((r) => r.id !== action.id))
    case 'addSuggestions':
      return withRows(
        normalizeRequirements(
          action.suggestions.reduce((rows, s) => addSuggestion(rows, s, MAX_TAG_ROWS), state.requirements),
        ),
      )
    case 'apply':
      // Any model edit (the priority editors): the result is normalized.
      return withRows(normalizeRequirements(action.fn(state.requirements)))
    case 'clearSearch':
      return { ...state, search: { ...EMPTY_SEARCH, mode: state.search.mode } }
    case 'hydrate':
      return { requirements: normalizeRequirements(action.state.requirements), search: action.state.search }
    case 'reset':
      return initialRequirementsState()
  }
}

export function useRequirements(init?: () => RequirementsState) {
  const [state, dispatch] = useReducer(requirementsReducer, undefined, init ?? initialRequirementsState)

  const fromFilterBar = useCallback((next: FilterState) => dispatch({ type: 'fromFilterBar', next }), [])
  const clearMustHavesCb = useCallback(() => dispatch({ type: 'clearMustHaves' }), [])
  const dropPreferencesCb = useCallback(() => dispatch({ type: 'dropPreferences' }), [])
  const setLevel = useCallback((id: string, level: Level) => dispatch({ type: 'setLevel', id, level }), [])
  const setValue = useCallback(
    (id: string, value: Requirement['value']) => dispatch({ type: 'setValue', id, value }),
    [],
  )
  const addRow = useCallback((row: Requirement) => dispatch({ type: 'addRow', row }), [])
  const removeRow = useCallback((id: string) => dispatch({ type: 'removeRow', id }), [])
  const addSuggestions = useCallback(
    (suggestions: Suggestion[]) => dispatch({ type: 'addSuggestions', suggestions }),
    [],
  )
  const apply = useCallback((fn: (rows: Requirement[]) => Requirement[]) => dispatch({ type: 'apply', fn }), [])
  const clearSearch = useCallback(() => dispatch({ type: 'clearSearch' }), [])
  const hydrate = useCallback((s: RequirementsState) => dispatch({ type: 'hydrate', state: s }), [])
  const reset = useCallback(() => dispatch({ type: 'reset' }), [])

  return useMemo(
    () => ({
      state,
      fromFilterBar,
      clearMustHaves: clearMustHavesCb,
      dropPreferences: dropPreferencesCb,
      setLevel,
      setValue,
      addRow,
      removeRow,
      addSuggestions,
      apply,
      clearSearch,
      hydrate,
      reset,
    }),
    [
      state,
      fromFilterBar,
      clearMustHavesCb,
      dropPreferencesCb,
      setLevel,
      setValue,
      addRow,
      removeRow,
      addSuggestions,
      apply,
      clearSearch,
      hydrate,
      reset,
    ],
  )
}

export type RequirementsStore = ReturnType<typeof useRequirements>
