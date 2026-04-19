import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react'
import type {
  AppState,
  AppAction,
  FiltersState,
} from '../types'
import { analyzePaper } from '../services/api'

const DEFAULT_FILTERS: FiltersState = {
  yearFrom: 2018,
  yearTo: new Date().getFullYear(),
  relevanceThreshold: 0,
  highlyInfluential: false,
  reviewOnly: false,
}

const initialState: AppState = {
  mode: 'idle',
  query: '',
  analyzeMode: 'influential',
  resultsTab: 'ranked',
  filters: DEFAULT_FILTERS,
  tweaks: {
    layout: 'focus',
    theme: 'light',
    accent: 'indigo',
    density: 'cozy',
    reasoningTone: 'accented',
  },
  selectedPaperId: null,
  expandedIds: new Set(),
  tweaksPanelOpen: false,
  papers: [],
  seedPaper: null,
  usingDemoData: false,
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.payload }
    case 'SET_ANALYZE_MODE':
      return { ...state, analyzeMode: action.payload }
    case 'SET_MODE':
      return { ...state, mode: action.payload }
    case 'SET_RESULTS_TAB':
      return { ...state, resultsTab: action.payload }
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, ...action.payload } }
    case 'RESET_FILTERS':
      return { ...state, filters: DEFAULT_FILTERS }
    case 'SET_TWEAKS':
      return { ...state, tweaks: { ...state.tweaks, ...action.payload } }
    case 'SELECT_PAPER':
      return { ...state, selectedPaperId: action.payload }
    case 'TOGGLE_EXPANDED': {
      const next = new Set(state.expandedIds)
      if (next.has(action.payload)) {
        next.delete(action.payload)
      } else {
        next.add(action.payload)
      }
      return { ...state, expandedIds: next }
    }
    case 'TOGGLE_TWEAKS_PANEL':
      return { ...state, tweaksPanelOpen: !state.tweaksPanelOpen }
    case 'CLOSE_TWEAKS_PANEL':
      return { ...state, tweaksPanelOpen: false }
    case 'SET_RESULTS':
      return {
        ...state,
        papers: action.payload.papers,
        seedPaper: action.payload.seedPaper,
        usingDemoData: action.payload.usingDemoData,
        // Reset per-result UI state when results change
        selectedPaperId: null,
        expandedIds: new Set(),
        filters: DEFAULT_FILTERS,
        resultsTab: 'ranked',
      }
    default:
      return state
  }
}

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  analyze: (queryOverride?: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const abortRef = useRef<AbortController | null>(null)

  const analyze = useCallback((queryOverride?: string) => {
    const q = queryOverride ?? state.query
    if (!q.trim()) return

    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    dispatch({ type: 'SET_QUERY', payload: q })
    dispatch({ type: 'SET_MODE', payload: 'loading' })

    analyzePaper(q, 20, controller.signal)
      .then((result) => {
        dispatch({
          type: 'SET_RESULTS',
          payload: {
            papers: result.papers,
            seedPaper: result.seedPaper,
            usingDemoData: result.usingDemoData,
          },
        })
        dispatch({ type: 'SET_MODE', payload: 'results' })
      })
      .catch((err) => {
        // Ignore aborted requests — a newer request is already in flight
        if (err instanceof DOMException && err.name === 'AbortError') return
        dispatch({ type: 'SET_MODE', payload: 'error' })
      })
  }, [state.query])

  return (
    <AppContext.Provider value={{ state, dispatch, analyze }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
