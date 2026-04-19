import React, { useRef } from 'react'
import { SparkleIcon } from '../ui/Icons'
import { useApp } from '../../context/AppContext'
import type { AnalyzeMode } from '../../types'
import { EXAMPLE_CHIPS } from '../../data/mockData'

const ANALYZE_MODES: { value: AnalyzeMode; label: string }[] = [
  { value: 'influential', label: 'Most Influential' },
  { value: 'relevant', label: 'Most Relevant' },
  { value: 'recent', label: 'Recent' },
  { value: 'reviews', label: 'Reviews' },
]

export function Hero() {
  const { state, dispatch, analyze } = useApp()
  const { query, analyzeMode, mode } = state
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isLoading = mode === 'loading'
  const hasResults = mode === 'results'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    analyze()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (query.trim()) analyze()
    }
  }

  function handleChipClick(query: string) {
    analyze(query)
  }

  return (
    <section
      className={`transition-all duration-500 ${
        hasResults ? 'py-8 border-b border-[var(--line)]' : 'py-16 sm:py-24'
      }`}
      style={{ background: hasResults ? 'var(--bg-1)' : 'transparent' }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {!hasResults && (
          <>
            {/* Eyebrow */}
            <div className="flex justify-center mb-6">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium"
                style={{
                  background: 'var(--accent-weak)',
                  color: 'var(--accent-ink)',
                  borderColor: 'var(--accent-line)',
                }}
              >
                <SparkleIcon size={11} />
                <span>NEW</span>
                <span style={{ color: 'var(--ink-4)' }}>Semantic scoring v2 · now with context signals</span>
              </div>
            </div>

            {/* Headline */}
            <h1
              className="text-center mb-4 leading-[1.12] tracking-tight"
              style={{
                fontFamily: 'Instrument Serif, Georgia, serif',
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                color: 'var(--ink)',
              }}
            >
              Find the follow-up papers
              <br />
              <span style={{ color: 'var(--accent)' }}>that matter most.</span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-center text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed"
              style={{ color: 'var(--ink-3)' }}
            >
              Paste any paper — arXiv ID, DOI, title, or URL. CiteLens surfaces the
              citing papers ranked by impact, network centrality, semantic relevance,
              and citation context.
            </p>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div
            className="rounded-2xl border border-[var(--line-2)] overflow-hidden transition-shadow focus-within:shadow-[0_0_0_2px_var(--accent-line)]"
            style={{ background: 'var(--bg-1)', boxShadow: 'var(--shadow-md)' }}
          >
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => dispatch({ type: 'SET_QUERY', payload: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="Paste arXiv ID (e.g. 1706.03762), DOI, paper title, or Semantic Scholar URL…"
              rows={hasResults ? 2 : 3}
              className="w-full resize-none p-4 text-sm bg-transparent outline-none"
              style={{ color: 'var(--ink)', caretColor: 'var(--accent)' }}
              disabled={isLoading}
            />

            {/* Mode toggle + submit */}
            <div
              className="flex items-center justify-between gap-3 px-3 py-2 border-t border-[var(--line)]"
              style={{ background: 'var(--bg-2)' }}
            >
              <div className="flex items-center gap-1 overflow-x-auto">
                {ANALYZE_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => dispatch({ type: 'SET_ANALYZE_MODE', payload: m.value })}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      analyzeMode === m.value
                        ? 'bg-[var(--accent-weak)] text-[var(--accent-ink)]'
                        : 'text-[var(--ink-3)] hover:bg-[var(--bg-3)] hover:text-[var(--ink-2)]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                }}
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing…</span>
                  </>
                ) : (
                  <>
                    <span>Analyze</span>
                    <kbd className="px-1 py-0.5 text-[10px] rounded font-mono bg-white/20">↵</kbd>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Example chips */}
          {!hasResults && (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs" style={{ color: 'var(--ink-4)' }}>Try:</span>
              {EXAMPLE_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleChipClick(chip.query)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-colors hover:bg-[var(--bg-2)]"
                  style={{
                    borderColor: 'var(--line)',
                    color: 'var(--ink-3)',
                    background: 'var(--bg-1)',
                  }}
                >
                  <span
                    className="px-1 py-0.5 rounded text-[10px] font-mono font-medium"
                    style={{ background: 'var(--accent-weak)', color: 'var(--accent-ink)' }}
                  >
                    {chip.type}
                  </span>
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </section>
  )
}
