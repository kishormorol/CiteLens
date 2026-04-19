import React from 'react'
import { Badge } from '../ui/Badge'
import { useApp } from '../../context/AppContext'
import { usePapers } from '../../hooks/usePapers'

export function SeedCard() {
  const { state } = useApp()
  const papers = usePapers()
  const paper = state.seedPaper
  const hasResults = state.mode === 'results'

  if (!paper) return null

  const subtitle = hasResults
    ? `Found ${papers.length} citing papers`
    : 'Analyzing citing papers…'

  return (
    <div
      className="rounded-2xl border border-[var(--line)] overflow-hidden"
      style={{ background: 'var(--bg-1)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="px-5 py-3 border-b border-[var(--line)] flex items-center gap-2 flex-wrap">
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'var(--accent-weak)', color: 'var(--accent-ink)' }}
        >
          Seed Paper
        </span>
        <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
          {subtitle}
        </span>
        {state.usingDemoData && (
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded-full border"
            style={{
              borderColor: 'var(--line-2)',
              color: 'var(--ink-4)',
              background: 'var(--bg-2)',
            }}
            title="Backend unavailable — showing bundled demo data"
          >
            Demo data
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col sm:flex-row gap-5">
        {/* Left: paper info */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <h2
            className="text-xl leading-snug"
            style={{
              fontFamily: 'Instrument Serif, Georgia, serif',
              color: 'var(--ink)',
            }}
          >
            {paper.title}
          </h2>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span style={{ color: 'var(--ink-3)' }}>{paper.authors}</span>
            <span style={{ color: 'var(--line-2)' }} aria-hidden="true">·</span>
            <span
              className="font-medium"
              style={{ color: 'var(--accent-ink)' }}
            >
              {paper.venue}
            </span>
            <span style={{ color: 'var(--line-2)' }} aria-hidden="true">·</span>
            <span style={{ color: 'var(--ink-4)' }}>{paper.year}</span>
            <span style={{ color: 'var(--line-2)' }} aria-hidden="true">·</span>
            <span style={{ color: 'var(--ink-3)' }}>
              <span className="font-mono font-medium">{paper.citations}</span> citations
            </span>
          </div>

          <p
            className="text-sm leading-relaxed line-clamp-3"
            style={{ color: 'var(--ink-3)' }}
          >
            {paper.abstract}
          </p>

          {/* Source badges */}
          <div className="flex flex-wrap gap-2 mt-1">
            {paper.sources.map((src) => (
              <Badge key={src} label={src} variant="ghost" size="xs" />
            ))}
          </div>
        </div>

        {/* Right: stats */}
        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-4 sm:gap-3 flex-shrink-0">
          {/* Big citing count */}
          <div
            className="text-center px-4 py-3 rounded-xl border border-[var(--accent-line)]"
            style={{ background: 'var(--accent-weak)', minWidth: '5rem' }}
          >
            <div
              className="text-3xl font-mono font-semibold leading-none"
              style={{ color: 'var(--accent)' }}
            >
              {paper.citingCount}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--accent-ink)', opacity: 0.7 }}>
              citing
            </div>
          </div>

          {/* Recipe pills */}
          <div className="flex flex-col gap-1.5">
            {(
              [
                { label: 'Impact',    color: 'var(--impact)',    bg: 'var(--impact-weak)' },
                { label: 'Network',   color: 'var(--network)',   bg: 'var(--network-weak)' },
                { label: 'Relevance', color: 'var(--relevance)', bg: 'var(--relevance-weak)' },
                { label: 'Context',   color: 'var(--context)',   bg: 'var(--context-weak)' },
              ] as const
            ).map((pill) => (
              <div
                key={pill.label}
                className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: pill.bg, color: pill.color }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: pill.color }}
                  aria-hidden="true"
                />
                {pill.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
