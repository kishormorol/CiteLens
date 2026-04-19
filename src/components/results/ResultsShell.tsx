import React from 'react'
import { SeedCard } from '../seed/SeedCard'
import { Filters } from '../filters/Filters'
import { PaperFocus } from '../papers/PaperFocus'
import { PaperSplitList } from '../papers/PaperSplit'
import { SplitPreview } from '../papers/SplitPreview'
import { PaperStream } from '../papers/PaperStream'
import { Timeline } from '../timeline/Timeline'
import { NetworkGraph } from '../network/NetworkGraph'
import { SkeletonResults, SkeletonSeedCard } from '../ui/Skeleton'
import { useApp } from '../../context/AppContext'
import { usePapers } from '../../hooks/usePapers'
import type { ResultsTab } from '../../types'

const TABS: { value: ResultsTab; label: (n: number) => string }[] = [
  { value: 'ranked',   label: (n) => `Ranked results (${n})` },
  { value: 'timeline', label: ()  => 'Timeline' },
  { value: 'network',  label: ()  => 'Network' },
]

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed border-[var(--line)]"
      style={{ background: 'var(--bg-1)' }}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-4 opacity-30">
        <circle cx="24" cy="24" r="20" stroke="var(--ink)" strokeWidth="2" />
        <line x1="16" y1="24" x2="32" y2="24" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="16" x2="24" y2="32" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="text-base font-medium mb-1" style={{ color: 'var(--ink-3)' }}>
        No papers match these filters
      </p>
      <p className="text-sm" style={{ color: 'var(--ink-4)' }}>
        Try widening the year range or lowering the relevance threshold
      </p>
    </div>
  )
}


function RankedContent() {
  const { state } = useApp()
  const { tweaks } = state
  const papers = usePapers()
  const selectedPaper = papers.find((p) => p.id === state.selectedPaperId) ?? null

  if (tweaks.layout === 'focus') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[240px,1fr] gap-5 items-start">
        <div className="sticky top-20">
          <Filters />
        </div>
        <div className="flex flex-col gap-4 min-w-0">
          {papers.length === 0 ? (
            <EmptyState />
          ) : (
            papers.map((paper, i) => (
              <PaperFocus key={paper.id} paper={paper} rank={i + 1} />
            ))
          )}
        </div>
      </div>
    )
  }

  if (tweaks.layout === 'split') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-5 items-start">
        <div className="flex flex-col gap-4">
          <Filters />
          {papers.length === 0 ? (
            <EmptyState />
          ) : (
            <PaperSplitList papers={papers} />
          )}
        </div>
        <div className="lg:sticky lg:top-20">
          <SplitPreview paper={selectedPaper} />
        </div>
      </div>
    )
  }

  if (tweaks.layout === 'stream') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[240px,1fr] gap-5 items-start">
        <div className="sticky top-20">
          <Filters />
        </div>
        <div className="min-w-0">
          {papers.length === 0 ? (
            <EmptyState />
          ) : (
            <PaperStream papers={papers} />
          )}
        </div>
      </div>
    )
  }

  return null
}

export function ResultsShell() {
  const { state, dispatch } = useApp()
  const { mode, resultsTab } = state
  const papers = usePapers()
  const isLoading = mode === 'loading'

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        <SkeletonSeedCard />
        <SkeletonResults />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      {/* Seed card */}
      <SeedCard />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--line)]">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => dispatch({ type: 'SET_RESULTS_TAB', payload: tab.value })}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              resultsTab === tab.value
                ? 'text-[var(--accent-ink)] bg-[var(--accent-weak)]'
                : 'text-[var(--ink-3)] hover:text-[var(--ink-2)] hover:bg-[var(--bg-2)]'
            }`}
            style={
              resultsTab === tab.value
                ? { boxShadow: '0 2px 0 0 var(--accent)' }
                : undefined
            }
          >
            {tab.label(papers.length)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {resultsTab === 'ranked'   && <RankedContent />}
      {resultsTab === 'timeline' && <Timeline />}
      {resultsTab === 'network'  && <NetworkGraph />}
    </div>
  )
}
