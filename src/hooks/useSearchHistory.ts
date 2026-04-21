/**
 * useSearchHistory — persist and retrieve recent searches in localStorage.
 *
 * Stores up to MAX_HISTORY queries in reverse-chronological order.
 * Deduplicates: searching the same query again moves it to the top.
 */

import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'citelens:search-history'
const MAX_HISTORY = 20

export interface SearchHistoryEntry {
  query: string
  timestamp: number
}

function load(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SearchHistoryEntry[]
  } catch {
    return []
  }
}

function save(entries: SearchHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // localStorage unavailable (e.g. private browsing with strict settings)
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>(load)

  // Persist whenever history changes
  useEffect(() => {
    save(history)
  }, [history])

  const addEntry = useCallback((query: string) => {
    const q = query.trim()
    if (!q) return
    setHistory((prev) => {
      // Move existing to top, or prepend new
      const filtered = prev.filter((e) => e.query !== q)
      const next = [{ query: q, timestamp: Date.now() }, ...filtered]
      return next.slice(0, MAX_HISTORY)
    })
  }, [])

  const removeEntry = useCallback((query: string) => {
    setHistory((prev) => prev.filter((e) => e.query !== query))
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  return { history, addEntry, removeEntry, clearHistory }
}
