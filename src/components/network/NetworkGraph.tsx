import React, { useMemo, useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { usePapers } from '../../hooks/usePapers'
import type { Paper } from '../../types'

// ── Layout constants ──────────────────────────────────────────────────────────

const CX = 400
const CY = 225
const SEED_R = 22
const RING_R = 178
const NODE_MIN = 5
const NODE_MAX = 16

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--accent)'
  if (score >= 60) return 'var(--impact)'
  if (score >= 40) return 'var(--relevance)'
  return 'var(--ink-4)'
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…'
}

interface NodePos {
  paper: Paper
  x: number
  y: number
  r: number
  color: string
}

function computeLayout(papers: Paper[]): NodePos[] {
  if (!papers.length) return []
  const maxCit = Math.max(...papers.map((p) => p.citations), 1)
  // Arrange by final score descending, starting at top (-π/2), clockwise
  const sorted = [...papers].sort((a, b) => b.final - a.final)
  return sorted.map((paper, i) => {
    const angle = (i / sorted.length) * 2 * Math.PI - Math.PI / 2
    const x = CX + RING_R * Math.cos(angle)
    const y = CY + RING_R * Math.sin(angle)
    const logScale = Math.log1p(paper.citations) / Math.log1p(maxCit)
    const r = NODE_MIN + logScale * (NODE_MAX - NODE_MIN)
    return { paper, x, y, r, color: scoreColor(paper.final) }
  })
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipState {
  paper: Paper
  svgX: number
  svgY: number
}

function Tooltip({ tip, containerW }: { tip: TooltipState; containerW: number }) {
  const W = 230
  // Flip to the left if near the right edge
  const left = tip.svgX + W + 24 > containerW ? tip.svgX - W - 12 : tip.svgX + 14
  const top = Math.max(8, tip.svgY - 48)

  return (
    <div
      className="absolute pointer-events-none z-20 rounded-xl border border-[var(--line)] p-3 shadow-lg"
      style={{
        background: 'var(--bg-1)',
        left,
        top,
        width: W,
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <p
        className="text-xs font-medium leading-snug mb-2"
        style={{ color: 'var(--ink)' }}
      >
        {truncate(tip.paper.title, 70)}
      </p>
      <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--ink-3)' }}>
        <span>{tip.paper.year || '—'}</span>
        {tip.paper.venue && <span>{truncate(tip.paper.venue, 20)}</span>}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <ScorePip label="Final" value={tip.paper.final} color="var(--accent)" />
        <ScorePip label="Net" value={tip.paper.network} color="var(--network)" />
        <ScorePip label="Cit" value={tip.paper.citations.toLocaleString()} color="var(--impact)" raw />
      </div>
      <p className="text-[9px] mt-2" style={{ color: 'var(--ink-4)' }}>
        Click to view in ranked list
      </p>
    </div>
  )
}

function ScorePip({
  label,
  value,
  color,
  raw = false,
}: {
  label: string
  value: number | string
  color: string
  raw?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-mono font-semibold leading-none" style={{ color }}>
        {raw ? value : `${value}`}
      </span>
      <span className="text-[9px]" style={{ color: 'var(--ink-4)' }}>
        {label}
      </span>
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  const entries = [
    { color: 'var(--accent)',    label: '80–100  Top tier' },
    { color: 'var(--impact)',    label: '60–79   High' },
    { color: 'var(--relevance)', label: '40–59   Moderate' },
    { color: 'var(--ink-4)',     label: '0–39    Low' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <span className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
        Final score
      </span>
      {entries.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span
            className="inline-block rounded-full"
            style={{ width: 8, height: 8, background: color }}
          />
          <span className="text-[11px] font-mono" style={{ color: 'var(--ink-3)' }}>
            {label}
          </span>
        </div>
      ))}
      <span className="text-[11px] ml-2" style={{ color: 'var(--ink-4)' }}>
        · Node size = citation count
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function NetworkGraph() {
  const { state, dispatch } = useApp()
  const papers = usePapers()
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const nodes = useMemo(() => computeLayout(papers), [papers])
  const selectedId = state.selectedPaperId

  const avgFinal = papers.length
    ? Math.round(papers.reduce((s, p) => s + p.final, 0) / papers.length)
    : 0
  const topNetwork = papers.length ? Math.max(...papers.map((p) => p.network)) : 0

  function handleNodeClick(paper: Paper) {
    dispatch({ type: 'SELECT_PAPER', payload: paper.id })
    dispatch({ type: 'SET_RESULTS_TAB', payload: 'ranked' })
  }

  function handleMouseMove(e: React.MouseEvent<SVGGElement>, paper: Paper) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({ paper, svgX: e.clientX - rect.left, svgY: e.clientY - rect.top })
  }

  if (papers.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed border-[var(--line)]"
        style={{ background: 'var(--bg-1)' }}
      >
        <p className="text-base font-medium mb-1" style={{ color: 'var(--ink-3)' }}>
          No papers match these filters
        </p>
        <p className="text-sm" style={{ color: 'var(--ink-4)' }}>
          Try widening the year range or lowering the relevance threshold
        </p>
      </div>
    )
  }

  const containerW = containerRef.current?.offsetWidth ?? 800

  return (
    <div className="flex flex-col gap-5">
      {/* Stats summary */}
      <div
        className="rounded-2xl border border-[var(--line)] p-5"
        style={{ background: 'var(--bg-1)' }}
      >
        <div className="flex flex-wrap gap-8 mb-5">
          <Stat
            value={papers.length.toString()}
            label="papers in graph"
            color="var(--accent)"
          />
          <Stat
            value={`${topNetwork}`}
            label="top network score"
            color="var(--network)"
          />
          <Stat
            value={`${avgFinal}`}
            label="avg final score"
            color="var(--impact)"
          />
        </div>
        <Legend />
      </div>

      {/* Graph */}
      <div
        ref={containerRef}
        className="relative rounded-2xl border border-[var(--line)] overflow-hidden"
        style={{ background: 'var(--bg-1)' }}
      >
        <svg
          viewBox="0 0 800 450"
          className="w-full"
          style={{ height: 450, display: 'block' }}
          aria-label="Citation network graph"
        >
          <defs>
            {/* Radial gradient for seed glow */}
            <radialGradient id="seedGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Subtle background ring */}
          <circle
            cx={CX}
            cy={CY}
            r={RING_R}
            fill="none"
            stroke="var(--line)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />

          {/* Seed glow */}
          <circle cx={CX} cy={CY} r={SEED_R + 28} fill="url(#seedGlow)" />

          {/* Edges: seed → each candidate */}
          {nodes.map(({ paper, x, y, color }) => (
            <line
              key={`edge-${paper.id}`}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke={color}
              strokeWidth="1"
              strokeOpacity="0.18"
            />
          ))}

          {/* Candidate nodes */}
          {nodes.map(({ paper, x, y, r, color }) => {
            const isSelected = selectedId === paper.id
            return (
              <g
                key={paper.id}
                style={{ cursor: 'pointer' }}
                onClick={() => handleNodeClick(paper)}
                onMouseMove={(e) => handleMouseMove(e, paper)}
                onMouseLeave={() => setTooltip(null)}
                role="button"
                aria-label={paper.title}
              >
                {/* Hover/selection aura */}
                <circle
                  cx={x}
                  cy={y}
                  r={r + 5}
                  fill={color}
                  opacity={isSelected ? 0.25 : 0.1}
                />
                {/* Main node */}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={isSelected ? color : 'var(--bg-1)'}
                  stroke={color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  style={{ transition: 'all 0.15s' }}
                />
                {/* Selection ring */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + 7}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}
              </g>
            )
          })}

          {/* Seed node (drawn last so it's on top) */}
          <g>
            <circle cx={CX} cy={CY} r={SEED_R + 4} fill="var(--accent)" opacity={0.2} />
            <circle cx={CX} cy={CY} r={SEED_R} fill="var(--accent)" />
            <text
              x={CX}
              y={CY - 3}
              textAnchor="middle"
              fontSize="8"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
              fill="white"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              SEED
            </text>
            <text
              x={CX}
              y={CY + 7}
              textAnchor="middle"
              fontSize="7"
              fontFamily="JetBrains Mono, monospace"
              fill="white"
              opacity={0.8}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              paper
            </text>
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <Tooltip tip={tooltip} containerW={containerW} />
        )}
      </div>

      {/* Footer hint */}
      <p className="text-xs text-center" style={{ color: 'var(--ink-4)' }}>
        Each node is a paper citing the seed. Click any node to jump to its ranked entry.
        Edges reflect the citation relationship to the seed paper.
      </p>
    </div>
  )
}

function Stat({
  value,
  label,
  color,
}: {
  value: string
  label: string
  color: string
}) {
  return (
    <div>
      <div
        className="text-3xl font-mono font-semibold leading-none"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-xs mt-1" style={{ color: 'var(--ink-4)' }}>
        {label}
      </div>
    </div>
  )
}
