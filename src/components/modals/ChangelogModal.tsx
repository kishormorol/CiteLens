import React from 'react'
import { Modal } from '../ui/Modal'

interface Props {
  open: boolean
  onClose: () => void
}

const CHANGELOG: {
  version: string
  date: string
  tag: 'feature' | 'fix' | 'improvement'
  items: string[]
}[] = [
  {
    version: '1.5.0',
    date: 'Apr 2026',
    tag: 'feature',
    items: [
      'ResearchScope integration — every result card now has a "🔭 ResearchScope" button that searches for related papers by title.',
      'Deep-link support: CiteLens now reads ?q= from the URL and auto-analyzes on load, enabling one-click flow from ResearchScope paper cards.',
      'Export results as BibTeX or CSV in one click from the results toolbar.',
      'Copy APA citation button on each paper card.',
    ],
  },
  {
    version: '1.4.0',
    date: 'Apr 2026',
    tag: 'feature',
    items: [
      'Network tab: force-directed citation graph — nodes fly outward from seed on load.',
      'Node size encodes citation count; color encodes final score tier; distance from seed encodes relevance.',
      'Drag any node to reposition it; simulation re-wakes and re-settles around the new position.',
      'Hover dims all other nodes to 15% opacity for focused inspection.',
      'Click a node to open an in-graph score-breakdown panel (Final, Network, Impact, Relevance bars).',
      'Labels rendered for the top-5 highest-scoring papers, positioned radially outward.',
      'SVG glow filter on seed node and hovered/selected nodes.',
    ],
  },
  {
    version: '1.3.0',
    date: 'Apr 2026',
    tag: 'feature',
    items: [
      'Methodology, Docs, and Changelog modals added to navbar.',
      'Timeline tab now shows real citation-by-year data from search results.',
      'Publication year filter now defaults to the current year automatically.',
    ],
  },
  {
    version: '1.2.0',
    date: 'Apr 2026',
    tag: 'fix',
    items: [
      'Fixed filters silently dropping papers with no year data.',
      'Fixed title search resolving to wrong paper (added Jaccard similarity matching).',
      'Fixed 404 responses now showing an error screen instead of demo data.',
      'Removed duplicate bar on relevance threshold slider.',
    ],
  },
  {
    version: '1.1.0',
    date: 'Apr 2026',
    tag: 'feature',
    items: [
      'Backend deployed to Railway — live Semantic Scholar and OpenAlex data.',
      'Frontend connected to backend API with graceful demo-data fallback.',
      'OpenAlex enrichment adds FWCI and citation percentile to results.',
    ],
  },
  {
    version: '1.0.0',
    date: 'Apr 2026',
    tag: 'feature',
    items: [
      'Initial release of CiteLens.',
      'Full ranking pipeline: resolve → fetch → enrich → deduplicate → rank.',
      'Four scoring dimensions: Impact, Network, Relevance, Context.',
      'Three layout modes: Focus, Split, Stream.',
      'Dark mode, accent colour picker, and density controls.',
      'arXiv, DOI, Semantic Scholar URL, and title input support.',
    ],
  },
]

const TAG_STYLES = {
  feature: { bg: 'var(--accent-weak)', color: 'var(--accent-ink)', label: 'Feature' },
  fix: { bg: 'var(--relevance-weak)', color: 'var(--relevance)', label: 'Fix' },
  improvement: { bg: 'var(--impact-weak)', color: 'var(--impact)', label: 'Improvement' },
}

export function ChangelogModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Changelog">
      <div className="flex flex-col gap-6">
        {CHANGELOG.map((entry, i) => {
          const tag = TAG_STYLES[entry.tag]
          return (
            <div key={entry.version} className="flex gap-4">
              {/* Timeline spine */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                  style={{ background: i === 0 ? 'var(--accent)' : 'var(--line-2)' }}
                />
                {i < CHANGELOG.length - 1 && (
                  <div className="w-px flex-1 mt-1" style={{ background: 'var(--line)' }} />
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col gap-2 pb-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-sm font-semibold font-mono"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    v{entry.version}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: tag.bg, color: tag.color }}
                  >
                    {tag.label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--ink-5)' }}>
                    {entry.date}
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {entry.items.map((item) => (
                    <li key={item} className="flex gap-2 items-start text-sm" style={{ color: 'var(--ink-3)' }}>
                      <span
                        className="flex-shrink-0 mt-1.5 w-1 h-1 rounded-full"
                        style={{ background: 'var(--ink-5)' }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
