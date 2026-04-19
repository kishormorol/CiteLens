import React, { useState } from 'react'
import { LogoIcon, SearchIcon, SlidersIcon, SunIcon, MoonIcon } from '../ui/Icons'
import { useApp } from '../../context/AppContext'
import { MethodologyModal } from '../modals/MethodologyModal'
import { DocsModal } from '../modals/DocsModal'
import { ChangelogModal } from '../modals/ChangelogModal'

type ModalKey = 'methodology' | 'docs' | 'changelog' | null

export function Navbar() {
  const { state, dispatch } = useApp()
  const { tweaks } = state
  const [modal, setModal] = useState<ModalKey>(null)

  function toggleTheme() {
    dispatch({
      type: 'SET_TWEAKS',
      payload: { theme: tweaks.theme === 'light' ? 'dark' : 'light' },
    })
  }

  function toggleTweaks() {
    dispatch({ type: 'TOGGLE_TWEAKS_PANEL' })
  }

  return (
    <>
    <header
      className="sticky top-0 z-50 border-b border-[var(--line)] backdrop-blur-md"
      style={{ background: 'color-mix(in oklab, var(--bg-1) 92%, transparent)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-4">
        {/* Logo */}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2.5 flex-shrink-0 no-underline bg-transparent border-0 cursor-pointer p-0"
        >
          <LogoIcon size={28} />
          <span
            className="text-base font-semibold tracking-tight"
            style={{ color: 'var(--ink)', fontFamily: 'Inter, sans-serif' }}
          >
            CiteLens
          </span>
        </button>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1 ml-4">
          {([
            { label: 'Methodology', key: 'methodology' },
            { label: 'Docs', key: 'docs' },
            { label: 'Changelog', key: 'changelog' },
          ] as { label: string; key: ModalKey }[]).map(({ label, key }) => (
            <button
              key={key}
              onClick={() => setModal(key)}
              className="px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-[var(--bg-2)]"
              style={{ color: 'var(--ink-3)' }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Search affordance */}
          <button
            onClick={() => window.dispatchEvent(new Event('citelens:focus-search'))}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--line)] text-sm transition-colors hover:bg-[var(--bg-2)]"
            style={{ color: 'var(--ink-4)' }}
          >
            <SearchIcon size={13} />
            <span>Search</span>
            <kbd
              className="px-1 py-0.5 text-[10px] rounded font-mono border border-[var(--line-2)]"
              style={{ background: 'var(--bg-2)', color: 'var(--ink-4)' }}
            >
              ⌘K
            </kbd>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={tweaks.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="p-2 rounded-lg border border-[var(--line)] transition-colors hover:bg-[var(--bg-2)]"
            style={{ color: 'var(--ink-3)' }}
          >
            {tweaks.theme === 'light' ? <MoonIcon size={15} /> : <SunIcon size={15} />}
          </button>

          {/* Tweaks button */}
          <button
            onClick={toggleTweaks}
            aria-label="Open tweaks panel"
            aria-expanded={state.tweaksPanelOpen}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              state.tweaksPanelOpen
                ? 'bg-[var(--accent-weak)] text-[var(--accent-ink)] border-[var(--accent-line)]'
                : 'border-[var(--line)] text-[var(--ink-3)] hover:bg-[var(--bg-2)]'
            }`}
          >
            <SlidersIcon size={14} />
            <span className="hidden sm:inline">Tweaks</span>
          </button>
        </div>
      </div>
    </header>

    <MethodologyModal open={modal === 'methodology'} onClose={() => setModal(null)} />
    <DocsModal open={modal === 'docs'} onClose={() => setModal(null)} />
    <ChangelogModal open={modal === 'changelog'} onClose={() => setModal(null)} />
    </>
  )
}
