export type AppMode = 'idle' | 'loading' | 'results' | 'error'
export type LayoutMode = 'focus' | 'split' | 'stream'
export type ThemeMode = 'light' | 'dark'
export type AccentColor = 'indigo' | 'teal' | 'plum' | 'forest' | 'graphite'
export type DensityMode = 'cozy' | 'compact'
export type ReasoningTone = 'accented' | 'plain'
export type AnalyzeMode = 'influential' | 'relevant' | 'recent' | 'reviews'
export type ResultsTab = 'ranked' | 'timeline' | 'network'

export interface AccentTokens {
  a: string
  w: string
  i: string
  ln: string
}

export interface AccentDef {
  l: AccentTokens
  d: AccentTokens
}

export interface PaperBreakdown {
  impact: string
  network: string
  relevance: string
  context: string
}

export interface Paper {
  id: number
  sourceId?: string
  title: string
  authors: string
  authorNames?: string[]
  authorIds?: string[]
  venue: string
  year: number
  citations: number
  impact: number
  network: number
  relevance: number
  context: number
  final: number
  badges: string[]
  review: boolean
  why: string
  breakdown: PaperBreakdown
  abstract?: string
  doi?: string
  url?: string
}

export interface SeedPaper {
  sourceId?: string
  title: string
  authors: string
  authorNames?: string[]
  authorIds?: string[]
  venue: string
  year: number
  citations: string
  citingCount: string
  sources: string[]
  abstract: string
  url?: string
}

export interface FiltersState {
  yearFrom: number
  yearTo: number
  relevanceThreshold: number
  highlyInfluential: boolean
  reviewOnly: boolean
}

export interface TweaksState {
  layout: LayoutMode
  theme: ThemeMode
  accent: AccentColor
  density: DensityMode
  reasoningTone: ReasoningTone
}

export interface AppState {
  mode: AppMode
  query: string
  analyzeMode: AnalyzeMode
  resultsTab: ResultsTab
  filters: FiltersState
  tweaks: TweaksState
  selectedPaperId: number | null
  expandedIds: Set<number>
  tweaksPanelOpen: boolean
  // Live data (populated after a successful analyze call)
  papers: Paper[]
  seedPaper: SeedPaper | null
  usingDemoData: boolean
}

export type AppAction =
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_ANALYZE_MODE'; payload: AnalyzeMode }
  | { type: 'SET_MODE'; payload: AppMode }
  | { type: 'SET_RESULTS_TAB'; payload: ResultsTab }
  | { type: 'SET_FILTER'; payload: Partial<FiltersState> }
  | { type: 'RESET_FILTERS' }
  | { type: 'SET_TWEAKS'; payload: Partial<TweaksState> }
  | { type: 'SELECT_PAPER'; payload: number | null }
  | { type: 'TOGGLE_EXPANDED'; payload: number }
  | { type: 'TOGGLE_TWEAKS_PANEL' }
  | { type: 'CLOSE_TWEAKS_PANEL' }
  | {
      type: 'SET_RESULTS'
      payload: { papers: Paper[]; seedPaper: SeedPaper; usingDemoData: boolean }
    }
