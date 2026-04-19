import React from 'react'
import type { Paper } from '../../types'
import { SignalBars } from '../ui/Metric'
import { useApp } from '../../context/AppContext'
import { ExternalLinkIcon } from '../ui/Icons'

interface PaperStreamRowProps {
  paper: Paper
  rank: number
}

function PaperStreamRow({ paper, rank }: PaperStreamRowProps) {
  const { state, dispatch } = useApp()
  const isSelected = state.selectedPaperId === paper.id

  function handleSelect() {
    dispatch({
      type: 'SELECT_PAPER',
      payload: isSelected ? null : paper.id,
    })
  }

  return (
    <tr
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleSelect()
        }
      }}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`${paper.title}, score ${paper.final}`}
      className={`cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-[var(--accent-weak)] ${
        isSelected ? 'bg-[var(--accent-weak)]' : 'hover:bg-[var(--bg-2)]'
      }`}
    >
      {/* Rank */}
      <td className="py-2.5 pl-4 pr-2 w-8">
        <span
          className="text-sm font-mono font-semibold"
          style={{ color: isSelected ? 'var(--accent)' : 'var(--ink-5)' }}
        >
          {rank}
        </span>
      </td>

      {/* Title + sub */}
      <td className="py-2.5 px-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span
            className="text-sm font-medium leading-snug line-clamp-1"
            style={{
              fontFamily: 'Instrument Serif, Georgia, serif',
              color: isSelected ? 'var(--accent-ink)' : 'var(--ink)',
            }}
          >
            {paper.title}
          </span>
          <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
            {paper.venue} · {paper.authors.split(',')[0]} et al.
          </span>
        </div>
      </td>

      {/* Signal bars */}
      <td className="py-2.5 px-2 w-16 hidden sm:table-cell">
        <SignalBars
          impact={paper.impact}
          network={paper.network}
          relevance={paper.relevance}
          context={paper.context}
        />
      </td>

      {/* Score */}
      <td className="py-2.5 px-2 w-12">
        <span
          className="text-sm font-mono font-semibold"
          style={{ color: isSelected ? 'var(--accent)' : 'var(--ink-2)' }}
        >
          {paper.final}
        </span>
      </td>

      {/* Year */}
      <td className="py-2.5 pr-4 pl-2 w-14 hidden sm:table-cell">
        <span className="text-xs font-mono" style={{ color: 'var(--ink-4)' }}>
          {paper.year}
        </span>
      </td>

      {/* Open */}
      <td className="py-2.5 pr-3 pl-2 w-8">
        <a
          href={paper.url ?? '#'}
          target={paper.url ? '_blank' : undefined}
          rel={paper.url ? 'noopener noreferrer' : undefined}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open ${paper.title}`}
          className="transition-opacity"
          style={{ color: 'var(--ink-3)', opacity: paper.url ? 0.4 : 0.15 }}
          onMouseEnter={(e) => { if (paper.url) (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
          onMouseLeave={(e) => { if (paper.url) (e.currentTarget as HTMLAnchorElement).style.opacity = '0.4' }}
        >
          <ExternalLinkIcon size={12} />
        </a>
      </td>
    </tr>
  )
}

interface PaperStreamProps {
  papers: Paper[]
}

export function PaperStream({ papers }: PaperStreamProps) {
  return (
    <div
      className="rounded-2xl border border-[var(--line)] overflow-hidden"
      style={{ background: 'var(--bg-1)' }}
    >
      <table className="w-full border-collapse">
        <thead>
          <tr
            className="border-b border-[var(--line)]"
            style={{ background: 'var(--bg-2)' }}
          >
            <th className="py-2 pl-4 pr-2 text-left w-8">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
                #
              </span>
            </th>
            <th className="py-2 px-2 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
                Paper
              </span>
            </th>
            <th className="py-2 px-2 text-left w-16 hidden sm:table-cell">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
                Signals
              </span>
            </th>
            <th className="py-2 px-2 text-left w-12">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
                Score
              </span>
            </th>
            <th className="py-2 px-2 text-left w-14 hidden sm:table-cell">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
                Year
              </span>
            </th>
            <th className="py-2 pr-3 pl-2 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {papers.map((paper, i) => (
            <PaperStreamRow key={paper.id} paper={paper} rank={i + 1} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
