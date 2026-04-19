import React from 'react'
import type { Paper } from '../../types'
import { Badge } from '../ui/Badge'
import { Metric } from '../ui/Metric'
import { RecipeRow } from '../ui/RecipeRow'
import { ExternalLinkIcon } from '../ui/Icons'
import { useApp } from '../../context/AppContext'

interface SplitPreviewProps {
  paper: Paper | null
}

export function SplitPreview({ paper }: SplitPreviewProps) {
  const { state } = useApp()
  const tone = state.tweaks.reasoningTone

  if (!paper) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full min-h-[400px] rounded-2xl border border-[var(--line)] border-dashed"
        style={{ color: 'var(--ink-4)' }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mb-3 opacity-40">
          <rect x="6" y="8" width="28" height="4" rx="2" fill="currentColor" />
          <rect x="6" y="16" width="20" height="3" rx="1.5" fill="currentColor" />
          <rect x="6" y="23" width="24" height="3" rx="1.5" fill="currentColor" />
          <rect x="6" y="30" width="16" height="3" rx="1.5" fill="currentColor" />
        </svg>
        <p className="text-sm">Select a paper to see details</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl border border-[var(--line)] overflow-hidden flex flex-col"
      style={{ background: 'var(--bg-1)', boxShadow: 'var(--shadow-md)' }}
    >
      {/* Score header */}
      <div
        className="p-5 flex items-center gap-4 border-b border-[var(--line)]"
        style={{ background: 'var(--accent-weak)' }}
      >
        <div>
          <div
            className="text-5xl font-mono font-bold leading-none"
            style={{ color: 'var(--accent)' }}
          >
            {paper.final}
          </div>
          <div className="text-xs mt-1 font-medium" style={{ color: 'var(--accent-ink)', opacity: 0.7 }}>
            / 100
          </div>
        </div>
        <div className="flex-1">
          <h3
            className="text-base leading-snug mb-2"
            style={{ fontFamily: 'Instrument Serif, Georgia, serif', color: 'var(--ink)' }}
          >
            {paper.title}
          </h3>
          <div className="flex flex-wrap gap-1">
            {paper.badges.map((b) => (
              <Badge key={b} label={b} variant="accent" size="xs" />
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
        {/* Meta */}
        <div className="text-sm" style={{ color: 'var(--ink-3)' }}>
          <span>{paper.authors}</span>
          <span className="mx-2 opacity-40">·</span>
          <span className="font-medium" style={{ color: 'var(--accent-ink)' }}>{paper.venue}</span>
          <span className="mx-2 opacity-40">·</span>
          <span>{paper.year}</span>
          <span className="mx-2 opacity-40">·</span>
          <span className="font-mono font-medium">{paper.citations.toLocaleString()}</span> citations
        </div>

        {/* Why callout */}
        <div
          className="text-sm leading-relaxed rounded-lg px-4 py-3 border-l-2"
          style={{
            background: 'var(--accent-weak)',
            borderLeftColor: 'var(--accent)',
            color: tone === 'accented' ? 'var(--accent-ink)' : 'var(--ink-2)',
          }}
        >
          {paper.why}
        </div>

        {/* Formula */}
        <div
          className="p-3 rounded-xl border border-[var(--line)] text-xs overflow-x-auto"
          style={{ background: 'var(--bg-2)' }}
        >
          <RecipeRow
            impact={paper.impact}
            network={paper.network}
            relevance={paper.relevance}
            context={paper.context}
            final={paper.final}
          />
        </div>

        {/* 4 metric tiles */}
        <div className="grid grid-cols-2 gap-2">
          <Metric type="impact" score={paper.impact} label="Impact" description={paper.breakdown.impact} />
          <Metric type="network" score={paper.network} label="Network" description={paper.breakdown.network} />
          <Metric type="relevance" score={paper.relevance} label="Relevance" description={paper.breakdown.relevance} />
          <Metric type="context" score={paper.context} label="Context" description={paper.breakdown.context} />
        </div>

        {/* Abstract */}
        {paper.abstract && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>
              Abstract
            </span>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              {paper.abstract}
            </p>
          </div>
        )}

        {/* Open button */}
        <a
          href={paper.url ?? '#'}
          target={paper.url ? '_blank' : undefined}
          rel={paper.url ? 'noopener noreferrer' : undefined}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--accent-line)] text-sm font-medium transition-colors hover:bg-[var(--accent-weak)]"
          style={{ color: 'var(--accent-ink)', opacity: paper.url ? 1 : 0.5 }}
        >
          Open paper
          <ExternalLinkIcon size={13} />
        </a>
      </div>
    </div>
  )
}
