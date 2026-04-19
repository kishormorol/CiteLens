import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import type { Paper } from '../types'

export function usePapers(): Paper[] {
  const { state } = useApp()
  const { papers, filters, analyzeMode } = state

  return useMemo(() => {
    let list = [...papers]

    // Filter by year — papers with unknown year (0) are always included
    list = list.filter(
      (p) => !p.year || (p.year >= filters.yearFrom && p.year <= filters.yearTo)
    )

    // Filter by relevance threshold
    if (filters.relevanceThreshold > 0) {
      list = list.filter((p) => p.relevance >= filters.relevanceThreshold)
    }

    // Filter by highly influential
    if (filters.highlyInfluential) {
      list = list.filter((p) => p.badges.includes('Highly Influential'))
    }

    // Filter by review only
    if (filters.reviewOnly) {
      list = list.filter((p) => p.review)
    }

    // Sort by mode
    switch (analyzeMode) {
      case 'influential':
        list.sort((a, b) => b.final - a.final)
        break
      case 'relevant':
        list.sort((a, b) => b.relevance - a.relevance)
        break
      case 'recent':
        list.sort((a, b) => b.year - a.year || b.final - a.final)
        break
      case 'reviews':
        list = list.filter((p) => p.review)
        list.sort((a, b) => b.final - a.final)
        break
    }

    return list
  }, [papers, filters, analyzeMode])
}
