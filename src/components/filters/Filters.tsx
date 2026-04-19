import React from 'react'
import { ResetIcon } from '../ui/Icons'
import { useApp } from '../../context/AppContext'

const YEAR_MIN = 2017
const YEAR_MAX = new Date().getFullYear()

export function Filters() {
  const { state, dispatch } = useApp()
  const { filters } = state

  function handleReset() {
    dispatch({ type: 'RESET_FILTERS' })
  }

  const yearBarLeft = ((filters.yearFrom - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100
  const yearBarWidth = ((filters.yearTo - filters.yearFrom) / (YEAR_MAX - YEAR_MIN)) * 100

  return (
    <aside
      className="rounded-2xl border border-[var(--line)] p-4 flex flex-col gap-5"
      style={{ background: 'var(--bg-1)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
          Filters
        </span>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-xs transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-ink)' }}
        >
          <ResetIcon size={12} />
          Reset
        </button>
      </div>

      {/* Year range */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
            Publication year
          </label>
          <span className="text-xs font-mono" style={{ color: 'var(--ink-3)' }}>
            {filters.yearFrom}–{filters.yearTo}
          </span>
        </div>

        {/* Visual year bar — reflects slider state */}
        <div
          className="relative h-2 rounded-full"
          style={{ background: 'var(--bg-3)' }}
          aria-hidden="true"
        >
          <div
            className="absolute top-0 h-full rounded-full"
            style={{
              left: `${yearBarLeft}%`,
              width: `${yearBarWidth}%`,
              background: 'var(--accent)',
              opacity: 0.7,
            }}
          />
        </div>

        {/* Year inputs row */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] mb-1 block" style={{ color: 'var(--ink-4)' }}>From</label>
            <input
              type="range"
              min={YEAR_MIN}
              max={filters.yearTo}
              value={filters.yearFrom}
              onChange={(e) =>
                dispatch({ type: 'SET_FILTER', payload: { yearFrom: Number(e.target.value) } })
              }
              className="w-full"
              aria-label={`From year: ${filters.yearFrom}`}
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] mb-1 block" style={{ color: 'var(--ink-4)' }}>To</label>
            <input
              type="range"
              min={filters.yearFrom}
              max={YEAR_MAX}
              value={filters.yearTo}
              onChange={(e) =>
                dispatch({ type: 'SET_FILTER', payload: { yearTo: Number(e.target.value) } })
              }
              className="w-full"
              aria-label={`To year: ${filters.yearTo}`}
            />
          </div>
        </div>
      </div>

      {/* Relevance threshold */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
            Relevance threshold
          </label>
          <span className="text-xs font-mono" style={{ color: 'var(--ink-3)' }}>
            {filters.relevanceThreshold === 0 ? 'Any' : `≥${filters.relevanceThreshold}`}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={filters.relevanceThreshold}
          onChange={(e) =>
            dispatch({ type: 'SET_FILTER', payload: { relevanceThreshold: Number(e.target.value) } })
          }
          className="w-full"
          aria-label={`Minimum relevance score: ${filters.relevanceThreshold === 0 ? 'any' : filters.relevanceThreshold}`}
        />
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-3 pt-1 border-t border-[var(--line)]">
        <Toggle
          label="Highly influential only"
          description="Papers marked as highly influential in Semantic Scholar"
          checked={filters.highlyInfluential}
          onChange={(v) => dispatch({ type: 'SET_FILTER', payload: { highlyInfluential: v } })}
        />
        <Toggle
          label="Review papers only"
          description="Show only survey and review articles"
          checked={filters.reviewOnly}
          onChange={(v) => dispatch({ type: 'SET_FILTER', payload: { reviewOnly: v } })}
        />
      </div>
    </aside>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="flex-shrink-0 mt-0.5">
        <div
          className="relative rounded-full transition-colors"
          style={{
            background: checked ? 'var(--accent)' : 'var(--bg-3)',
            width: '2rem',
            height: '1.125rem',
          }}
        >
          <div
            className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform"
            style={{
              left: '0.125rem',
              transform: checked ? 'translateX(0.875rem)' : 'translateX(0)',
            }}
          />
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only"
          />
        </div>
      </div>
      <div>
        <div className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
          {label}
        </div>
        <div className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--ink-4)' }}>
          {description}
        </div>
      </div>
    </label>
  )
}
