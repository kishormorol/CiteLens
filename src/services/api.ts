/**
 * CiteLens API service.
 *
 * Calls POST /api/analyze-paper on the configured backend.
 * Falls back to mock data when VITE_API_BASE_URL is not set or the request fails.
 */
import type { Paper, SeedPaper } from '../types'
import { PAPERS, SEED_PAPER } from '../data/mockData'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')

// ── Backend response shapes (camelCase from _CamelModel) ──────────────────

interface ApiBreakdown {
  impact: string
  network: string
  relevance: string
  context: string
}

interface ApiRankedPaper {
  id: string
  title: string
  authors: string[]
  abstract?: string
  year?: number
  venue?: string
  doi?: string
  url?: string
  citationCount: number
  impactScore: number
  networkScore: number
  relevanceScore: number
  citationIntentScore: number
  finalScore: number
  highlyInfluential: boolean
  badges: string[]
  whyRanked: string
  breakdown: ApiBreakdown
}

interface ApiSeedPaper {
  id: string
  title: string
  authors: string[]
  abstract?: string
  year?: number
  venue?: string
  doi?: string
  arxivId?: string
  url?: string
  citationCount: number
  sources: string[]
}

interface ApiSummary {
  totalCitingPapers: number
  rankedCandidates: number
  sourcesUsed: string[]
  mockMode: boolean
}

interface ApiResponse {
  seedPaper: ApiSeedPaper
  summary: ApiSummary
  results: ApiRankedPaper[]
}

// ── Mapping helpers ───────────────────────────────────────────────────────

const REVIEW_BADGES = new Set(['Survey', 'Review', 'Comprehensive'])

/** Clamp a 0–1 float, multiply by 100, round to integer. */
function toScore(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100)
}

function mapPaper(result: ApiRankedPaper, index: number): Paper {
  return {
    id: index + 1,
    title: result.title,
    authors: result.authors.join(', '),
    venue: result.venue ?? '',
    year: result.year ?? 0,
    citations: result.citationCount,
    impact: toScore(result.impactScore),
    network: toScore(result.networkScore),
    relevance: toScore(result.relevanceScore),
    context: toScore(result.citationIntentScore),
    final: toScore(result.finalScore),
    badges: result.badges,
    review: result.badges.some((b) => REVIEW_BADGES.has(b)),
    why: result.whyRanked,
    breakdown: result.breakdown,
    abstract: result.abstract,
    doi: result.doi,
    url: result.url,
  }
}

function mapSeedPaper(
  seed: ApiSeedPaper,
  totalCiting: number,
  sourcesUsed: string[],
): SeedPaper {
  return {
    title: seed.title,
    authors: seed.authors.join(', '),
    venue: seed.venue ?? '',
    year: seed.year ?? 0,
    citations: seed.citationCount.toLocaleString(),
    citingCount: totalCiting.toLocaleString(),
    sources: sourcesUsed,
    abstract: seed.abstract ?? '',
    url: seed.url,
  }
}

// ── Public API ────────────────────────────────────────────────────────────

export interface AnalyzeResult {
  papers: Paper[]
  seedPaper: SeedPaper
  totalCiting: number
  sourcesUsed: string[]
  usingDemoData: boolean
}

/**
 * Analyze a paper and return ranked citing papers.
 * Falls back to bundled mock data if the backend is unavailable or unconfigured.
 */
export async function analyzePaper(query: string, limit = 20): Promise<AnalyzeResult> {
  if (!API_BASE) {
    return {
      papers: PAPERS,
      seedPaper: SEED_PAPER,
      totalCiting: 1284,
      sourcesUsed: SEED_PAPER.sources,
      usingDemoData: true,
    }
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/analyze-paper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit }),
    })
  } catch {
    // Network error — backend unreachable, fall back to demo data
    return {
      papers: PAPERS,
      seedPaper: SEED_PAPER,
      totalCiting: 1284,
      sourcesUsed: SEED_PAPER.sources,
      usingDemoData: true,
    }
  }

  // Any non-ok response (404, 422, 502, etc.) = surface the error to the user
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const data: ApiResponse = await res.json()

  // Backend fell back to mock data — surface as an error so the user knows
  // the paper wasn't found, rather than silently showing unrelated demo results.
  if (data.summary.mockMode) {
    throw new Error('Paper not found')
  }

  return {
    papers: data.results.map(mapPaper),
    seedPaper: mapSeedPaper(
      data.seedPaper,
      data.summary.totalCitingPapers,
      data.summary.sourcesUsed,
    ),
    totalCiting: data.summary.totalCitingPapers,
    sourcesUsed: data.summary.sourcesUsed,
    usingDemoData: false,
  }
}
