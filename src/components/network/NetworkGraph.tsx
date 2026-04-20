/**
 * NetworkGraph — force-directed citation graph.
 *
 * Physics (no external deps):
 *   - Charge repulsion between all node pairs
 *   - Radial spring: each node pulled toward its score-based ideal radius
 *   - Collision: nodes cannot overlap
 *   - Velocity damping + alpha cooling → simulation settles naturally
 *
 * Interaction:
 *   - Animated on mount (nodes fly from center)
 *   - Drag any node to reposition
 *   - Hover to preview; click to open score-breakdown panel
 */

import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react'
import { useApp } from '../../context/AppContext'
import { usePapers } from '../../hooks/usePapers'
import type { Paper, SeedPaper } from '../../types'
import { isSeedPaperMatch, isSelfCitation } from '../../utils/selfCitation'

// ─── Canvas dimensions ────────────────────────────────────────────────────────

const W = 800
const H = 500
const CX = W / 2
const CY = H / 2
const SEED_R = 26
const NODE_MIN = 7
const NODE_MAX = 20
const SELF_CITATION_COLOR = 'oklch(62% 0.19 24)'
const SELF_CITATION_RING = 'oklch(72% 0.16 24)'

// ─── Physics constants ────────────────────────────────────────────────────────

const CHARGE = 2400      // node-node repulsion
const RADIAL_K = 0.06    // spring toward ideal radius
const DAMPING = 0.72     // velocity decay per tick
const ALPHA_START = 1.0
const ALPHA_DECAY = 0.022
const MIN_ALPHA = 0.003
const TICK_CAP = 200     // max ticks (safety)

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimNode {
  paper: GraphPaper
  x: number
  y: number
  vx: number
  vy: number
  r: number
  color: string
  stroke: string
  idealRadius: number
  isSelfCitation: boolean
}

interface GraphPaper extends Paper {
  isSelfCitation: boolean
}

type SelfCitationFilter = 'all' | 'only' | 'hide'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 75) return 'var(--accent)'
  if (s >= 55) return 'var(--impact)'
  if (s >= 35) return 'var(--relevance)'
  return 'var(--ink-4)'
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + '…'
}

function toAuthorInput(paper: Paper | SeedPaper) {
  return {
    authorIds: paper.authorIds,
    authorNames: paper.authorNames,
    authorsText: paper.authors,
  }
}

function deriveGraphPapers(
  papers: Paper[],
  seedPaper: SeedPaper | null,
  selfCitationFilter: SelfCitationFilter,
): GraphPaper[] {
  const enriched = papers.map((paper) => {
    const matchesSeed = seedPaper ? isSelfCitation(toAuthorInput(seedPaper), toAuthorInput(paper)) : false
    const looksLikeSeed = isSeedPaperMatch(
      seedPaper?.title,
      seedPaper?.year,
      paper.title,
      paper.year,
    )

    return {
      ...paper,
      isSelfCitation: looksLikeSeed ? false : matchesSeed,
    }
  })

  if (selfCitationFilter === 'only') return enriched.filter((paper) => paper.isSelfCitation)
  if (selfCitationFilter === 'hide') return enriched.filter((paper) => !paper.isSelfCitation)
  return enriched
}

function initNodes(papers: GraphPaper[]): SimNode[] {
  if (!papers.length) return []
  const maxCit = Math.max(...papers.map((p) => p.citations), 1)
  return papers.map((paper, i) => {
    // Start nodes in a tight circle around center so they visibly fly out
    const angle = (i / papers.length) * Math.PI * 2
    const r = NODE_MIN + (Math.log1p(paper.citations) / Math.log1p(maxCit)) * (NODE_MAX - NODE_MIN)
    // Higher score → closer to seed
    const idealRadius = 85 + (1 - paper.final / 100) * 150
    return {
      paper,
      x: CX + Math.cos(angle) * 30,
      y: CY + Math.sin(angle) * 30,
      vx: Math.cos(angle) * 2,
      vy: Math.sin(angle) * 2,
      r,
      color: scoreColor(paper.final),
      stroke: paper.isSelfCitation ? SELF_CITATION_COLOR : scoreColor(paper.final),
      idealRadius,
      isSelfCitation: paper.isSelfCitation,
    }
  })
}

function runTick(nodes: SimNode[], alpha: number): SimNode[] {
  const n = nodes.length
  const next = nodes.map((nd) => ({ ...nd }))

  // 1. Charge repulsion between every pair
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = next[i], b = next[j]
      let dx = b.x - a.x, dy = b.y - a.y
      const dist2 = dx * dx + dy * dy || 1
      const dist = Math.sqrt(dist2)
      const force = (CHARGE * alpha) / dist2
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx -= fx; a.vy -= fy
      b.vx += fx; b.vy += fy
    }
  }

  // 2. Radial spring: pull each node toward its ideal radius from center
  for (const nd of next) {
    const dx = nd.x - CX, dy = nd.y - CY
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const diff = dist - nd.idealRadius
    nd.vx -= (dx / dist) * diff * RADIAL_K * alpha
    nd.vy -= (dy / dist) * diff * RADIAL_K * alpha
  }

  // 3. Collision: push overlapping nodes apart
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = next[i], b = next[j]
      const dx = b.x - a.x, dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const minDist = a.r + b.r + 8
      if (dist < minDist) {
        const push = (minDist - dist) / 2
        const px = (dx / dist) * push * 0.6
        const py = (dy / dist) * push * 0.6
        a.x -= px; a.y -= py
        b.x += px; b.y += py
      }
    }
  }

  // 4. Apply velocity + damping + boundary clamp
  for (const nd of next) {
    nd.vx *= DAMPING
    nd.vy *= DAMPING
    nd.x += nd.vx
    nd.y += nd.vy
    const pad = nd.r + 18
    nd.x = Math.max(pad, Math.min(W - pad, nd.x))
    nd.y = Math.max(pad, Math.min(H - pad, nd.y))
  }

  return next
}

// ─── Force simulation hook ────────────────────────────────────────────────────

function useForceSimulation(papers: GraphPaper[]) {
  const [nodes, setNodes] = useState<SimNode[]>([])
  const [isFrozen, setIsFrozen] = useState(false)
  const stateRef = useRef<{ nodes: SimNode[]; alpha: number; ticks: number }>({
    nodes: [],
    alpha: ALPHA_START,
    ticks: 0,
  })
  const frozenRef = useRef(false)
  const rafRef = useRef<number>()

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = undefined
    }
  }, [])

  const startLoop = useCallback(() => {
    if (rafRef.current || frozenRef.current) return

    function loop() {
      const s = stateRef.current
      if (frozenRef.current || s.alpha < MIN_ALPHA || s.ticks >= TICK_CAP) {
        rafRef.current = undefined
        return
      }
      s.alpha *= 1 - ALPHA_DECAY
      s.ticks++
      s.nodes = runTick(s.nodes, s.alpha)
      setNodes([...s.nodes])
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => {
    const init = initNodes(papers)
    stateRef.current = { nodes: init, alpha: ALPHA_START, ticks: 0 }
    setNodes(init)
    startLoop()
    return stopLoop
  }, [papers, startLoop, stopLoop])

  const moveNode = useCallback((id: number, x: number, y: number) => {
    stateRef.current.nodes = stateRef.current.nodes.map((nd) =>
      nd.paper.id === id ? { ...nd, x, y, vx: 0, vy: 0 } : nd
    )
    // Wake simulation back up after drag
    stateRef.current.alpha = Math.max(stateRef.current.alpha, 0.1)
    stateRef.current.ticks = 0
    setNodes([...stateRef.current.nodes])
    startLoop()
  }, [startLoop])

  const resetLayout = useCallback(() => {
    const init = initNodes(papers)
    stateRef.current = { nodes: init, alpha: ALPHA_START, ticks: 0 }
    setNodes(init)
    startLoop()
  }, [papers, startLoop])

  const toggleFreeze = useCallback(() => {
    setIsFrozen((prev) => {
      const next = !prev
      frozenRef.current = next
      if (next) {
        stopLoop()
      } else {
        stateRef.current.alpha = Math.max(stateRef.current.alpha, 0.08)
        startLoop()
      }
      return next
    })
  }, [startLoop, stopLoop])

  return { nodes, moveNode, resetLayout, isFrozen, toggleFreeze }
}

// ─── SVG gradient edge ────────────────────────────────────────────────────────

function Edge({
  x1, y1, x2, y2, color, faded, highlighted,
}: {
  x1: number; y1: number; x2: number; y2: number
  color: string; faded: boolean; highlighted: boolean
}) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={highlighted ? color : 'var(--line-2)'}
      strokeWidth={highlighted ? 2 : 0.9}
      strokeOpacity={faded ? 0.04 : highlighted ? 0.62 : 0.16}
      style={{ transition: 'stroke-opacity 0.16s, stroke-width 0.16s' }}
    />
  )
}

// ─── Hover tooltip ────────────────────────────────────────────────────────────

interface TooltipState { paper: GraphPaper; sx: number; sy: number }

function Tooltip({ tip, cw }: { tip: TooltipState; cw: number }) {
  const W_TIP = 246
  const left = tip.sx + W_TIP + 18 > cw ? tip.sx - W_TIP - 10 : tip.sx + 12
  const top  = Math.max(6, tip.sy - 62)
  return (
    <div
      className="absolute pointer-events-none z-20 rounded-xl border border-[var(--line)] px-3 py-2.5"
      style={{ background: 'var(--bg-1)', left, top, width: W_TIP, boxShadow: 'var(--shadow-md)' }}
    >
      <p className="text-[11px] font-medium leading-snug" style={{ color: 'var(--ink)' }}>
        {truncate(tip.paper.title, 58)}
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-4)' }}>
        {tip.paper.year || '—'}{tip.paper.venue ? ` · ${truncate(tip.paper.venue, 20)}` : ''}
      </p>
      <div className="flex gap-3 mt-2">
        {[
          { l: 'Final',   v: tip.paper.final,   c: 'var(--accent)'    },
          { l: 'Network', v: tip.paper.network,  c: 'var(--network)'   },
          { l: 'Impact',  v: tip.paper.impact,   c: 'var(--impact)'    },
        ].map(({ l, v, c }) => (
          <div key={l} className="flex flex-col items-center">
            <span className="text-[11px] font-mono font-semibold" style={{ color: c }}>{v}</span>
            <span className="text-[9px]" style={{ color: 'var(--ink-4)' }}>{l}</span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 text-[10px] leading-snug" style={{ color: 'var(--ink-3)' }}>
        <p>{tip.paper.citations.toLocaleString()} citations</p>
        <p>Self-citation: {tip.paper.isSelfCitation ? 'Yes' : 'No'}</p>
      </div>
      <p className="text-[9px] mt-1.5" style={{ color: 'var(--ink-5)' }}>
        {tip.paper.isSelfCitation ? 'Shares at least one seed author' : 'No shared seed author detected'}
      </p>
      <p className="text-[9px] mt-1" style={{ color: 'var(--ink-5)' }}>Drag · Click to inspect</p>
    </div>
  )
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-16 flex-shrink-0" style={{ color: 'var(--ink-4)' }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-3)' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color, opacity: 0.85 }} />
      </div>
      <span className="text-[10px] font-mono w-6 text-right flex-shrink-0" style={{ color }}>{value}</span>
    </div>
  )
}

// ─── Selected panel ───────────────────────────────────────────────────────────

function SelectedPanel({
  paper, onClose, onGo,
}: { paper: GraphPaper; onClose: () => void; onGo: () => void }) {
  return (
    <div className="border-t border-[var(--line)] p-4" style={{ background: 'var(--bg-2)' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--ink)' }}>{paper.title}</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>{truncate(paper.authors, 60)}</p>
          <div className="flex gap-2 mt-1 text-[10px]" style={{ color: 'var(--ink-4)' }}>
            <span>{paper.year || '—'}</span>
            {paper.venue && <><span>·</span><span>{truncate(paper.venue, 30)}</span></>}
            <span>·</span><span>{paper.citations.toLocaleString()} citations</span>
            <span>·</span><span>{paper.isSelfCitation ? 'Self-citation' : 'External citation'}</span>
          </div>
        </div>
        <button onClick={onClose} className="flex-shrink-0 text-[11px] px-2 py-1 rounded"
          style={{ color: 'var(--ink-4)', background: 'var(--bg-3)' }}>✕</button>
      </div>
      <div className="flex flex-col gap-1.5 mb-3">
        <ScoreBar label="Final"     value={paper.final}     color="var(--accent)"    />
        <ScoreBar label="Network"   value={paper.network}   color="var(--network)"   />
        <ScoreBar label="Impact"    value={paper.impact}    color="var(--impact)"    />
        <ScoreBar label="Relevance" value={paper.relevance} color="var(--relevance)" />
      </div>
      <button onClick={onGo}
        className="text-[11px] font-medium px-3 py-1.5 rounded-lg"
        style={{ background: 'var(--accent-weak)', color: 'var(--accent-ink)', border: '1px solid var(--accent-line)' }}>
        View full details in ranked list →
      </button>
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({
  selfCitations,
  total,
}: {
  selfCitations: number
  total: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <div className="flex items-center gap-1.5">
        <span className="rounded-full inline-block" style={{ width: 10, height: 10, background: 'var(--accent)' }} />
        <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Seed paper</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="rounded-full inline-block" style={{ width: 9, height: 9, border: '1.5px solid var(--line-2)', background: 'var(--bg-1)' }} />
        <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Regular paper</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="rounded-full inline-block" style={{ width: 9, height: 9, border: `2px solid ${SELF_CITATION_RING}`, background: 'var(--bg-1)' }} />
        <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
          Self-citation ({selfCitations}/{total})
        </span>
      </div>
      <span className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>Final score</span>
      {[
        { color: 'var(--accent)',    label: '75–100' },
        { color: 'var(--impact)',    label: '55–74' },
        { color: 'var(--relevance)', label: '35–54' },
        { color: 'var(--ink-4)',     label: '0–34'  },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className="rounded-full inline-block" style={{ width: 8, height: 8, background: color }} />
          <span className="text-[11px] font-mono" style={{ color: 'var(--ink-3)' }}>{label}</span>
        </div>
      ))}
      <span className="text-[11px]" style={{ color: 'var(--ink-4)' }}>· Size = citations · Distance = relevance</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NetworkGraph() {
  const { state, dispatch } = useApp()
  const papers = usePapers()
  const [selfCitationFilter, setSelfCitationFilter] = useState<SelfCitationFilter>('all')
  const graphPapers = useMemo(
    () => deriveGraphPapers(papers, state.seedPaper, selfCitationFilter),
    [papers, state.seedPaper, selfCitationFilter],
  )
  const { nodes, moveNode, resetLayout, isFrozen, toggleFreeze } = useForceSimulation(graphPapers)

  const [tooltip, setTooltip]     = useState<TooltipState | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [panelPaper, setPanelPaper] = useState<GraphPaper | null>(null)
  const [dragging, setDragging]   = useState<{ id: number; ox: number; oy: number } | null>(null)
  const svgRef     = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Clear panel when papers or graph filters change (new search/view)
  useEffect(() => {
    setPanelPaper(null)
    setHoveredId(null)
    setTooltip(null)
  }, [graphPapers])

  // ── SVG coordinate helper ────────────────────────────────────────────────────
  function toSVG(clientX: number, clientY: number): [number, number] {
    const rect = svgRef.current!.getBoundingClientRect()
    return [
      (clientX - rect.left) * (W / rect.width),
      (clientY - rect.top)  * (H / rect.height),
    ]
  }

  // ── Drag handlers ────────────────────────────────────────────────────────────
  function onNodeMouseDown(e: React.MouseEvent, node: SimNode) {
    e.stopPropagation()
    const [sx, sy] = toSVG(e.clientX, e.clientY)
    setDragging({ id: node.paper.id, ox: sx - node.x, oy: sy - node.y })
    setTooltip(null)
  }

  function onSVGMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (dragging) {
      const [sx, sy] = toSVG(e.clientX, e.clientY)
      moveNode(dragging.id, sx - dragging.ox, sy - dragging.oy)
    }
  }

  function onSVGMouseUp() { setDragging(null) }

  // ── Hover handlers ───────────────────────────────────────────────────────────
  function onNodeMouseEnter(e: React.MouseEvent, paper: GraphPaper) {
    if (dragging) return
    const rect = containerRef.current!.getBoundingClientRect()
    setHoveredId(paper.id)
    setTooltip({ paper, sx: e.clientX - rect.left, sy: e.clientY - rect.top })
  }

  function onNodeMouseMove(e: React.MouseEvent) {
    if (!tooltip || dragging) return
    const rect = containerRef.current!.getBoundingClientRect()
    setTooltip((t) => t && { ...t, sx: e.clientX - rect.left, sy: e.clientY - rect.top })
  }

  function onNodeMouseLeave() { if (!dragging) { setHoveredId(null); setTooltip(null) } }

  // ── Click ────────────────────────────────────────────────────────────────────
  function onNodeClick(paper: GraphPaper) {
    if (dragging) return
    setPanelPaper((prev) => (prev?.id === paper.id ? null : paper))
    dispatch({ type: 'SELECT_PAPER', payload: paper.id })
  }

  function onCanvasClick() {
    if (dragging) return
    setPanelPaper(null)
    setHoveredId(null)
    setTooltip(null)
    dispatch({ type: 'SELECT_PAPER', payload: null })
  }

  // ── Top-N label set ──────────────────────────────────────────────────────────
  const labelIds = useMemo(() => {
    const sorted = [...graphPapers].sort((a, b) => b.final - a.final)
    return new Set(sorted.slice(0, 5).map((p) => p.id))
  }, [graphPapers])

  if (graphPapers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed border-[var(--line)]"
        style={{ background: 'var(--bg-1)' }}>
        <p className="text-base font-medium mb-1" style={{ color: 'var(--ink-3)' }}>No papers match this network view</p>
        <p className="text-sm" style={{ color: 'var(--ink-4)' }}>Try adjusting the self-citation filter or relevance constraints</p>
      </div>
    )
  }

  const activeId = panelPaper?.id ?? hoveredId
  const dimmed   = activeId !== null || dragging !== null
  const avgFinal = Math.round(graphPapers.reduce((s, p) => s + p.final, 0) / graphPapers.length)
  const topNet   = Math.max(...graphPapers.map((p) => p.network))
  const selfCitations = graphPapers.filter((paper) => paper.isSelfCitation).length
  const cw       = containerRef.current?.offsetWidth ?? 800

  return (
    <div className="flex flex-col gap-5">

      {/* Stats row */}
      <div className="rounded-2xl border border-[var(--line)] p-5" style={{ background: 'var(--bg-1)' }}>
        <div className="flex flex-wrap gap-8 mb-4">
          {[
            { v: graphPapers.length.toString(), l: 'papers in graph',   c: 'var(--accent)'  },
            { v: `${topNet}`,              l: 'top network score', c: 'var(--network)' },
            { v: `${avgFinal}`,            l: 'avg final score',   c: 'var(--impact)'  },
            { v: `${selfCitations}`,       l: 'self-citations',    c: SELF_CITATION_COLOR },
          ].map(({ v, l, c }) => (
            <div key={l}>
              <div className="text-3xl font-mono font-semibold leading-none" style={{ color: c }}>{v}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--ink-4)' }}>{l}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <Legend selfCitations={selfCitations} total={graphPapers.length} />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelfCitationFilter('all')}
              className="text-[11px] px-2.5 py-1 rounded-md border"
              style={{
                color: selfCitationFilter === 'all' ? 'var(--accent-ink)' : 'var(--ink-3)',
                background: selfCitationFilter === 'all' ? 'var(--accent-weak)' : 'var(--bg-1)',
                borderColor: selfCitationFilter === 'all' ? 'var(--accent-line)' : 'var(--line)',
              }}
            >
              All
            </button>
            <button
              onClick={() => setSelfCitationFilter('only')}
              className="text-[11px] px-2.5 py-1 rounded-md border"
              style={{
                color: selfCitationFilter === 'only' ? SELF_CITATION_COLOR : 'var(--ink-3)',
                background: selfCitationFilter === 'only' ? 'color-mix(in oklch, var(--bg-1) 84%, oklch(62% 0.19 24) 16%)' : 'var(--bg-1)',
                borderColor: selfCitationFilter === 'only' ? SELF_CITATION_RING : 'var(--line)',
              }}
            >
              Self only
            </button>
            <button
              onClick={() => setSelfCitationFilter('hide')}
              className="text-[11px] px-2.5 py-1 rounded-md border"
              style={{
                color: selfCitationFilter === 'hide' ? 'var(--accent-ink)' : 'var(--ink-3)',
                background: selfCitationFilter === 'hide' ? 'var(--accent-weak)' : 'var(--bg-1)',
                borderColor: selfCitationFilter === 'hide' ? 'var(--accent-line)' : 'var(--line)',
              }}
            >
              Hide self
            </button>
            <button
              onClick={resetLayout}
              className="text-[11px] px-2.5 py-1 rounded-md border"
              style={{ color: 'var(--ink-3)', background: 'var(--bg-1)', borderColor: 'var(--line)' }}
            >
              Reset layout
            </button>
            <button
              onClick={toggleFreeze}
              className="text-[11px] px-2.5 py-1 rounded-md border"
              style={{
                color: isFrozen ? 'var(--accent-ink)' : 'var(--ink-3)',
                background: isFrozen ? 'var(--accent-weak)' : 'var(--bg-1)',
                borderColor: isFrozen ? 'var(--accent-line)' : 'var(--line)',
              }}
            >
              {isFrozen ? 'Unfreeze' : 'Freeze'}
            </button>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div ref={containerRef} className="relative rounded-2xl border border-[var(--line)] overflow-hidden"
        style={{ background: 'var(--bg-1)' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full select-none"
          style={{ height: H, display: 'block', cursor: dragging ? 'grabbing' : 'default' }}
          onMouseMove={onSVGMouseMove}
          onMouseUp={onSVGMouseUp}
          onMouseLeave={onSVGMouseUp}
          onClick={onCanvasClick}
          aria-label="Citation network graph"
        >
          <defs>
            <radialGradient id="ng-seed-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"   />
            </radialGradient>
            <filter id="ng-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Seed glow halo */}
          <circle cx={CX} cy={CY} r={SEED_R + 36} fill="url(#ng-seed-glow)" />

          {/* Edges */}
          {nodes.map((nd) => (
            <Edge
              key={`e-${nd.paper.id}`}
              x1={CX} y1={CY} x2={nd.x} y2={nd.y}
              color={nd.isSelfCitation ? SELF_CITATION_COLOR : nd.color}
              highlighted={nd.paper.id === activeId}
              faded={dimmed && nd.paper.id !== activeId}
            />
          ))}

          {/* Candidate nodes */}
          {nodes.map((nd) => {
            const isHov  = nd.paper.id === hoveredId
            const isSel  = nd.paper.id === panelPaper?.id
            const isDrag = nd.paper.id === dragging?.id
            const fade   = dimmed && !isHov && !isSel && !isDrag
            const showLabel = (labelIds.has(nd.paper.id) || isHov || isSel) && !dragging
            const nodeStroke = nd.isSelfCitation ? SELF_CITATION_COLOR : nd.stroke

            // Label position: outward from center
            const dx = nd.x - CX, dy = nd.y - CY
            const len = Math.sqrt(dx * dx + dy * dy) || 1
            const lx  = nd.x + (dx / len) * (nd.r + 9)
            const ly  = nd.y + (dy / len) * (nd.r + 9)
            const anchor = dx > 0.15 ? 'start' : dx < -0.15 ? 'end' : 'middle'

            return (
              <g
                key={nd.paper.id}
                style={{
                  cursor: isDrag ? 'grabbing' : 'grab',
                  opacity: fade ? 0.15 : 1,
                  transition: fade ? 'opacity 0.2s' : 'opacity 0.1s',
                }}
                onMouseDown={(e) => onNodeMouseDown(e, nd)}
                onMouseEnter={(e) => onNodeMouseEnter(e, nd.paper)}
                onMouseMove={onNodeMouseMove}
                onMouseLeave={onNodeMouseLeave}
                onClick={(e) => { e.stopPropagation(); onNodeClick(nd.paper) }}
                role="button"
                aria-label={nd.paper.title}
              >
                {/* Aura */}
                <circle cx={nd.x} cy={nd.y} r={nd.r + 7} fill={nd.isSelfCitation ? SELF_CITATION_COLOR : nd.color}
                  opacity={isSel ? 0.28 : isHov ? 0.2 : nd.isSelfCitation ? 0.1 : 0.05}
                  style={{ transition: 'opacity 0.15s' }} />

                {/* Body */}
                <circle
                  cx={nd.x} cy={nd.y} r={nd.r}
                  fill={isHov || isSel ? nd.color : nd.isSelfCitation ? 'color-mix(in oklch, var(--bg-1) 82%, oklch(62% 0.19 24) 18%)' : 'var(--bg-1)'}
                  stroke={nodeStroke}
                  strokeWidth={isSel ? 2.8 : nd.isSelfCitation ? 2.2 : 1.6}
                  filter={isHov || isSel ? 'url(#ng-glow)' : undefined}
                  style={{ transition: 'fill 0.15s, stroke-width 0.15s' }}
                />

                {/* Self-citation ring */}
                {nd.isSelfCitation && (
                  <circle
                    cx={nd.x}
                    cy={nd.y}
                    r={nd.r + 4}
                    fill="none"
                    stroke={SELF_CITATION_RING}
                    strokeWidth={isSel ? 1.8 : 1.3}
                    strokeOpacity={isHov || isSel ? 0.9 : 0.65}
                  />
                )}

                {/* Selection dashed ring */}
                {isSel && (
                  <circle cx={nd.x} cy={nd.y} r={nd.r + 9}
                    fill="none" stroke={nodeStroke}
                    strokeWidth="1.5" strokeDasharray="3 3"
                  />
                )}

                {/* Label for top papers */}
                {showLabel && (
                  <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle"
                    fontSize="9" fontFamily="Inter, system-ui, sans-serif"
                    fill={isHov || isSel ? 'var(--ink)' : 'var(--ink-3)'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {truncate(nd.paper.title, 26)}
                  </text>
                )}
              </g>
            )
          })}

          {/* Seed node — always on top */}
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={CX} cy={CY} r={SEED_R + 5} fill="var(--accent)" opacity={0.2} />
            <circle cx={CX} cy={CY} r={SEED_R} fill="var(--accent)" filter="url(#ng-glow)" />
            <text x={CX} y={CY - 3} textAnchor="middle" fontSize="8" fontWeight="700"
              fontFamily="JetBrains Mono, monospace" fill="white" style={{ userSelect: 'none' }}>
              SEED
            </text>
            <text x={CX} y={CY + 8} textAnchor="middle" fontSize="7"
              fontFamily="JetBrains Mono, monospace" fill="white" opacity={0.75}
              style={{ userSelect: 'none' }}>
              paper
            </text>
          </g>
        </svg>

        {tooltip && !dragging && <Tooltip tip={tooltip} cw={cw} />}

        {panelPaper && (
          <SelectedPanel
            paper={panelPaper}
            onClose={() => { setPanelPaper(null); dispatch({ type: 'SELECT_PAPER', payload: null }) }}
            onGo={() => { dispatch({ type: 'SELECT_PAPER', payload: panelPaper.id }); dispatch({ type: 'SET_RESULTS_TAB', payload: 'ranked' }) }}
          />
        )}
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--ink-4)' }}>
        Drag to rearrange · Hover for metadata · Click to pin details.
        Distance from seed ≈ relevance score. Self-citations are outlined in red.
      </p>
    </div>
  )
}
