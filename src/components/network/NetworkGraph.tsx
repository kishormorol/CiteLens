import React, { useMemo, useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { usePapers } from '../../hooks/usePapers'
import type { Paper } from '../../types'

// ── Layout ────────────────────────────────────────────────────────────────────

const CX = 400
const CY = 245
const SEED_R = 24
const RINGS = { inner: 108, mid: 170, outer: 232 } as const
const NODE_MIN = 5
const NODE_MAX = 15

function scoreColor(s: number) {
  if (s >= 80) return 'var(--accent)'
  if (s >= 60) return 'var(--impact)'
  if (s >= 40) return 'var(--relevance)'
  return 'var(--ink-4)'
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + '…'
}

interface NodePos {
  paper: Paper
  x: number
  y: number
  r: number
  color: string
  ring: 'inner' | 'mid' | 'outer'
  labelAngle: number // radians, outward from center
}

function computeLayout(papers: Paper[]): NodePos[] {
  if (!papers.length) return []

  const maxCit = Math.max(...papers.map((p) => p.citations), 1)

  // Sort by final score desc to assign rings
  const byScore = [...papers].sort((a, b) => b.final - a.final)
  const n = byScore.length
  const innerCount = Math.max(1, Math.round(n * 0.25))
  const outerCount = Math.max(1, Math.round(n * 0.25))

  const ringOf = (i: number): 'inner' | 'mid' | 'outer' =>
    i < innerCount ? 'inner' : i >= n - outerCount ? 'outer' : 'mid'

  // Group papers by ring
  const groups: Record<'inner' | 'mid' | 'outer', Paper[]> = {
    inner: [],
    mid: [],
    outer: [],
  }
  byScore.forEach((p, i) => groups[ringOf(i)].push(p))

  const nodes: NodePos[] = []

  for (const ring of ['inner', 'mid', 'outer'] as const) {
    const list = groups[ring]
    const R = RINGS[ring]
    list.forEach((paper, i) => {
      const angle = (i / list.length) * 2 * Math.PI - Math.PI / 2
      const x = CX + R * Math.cos(angle)
      const y = CY + R * Math.sin(angle)
      const logScale = Math.log1p(paper.citations) / Math.log1p(maxCit)
      const r = NODE_MIN + logScale * (NODE_MAX - NODE_MIN)
      nodes.push({ paper, x, y, r, color: scoreColor(paper.final), ring, labelAngle: angle })
    })
  }

  return nodes
}

// ── Selected paper panel ──────────────────────────────────────────────────────

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-16 flex-shrink-0" style={{ color: 'var(--ink-4)' }}>
        {label}
      </span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-3)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: color, opacity: 0.85 }}
        />
      </div>
      <span className="text-[10px] font-mono w-6 text-right flex-shrink-0" style={{ color }}>
        {value}
      </span>
    </div>
  )
}

function SelectedPanel({
  paper,
  onClose,
  onGoToRanked,
}: {
  paper: Paper
  onClose: () => void
  onGoToRanked: () => void
}) {
  return (
    <div
      className="border-t border-[var(--line)] p-4"
      style={{ background: 'var(--bg-2)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--ink)' }}>
            {paper.title}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
            {truncate(paper.authors, 60)}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[10px]" style={{ color: 'var(--ink-4)' }}>
            <span>{paper.year || '—'}</span>
            {paper.venue && <><span>·</span><span>{truncate(paper.venue, 28)}</span></>}
            <span>·</span>
            <span>{paper.citations.toLocaleString()} citations</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-[11px] px-2 py-1 rounded"
          style={{ color: 'var(--ink-4)', background: 'var(--bg-3)' }}
        >
          ✕
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <ScoreBar label="Final"     value={paper.final}     color="var(--accent)"    />
        <ScoreBar label="Network"   value={paper.network}   color="var(--network)"   />
        <ScoreBar label="Impact"    value={paper.impact}    color="var(--impact)"    />
        <ScoreBar label="Relevance" value={paper.relevance} color="var(--relevance)" />
      </div>

      <button
        onClick={onGoToRanked}
        className="mt-3 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors"
        style={{
          background: 'var(--accent-weak)',
          color: 'var(--accent-ink)',
          border: '1px solid var(--accent-line)',
        }}
      >
        View full details in ranked list →
      </button>
    </div>
  )
}

// ── Tooltip (hover) ───────────────────────────────────────────────────────────

interface TooltipState {
  paper: Paper
  svgX: number
  svgY: number
}

function Tooltip({ tip, containerW }: { tip: TooltipState; containerW: number }) {
  const W = 210
  const left = tip.svgX + W + 20 > containerW ? tip.svgX - W - 10 : tip.svgX + 12
  const top = Math.max(8, tip.svgY - 40)
  return (
    <div
      className="absolute pointer-events-none z-20 rounded-xl border border-[var(--line)] px-3 py-2.5"
      style={{ background: 'var(--bg-1)', left, top, width: W, boxShadow: 'var(--shadow-md)' }}
    >
      <p className="text-[11px] font-medium leading-snug mb-1" style={{ color: 'var(--ink)' }}>
        {truncate(tip.paper.title, 60)}
      </p>
      <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--ink-4)' }}>
        <span>{tip.paper.year || '—'}</span>
        {tip.paper.venue && <><span>·</span><span>{truncate(tip.paper.venue, 18)}</span></>}
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        {[
          { l: 'Final', v: tip.paper.final, c: 'var(--accent)' },
          { l: 'Net', v: tip.paper.network, c: 'var(--network)' },
        ].map(({ l, v, c }) => (
          <div key={l} className="flex flex-col items-center">
            <span className="text-[11px] font-mono font-semibold" style={{ color: c }}>{v}</span>
            <span className="text-[9px]" style={{ color: 'var(--ink-4)' }}>{l}</span>
          </div>
        ))}
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-mono font-semibold" style={{ color: 'var(--impact)' }}>
            {tip.paper.citations >= 1000
              ? `${(tip.paper.citations / 1000).toFixed(0)}K`
              : tip.paper.citations}
          </span>
          <span className="text-[9px]" style={{ color: 'var(--ink-4)' }}>Cit</span>
        </div>
      </div>
      <p className="text-[9px] mt-1.5" style={{ color: 'var(--ink-5)' }}>
        Click to inspect
      </p>
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <span className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>Score</span>
      {[
        { color: 'var(--accent)',    label: '80–100' },
        { color: 'var(--impact)',    label: '60–79'  },
        { color: 'var(--relevance)', label: '40–59'  },
        { color: 'var(--ink-4)',     label: '0–39'   },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: color }} />
          <span className="text-[11px] font-mono" style={{ color: 'var(--ink-3)' }}>{label}</span>
        </div>
      ))}
      <span className="text-[11px] ml-1" style={{ color: 'var(--ink-4)' }}>· Size = citations · Ring = score tier</span>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function NetworkGraph() {
  const { state, dispatch } = useApp()
  const papers = usePapers()
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [panelPaper, setPanelPaper] = useState<Paper | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const nodes = useMemo(() => computeLayout(papers), [papers])

  const avgFinal = papers.length
    ? Math.round(papers.reduce((s, p) => s + p.final, 0) / papers.length)
    : 0
  const topNetwork = papers.length ? Math.max(...papers.map((p) => p.network)) : 0

  // Top papers in inner ring get labels (up to 4)
  const labeledIds = useMemo(() => {
    return new Set(
      nodes
        .filter((n) => n.ring === 'inner')
        .slice(0, 4)
        .map((n) => n.paper.id),
    )
  }, [nodes])

  function handleNodeClick(paper: Paper) {
    setPanelPaper((prev) => (prev?.id === paper.id ? null : paper))
    dispatch({ type: 'SELECT_PAPER', payload: paper.id })
  }

  function handleMouseEnter(e: React.MouseEvent<SVGGElement>, paper: Paper) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setHoveredId(paper.id)
    setTooltip({ paper, svgX: e.clientX - rect.left, svgY: e.clientY - rect.top })
  }

  function handleMouseMove(e: React.MouseEvent<SVGGElement>) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || !tooltip) return
    setTooltip((t) => t && { ...t, svgX: e.clientX - rect.left, svgY: e.clientY - rect.top })
  }

  function handleMouseLeave() {
    setHoveredId(null)
    setTooltip(null)
  }

  function goToRanked(paper: Paper) {
    dispatch({ type: 'SELECT_PAPER', payload: paper.id })
    dispatch({ type: 'SET_RESULTS_TAB', payload: 'ranked' })
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
  const dimmed = hoveredId !== null

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div
        className="rounded-2xl border border-[var(--line)] p-5"
        style={{ background: 'var(--bg-1)' }}
      >
        <div className="flex flex-wrap gap-8 mb-5">
          {[
            { value: papers.length.toString(), label: 'papers in graph',    color: 'var(--accent)'   },
            { value: `${topNetwork}`,           label: 'top network score',  color: 'var(--network)'  },
            { value: `${avgFinal}`,             label: 'avg final score',    color: 'var(--impact)'   },
          ].map(({ value, label, color }) => (
            <div key={label}>
              <div className="text-3xl font-mono font-semibold leading-none" style={{ color }}>{value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--ink-4)' }}>{label}</div>
            </div>
          ))}
        </div>
        <Legend />
      </div>

      {/* Graph + panel */}
      <div
        ref={containerRef}
        className="relative rounded-2xl border border-[var(--line)] overflow-hidden"
        style={{ background: 'var(--bg-1)' }}
      >
        <svg
          viewBox="0 0 800 490"
          className="w-full"
          style={{ height: 490, display: 'block' }}
          aria-label="Citation network graph"
        >
          <defs>
            <radialGradient id="seedGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.06" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background ring guides */}
          {(['inner', 'mid', 'outer'] as const).map((ring) => (
            <circle
              key={ring}
              cx={CX}
              cy={CY}
              r={RINGS[ring]}
              fill={ring === 'inner' ? 'url(#innerGlow)' : 'none'}
              stroke="var(--line)"
              strokeWidth="1"
              strokeDasharray={ring === 'inner' ? '3 5' : '2 7'}
              strokeOpacity={ring === 'inner' ? 0.6 : 0.35}
            />
          ))}

          {/* Ring labels */}
          {[
            { ring: 'inner' as const, label: 'top tier' },
            { ring: 'mid'   as const, label: 'mid tier' },
            { ring: 'outer' as const, label: 'low tier' },
          ].map(({ ring, label }) => (
            <text
              key={ring}
              x={CX + RINGS[ring] + 6}
              y={CY + 4}
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
              fill="var(--ink-5)"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {label}
            </text>
          ))}

          {/* Seed glow */}
          <circle cx={CX} cy={CY} r={SEED_R + 32} fill="url(#seedGlow)" />

          {/* Edges */}
          {nodes.map(({ paper, x, y, color }) => {
            const isHovered = paper.id === hoveredId
            const isSelected = paper.id === panelPaper?.id
            return (
              <line
                key={`edge-${paper.id}`}
                x1={CX} y1={CY} x2={x} y2={y}
                stroke={isHovered || isSelected ? color : 'var(--line-2)'}
                strokeWidth={isHovered || isSelected ? 1.5 : 1}
                strokeOpacity={dimmed && !isHovered && !isSelected ? 0.1 : isHovered || isSelected ? 0.55 : 0.3}
                style={{ transition: 'stroke-opacity 0.15s, stroke-width 0.15s' }}
              />
            )
          })}

          {/* Nodes */}
          {nodes.map(({ paper, x, y, r, color, labelAngle }) => {
            const isHovered = paper.id === hoveredId
            const isSelected = paper.id === panelPaper?.id
            const faded = dimmed && !isHovered && !isSelected
            const showLabel = labeledIds.has(paper.id)

            // Label position: outward from center
            const dx = Math.cos(labelAngle), dy = Math.sin(labelAngle)
            const labelDist = r + 10
            const lx = x + dx * labelDist
            const ly = y + dy * labelDist
            const anchor = dx > 0.2 ? 'start' : dx < -0.2 ? 'end' : 'middle'

            return (
              <g
                key={paper.id}
                style={{ cursor: 'pointer', opacity: faded ? 0.2 : 1, transition: 'opacity 0.15s' }}
                onClick={() => handleNodeClick(paper)}
                onMouseEnter={(e) => handleMouseEnter(e, paper)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                role="button"
                aria-label={paper.title}
              >
                {/* Aura */}
                <circle cx={x} cy={y} r={r + 6} fill={color}
                  opacity={isSelected ? 0.28 : isHovered ? 0.18 : 0.08}
                  style={{ transition: 'opacity 0.15s' }}
                />
                {/* Body */}
                <circle
                  cx={x} cy={y} r={r}
                  fill={isSelected || isHovered ? color : 'var(--bg-1)'}
                  stroke={color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  style={{ transition: 'fill 0.15s, stroke-width 0.15s' }}
                />
                {/* Selection dashed ring */}
                {isSelected && (
                  <circle cx={x} cy={y} r={r + 8}
                    fill="none" stroke={color}
                    strokeWidth="1.5" strokeDasharray="3 3"
                  />
                )}
                {/* Label for top inner-ring nodes */}
                {showLabel && (
                  <text
                    x={lx} y={ly}
                    textAnchor={anchor}
                    fontSize="9"
                    fontFamily="Inter, system-ui, sans-serif"
                    fill="var(--ink-3)"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {truncate(paper.title, 28)}
                  </text>
                )}
              </g>
            )
          })}

          {/* Seed node */}
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={CX} cy={CY} r={SEED_R + 5} fill="var(--accent)" opacity={0.18} />
            <circle cx={CX} cy={CY} r={SEED_R} fill="var(--accent)" />
            <text x={CX} y={CY - 2} textAnchor="middle" fontSize="8" fontWeight="700"
              fontFamily="JetBrains Mono, monospace" fill="white"
              style={{ userSelect: 'none' }}
            >
              SEED
            </text>
            <text x={CX} y={CY + 8} textAnchor="middle" fontSize="7"
              fontFamily="JetBrains Mono, monospace" fill="white" opacity={0.75}
              style={{ userSelect: 'none' }}
            >
              paper
            </text>
          </g>
        </svg>

        {/* Hover tooltip */}
        {tooltip && <Tooltip tip={tooltip} containerW={containerW} />}

        {/* Selected paper panel */}
        {panelPaper && (
          <SelectedPanel
            paper={panelPaper}
            onClose={() => {
              setPanelPaper(null)
              dispatch({ type: 'SELECT_PAPER', payload: null })
            }}
            onGoToRanked={() => goToRanked(panelPaper)}
          />
        )}
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--ink-4)' }}>
        Closer rings = higher score. Node size = citation count. Hover to preview, click to inspect.
      </p>
    </div>
  )
}
