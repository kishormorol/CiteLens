import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[CiteLens] Unhandled render error:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div
          className="rounded-2xl border border-[var(--line)] p-8"
          style={{ background: 'var(--bg-1)' }}
        >
          <div
            className="text-2xl mb-2"
            style={{ fontFamily: 'Instrument Serif, Georgia, serif', color: 'var(--ink)' }}
          >
            Something went wrong
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-3)', lineHeight: '1.6' }}>
            An unexpected error occurred while rendering this page.
          </p>
          <pre
            className="text-xs rounded-xl p-3 mb-6 overflow-auto"
            style={{ background: 'var(--bg-3)', color: 'var(--ink-4)', maxHeight: '8rem' }}
          >
            {this.state.error.message}
          </pre>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-[var(--bg-2)]"
              style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    )
  }
}
