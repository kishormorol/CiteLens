import React from 'react'
import { useApp } from '../../context/AppContext'

export function Timeline() {
  const { state } = useApp()
  const papers = state.papers.filter((p) => p.year > 0)

  // Build year → count map from real papers
  const countByYear: Record<number, number> = {}
  for (const p of papers) {
    countByYear[p.year] = (countByYear[p.year] ?? 0) + 1
  }

  const years = Object.keys(countByYear).map(Number).sort()

  if (years.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed border-[var(--line)]"
        style={{ background: 'var(--bg-1)' }}
      >
        <p className="text-base font-medium mb-1" style={{ color: 'var(--ink-3)' }}>
          No timeline data available
        </p>
        <p className="text-sm" style={{ color: 'var(--ink-4)' }}>
          Year information is missing for the returned papers
        </p>
      </div>
    )
  }

  const data = years.map((year) => ({ year, count: countByYear[year] }))
  const maxCount = Math.max(...data.map((d) => d.count))
  const total = data.reduce((s, d) => s + d.count, 0)

  const lastFull = data[data.length - 1]
  const prevFull = data.length >= 2 ? data[data.length - 2] : null
  const yoyGrowth = prevFull && prevFull.count > 0
    ? Math.round(((lastFull.count / prevFull.count) - 1) * 100)
    : null

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div
        className="rounded-2xl border border-[var(--line)] p-5"
        style={{ background: 'var(--bg-1)' }}
      >
        <div className="flex flex-wrap gap-6 mb-6">
          <div>
            <div
              className="text-3xl font-mono font-semibold leading-none"
              style={{ color: 'var(--accent)' }}
            >
              {total.toLocaleString()}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--ink-4)' }}>
              citing papers with known year
            </div>
          </div>
          <div>
            <div
              className="text-3xl font-mono font-semibold leading-none"
              style={{ color: 'var(--impact)' }}
            >
              {lastFull.count.toLocaleString()}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--ink-4)' }}>
              citations in {lastFull.year}
            </div>
          </div>
          {yoyGrowth !== null && (
            <div>
              <div
                className="text-3xl font-mono font-semibold leading-none"
                style={{ color: yoyGrowth >= 0 ? 'var(--relevance)' : 'var(--ink-3)' }}
              >
                {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth}%
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--ink-4)' }}>
                YoY growth ({String(prevFull!.year).slice(2)}→{String(lastFull.year).slice(2)})
              </div>
            </div>
          )}
        </div>

        {/* Arc visualization */}
        <div className="relative">
          <svg
            viewBox="0 0 700 180"
            className="w-full overflow-visible"
            style={{ height: '180px' }}
            aria-hidden="true"
          >
            <line x1="20" y1="90" x2="680" y2="90" stroke="var(--line-2)" strokeWidth="1" />

            {[25, 50, 75, 100].map((pct) => (
              <line
                key={pct}
                x1="20"
                y1={90 - (pct / 100) * 75}
                x2="680"
                y2={90 - (pct / 100) * 75}
                stroke="var(--line)"
                strokeWidth="0.5"
                strokeDasharray="4 4"
              />
            ))}

            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {(() => {
              const n = data.length
              if (n === 0) return null
              const pts = data.map((d, i) => {
                const x = n === 1 ? 350 : 20 + (i / (n - 1)) * 660
                const y = 90 - (d.count / maxCount) * 72
                return { x, y, d }
              })

              const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
              const areaD = pathD + ` L ${pts[pts.length - 1].x} 90 L ${pts[0].x} 90 Z`

              return (
                <>
                  <path d={areaD} fill="url(#areaGrad)" />
                  <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  {pts.map(({ x, y, d }, i) => {
                    const labelY = i % 2 === 0 ? y - 14 : y - 6
                    return (
                      <g key={d.year}>
                        <circle cx={x} cy={y} r="5" fill="var(--bg-1)" stroke="var(--accent)" strokeWidth="2" />
                        <text x={x} y={90 + 14} textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono, monospace" fill="var(--ink-4)">
                          {d.year}
                        </text>
                        <text x={x} y={labelY} textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600" fill="var(--ink-3)">
                          {d.count >= 1000 ? `${(d.count / 1000).toFixed(0)}K` : d.count}
                        </text>
                      </g>
                    )
                  })}
                </>
              )
            })()}
          </svg>
        </div>
      </div>

      {/* Per-year bar list */}
      <div
        className="rounded-2xl border border-[var(--line)] p-5"
        style={{ background: 'var(--bg-1)' }}
      >
        <h3
          className="text-base mb-4"
          style={{ fontFamily: 'Instrument Serif, Georgia, serif', color: 'var(--ink)' }}
        >
          Citations by year
        </h3>
        <div className="flex flex-col gap-3">
          {data.map((d) => (
            <div key={d.year} className="flex items-center gap-4">
              <span className="font-mono font-medium w-10 flex-shrink-0" style={{ color: 'var(--accent)' }}>
                {d.year}
              </span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-3)' }} aria-hidden="true">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(d.count / maxCount) * 100}%`, background: 'var(--accent)', opacity: 0.75 }}
                />
              </div>
              <span className="font-mono text-xs w-14 text-right flex-shrink-0" style={{ color: 'var(--ink-3)' }}>
                {d.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
