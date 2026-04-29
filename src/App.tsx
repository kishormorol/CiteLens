import React, { useEffect } from 'react'
import { Navbar } from './components/layout/Navbar'
import { Hero } from './components/hero/Hero'
import { ResultsShell } from './components/results/ResultsShell'
import { TweaksPanel, getAccentVars } from './components/tweaks/TweaksPanel'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { useApp } from './context/AppContext'

export function App() {
  const { state, dispatch, analyze } = useApp()
  const { tweaks, mode } = state

  // Auto-analyze when ?q= is present in the URL (e.g. from ResearchScope links)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q && q.trim()) {
      dispatch({ type: 'SET_QUERY', payload: q.trim() })
      analyze(q.trim())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const accentVars = getAccentVars(tweaks.accent, tweaks.theme)
  const densityClass = tweaks.density === 'compact' ? 'density-compact' : 'density-cozy'

  return (
    <div
      data-theme={tweaks.theme}
      className={`min-h-screen ${densityClass}`}
      style={{
        background: 'var(--bg)',
        color: 'var(--ink)',
        ...accentVars,
      }}
    >
      <Navbar />

      <ErrorBoundary>
      <main>
        <Hero />

        {(mode === 'loading' || mode === 'results') && (
          <ResultsShell />
        )}

        {mode === 'error' && (
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
            <div className="rounded-2xl border border-[var(--line)] p-8" style={{ background: 'var(--bg-1)' }}>
              <div
                className="text-2xl mb-2"
                style={{ fontFamily: 'Instrument Serif, Georgia, serif', color: 'var(--ink)' }}
              >
                Paper not found
              </div>
              <p className="text-sm mb-6" style={{ color: 'var(--ink-3)', lineHeight: '1.6' }}>
                We couldn't find this paper in Semantic Scholar, or it doesn't have enough
                citation data yet. This is common for very new or niche papers.
              </p>

              <div
                className="rounded-xl border border-[var(--line)] p-4 mb-6 flex flex-col gap-3"
                style={{ background: 'var(--bg-2)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
                  Try one of these instead
                </p>
                {[
                  ['arXiv ID', '1706.03762', 'Most reliable — works for any arXiv paper'],
                  ['arXiv URL', 'https://arxiv.org/abs/1706.03762', 'Paste the full abstract page URL'],
                  ['DOI', '10.1145/3292500.3330701', 'Found on the journal page or Google Scholar'],
                  ['Semantic Scholar URL', 'https://semanticscholar.org/paper/...', 'Direct link from semanticscholar.org'],
                ].map(([type, example, tip]) => (
                  <div key={type} className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{type}</span>
                    <code className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-3)', color: 'var(--accent-ink)' }}>
                      {example}
                    </code>
                    <span className="text-[11px]" style={{ color: 'var(--ink-4)' }}>{tip}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => dispatch({ type: 'SET_MODE', payload: 'idle' })}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {mode === 'idle' && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
            {/* Feature grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: 'Impact',
                  desc: 'Citation count, h-index influence, and downstream citation velocity.',
                  color: 'var(--impact)',
                  bg: 'var(--impact-weak)',
                },
                {
                  title: 'Network',
                  desc: 'Co-citation clusters, bibliographic coupling, and centrality scores.',
                  color: 'var(--network)',
                  bg: 'var(--network-weak)',
                },
                {
                  title: 'Relevance',
                  desc: 'Semantic similarity using embedding models over titles and abstracts.',
                  color: 'var(--relevance)',
                  bg: 'var(--relevance-weak)',
                },
                {
                  title: 'Context',
                  desc: 'How the paper is cited — foundational, applied, contested, or reviewed.',
                  color: 'var(--context)',
                  bg: 'var(--context-weak)',
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl p-5 border border-[var(--line)] flex flex-col gap-3"
                  style={{ background: 'var(--bg-1)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: f.bg }}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: f.color }}
                    />
                  </div>
                  <div>
                    <div
                      className="text-base font-semibold mb-1"
                      style={{ color: f.color }}
                    >
                      {f.title}
                    </div>
                    <div className="text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                      {f.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sources row */}
            <div
              className="mt-8 rounded-2xl border border-[var(--line)] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
              style={{ background: 'var(--bg-1)' }}
            >
              <div className="flex-shrink-0">
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--ink-4)' }}
                >
                  Data sources
                </div>
                <div className="flex flex-wrap gap-2">
                  {['OpenAlex', 'Semantic Scholar', 'Crossref'].map((src) => (
                    <span
                      key={src}
                      className="px-2.5 py-1 rounded-full border text-xs font-medium"
                      style={{
                        borderColor: 'var(--line)',
                        color: 'var(--ink-3)',
                        background: 'var(--bg-2)',
                      }}
                    >
                      {src}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex-1 hidden sm:block h-px" style={{ background: 'var(--line)' }} />
              <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'var(--ink-4)' }}>
                CiteLens cross-references three open scholarly APIs to build the most
                complete picture of how a paper has been cited and by whom.
              </p>
            </div>
          </section>
        )}
      </main>
      </ErrorBoundary>

      {/* Footer */}
      <footer
        className="border-t border-[var(--line)] mt-16"
        style={{ background: 'var(--bg-2)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-4)' }}>
            <span
              className="font-semibold"
              style={{ fontFamily: 'Instrument Serif, Georgia, serif', color: 'var(--ink-3)' }}
            >
              CiteLens
            </span>
            <span>·</span>
            <span>Research citation discovery</span>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--ink-5)' }}>
            <span>Methodology</span>
            <span>API</span>
            <span>Privacy</span>
          </div>
        </div>
      </footer>

      {/* Tweaks panel */}
      <TweaksPanel />
    </div>
  )
}
