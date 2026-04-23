import type { Paper } from '../types'

const CSV_COLUMNS = [
  'rank',
  'title',
  'authors',
  'year',
  'venue',
  'doi',
  'arxivId',
  'paperId',
  'url',
  'finalScore',
  'impactScore',
  'networkScore',
  'relevanceScore',
  'citationIntentScore',
  'highlyInfluential',
  'badges',
  'whyRanked',
] as const

const TITLE_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'for',
  'in',
  'of',
  'on',
  'the',
  'to',
  'with',
])

const JOURNAL_VENUE_PATTERN =
  /\b(journal|transactions|letters|magazine|review|reviews|survey|surveys|nature|science|cell|pnas|ai open|computing surveys)\b/i
const CONFERENCE_VENUE_PATTERN =
  /\b(conference|symposium|workshop|meeting|neurips|nips|iclr|icml|cvpr|eccv|iccv|acl|emnlp|naacl|aaai|ijcai|kdd|sigir|www|uist|chi|icra|rss|icassp|interspeech)\b/i
const MAX_BIBTEX_ABSTRACT_LENGTH = 1000

type CsvColumn = (typeof CSV_COLUMNS)[number]

export type CsvRow = Record<CsvColumn, string>

function splitAuthors(authors: string): string[] {
  return authors
    .split(/\s*,\s*/)
    .map((author) => author.trim())
    .filter(Boolean)
}

function joinValues(values: string[]): string {
  return values.filter(Boolean).join('; ')
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

function toOptionalString(value: string | number | boolean | undefined): string {
  if (value === undefined) return ''
  return String(value)
}

function extractArxivId(paper: Paper): string {
  const doiMatch = paper.doi?.match(/arxiv[.:/]+([A-Za-z0-9./_-]+)/i)
  if (doiMatch) {
    return doiMatch[1]
  }

  const urlMatch = paper.url?.match(/arxiv\.org\/(?:abs|pdf)\/([^?#/]+(?:\/[^?#/]+)?)/i)
  if (urlMatch) {
    return urlMatch[1].replace(/\.pdf$/i, '')
  }

  return ''
}

function hasHighlyInfluentialBadge(paper: Paper): boolean {
  return paper.badges.includes('Highly Influential')
}

function normalizeAscii(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '')
}

function getFirstAuthorLastName(authors: string): string {
  const firstAuthor = splitAuthors(authors)[0] ?? 'unknown'
  const parts = firstAuthor.split(/\s+/).filter(Boolean)
  const lastName = parts[parts.length - 1] ?? firstAuthor
  return normalizeAscii(lastName) || 'unknown'
}

function getFirstMeaningfulTitleWord(title: string): string {
  const words = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .map((word) => word.trim())
    .filter(Boolean)

  const meaningfulWord = words.find((word) => !TITLE_STOP_WORDS.has(word.toLowerCase()))
    ?? words[0]
    ?? 'paper'

  return normalizeAscii(meaningfulWord) || 'paper'
}

function buildBibtexKey(paper: Paper, collisionCount: number): string {
  const authorKey = getFirstAuthorLastName(paper.authors)
  const yearKey = paper.year > 0 ? String(paper.year) : 'nodate'
  const titleKey = getFirstMeaningfulTitleWord(paper.title)
  const suffix =
    collisionCount === 0
      ? ''
      : collisionCount <= 26
        ? String.fromCharCode(96 + collisionCount)
        : String(collisionCount)

  return `${authorKey}${yearKey}${titleKey}${suffix}`
}

function inferBibtexEntryType(venue: string): 'article' | 'inproceedings' | 'misc' {
  if (!venue.trim()) return 'misc'
  if (JOURNAL_VENUE_PATTERN.test(venue)) return 'article'
  if (CONFERENCE_VENUE_PATTERN.test(venue)) return 'inproceedings'

  const compactVenue = venue.replace(/[^A-Za-z0-9]/g, '')
  if (/^[A-Z0-9]{3,10}$/.test(compactVenue)) {
    return 'inproceedings'
  }

  return 'misc'
}

function escapeBibtexValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\r?\n/g, ' ')
    .trim()
}

function formatBibtexField(name: string, value: string): string {
  return `  ${name} = {${escapeBibtexValue(value)}}`
}

export function toCsvRows(results: Paper[]): CsvRow[] {
  return results.map((paper, index) => ({
    rank: String(index + 1),
    title: paper.title,
    authors: joinValues(splitAuthors(paper.authors)),
    year: paper.year > 0 ? String(paper.year) : '',
    venue: paper.venue ?? '',
    doi: paper.doi ?? '',
    arxivId: extractArxivId(paper),
    paperId: String(paper.id),
    url: paper.url ?? '',
    finalScore: String(paper.final),
    impactScore: String(paper.impact),
    networkScore: String(paper.network),
    relevanceScore: String(paper.relevance),
    citationIntentScore: String(paper.context),
    highlyInfluential: String(hasHighlyInfluentialBadge(paper)),
    badges: joinValues(paper.badges),
    whyRanked: paper.why,
  }))
}

export function serializeCsv(rows: CsvRow[]): string {
  const header = CSV_COLUMNS.join(',')
  const lines = rows.map((row) =>
    CSV_COLUMNS
      .map((column) => escapeCsvField(toOptionalString(row[column])))
      .join(','),
  )

  return [header, ...lines].join('\r\n')
}

export function toBibtex(results: Paper[]): string {
  const keyCounts = new Map<string, number>()

  return results
    .map((paper) => {
      const baseKey = buildBibtexKey(paper, 0)
      const currentCount = keyCounts.get(baseKey) ?? 0
      keyCounts.set(baseKey, currentCount + 1)
      // First occurrence gets no suffix (collisionCount=0), subsequent get a/b/c...
      const entryKey = buildBibtexKey(paper, currentCount)
      const entryType = inferBibtexEntryType(paper.venue ?? '')
      const authors = joinValues(splitAuthors(paper.authors)).replace(/; /g, ' and ')
      const lines = [
        formatBibtexField('title', paper.title),
        authors ? formatBibtexField('author', authors) : '',
        paper.year > 0 ? formatBibtexField('year', String(paper.year)) : '',
        entryType === 'article' && paper.venue
          ? formatBibtexField('journal', paper.venue)
          : '',
        entryType === 'inproceedings' && paper.venue
          ? formatBibtexField('booktitle', paper.venue)
          : '',
        paper.doi ? formatBibtexField('doi', paper.doi) : '',
        paper.url ? formatBibtexField('url', paper.url) : '',
        paper.abstract && paper.abstract.length <= MAX_BIBTEX_ABSTRACT_LENGTH
          ? formatBibtexField('abstract', paper.abstract)
          : '',
      ].filter(Boolean)

      return `@${entryType}{${entryKey},\n${lines.join(',\n')}\n}`
    })
    .join('\n\n')
}

export function getExportDateStamp(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function downloadTextFile(filename: string, mimeType: string, content: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export results as structured JSON.
 * Includes seed paper metadata, export timestamp, and all ranked papers
 * with full score breakdowns.
 */
export function toJson(
  results: Paper[],
  seedPaper: import('../types').SeedPaper | null,
): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    exportVersion: '1',
    seedPaper: seedPaper ? {
      title: seedPaper.title,
      authors: seedPaper.authors,
      year: seedPaper.year,
      venue: seedPaper.venue,
      citations: seedPaper.citations,
      totalCiting: seedPaper.citingCount,
      sources: seedPaper.sources,
      abstract: seedPaper.abstract,
      url: seedPaper.url,
      doi: seedPaper.doi,
    } : null,
    totalResults: results.length,
    results: results.map((paper, index) => ({
      rank: index + 1,
      title: paper.title,
      authors: paper.authors,
      year: paper.year || null,
      venue: paper.venue || null,
      doi: paper.doi || null,
      url: paper.url || null,
      citations: paper.citations,
      scores: {
        final: paper.final,
        impact: paper.impact,
        network: paper.network,
        relevance: paper.relevance,
        citationIntent: paper.context,
      },
      badges: paper.badges,
      highlyInfluential: paper.highlyInfluential,
      review: paper.review,
      abstract: paper.abstract || null,
      whyRanked: paper.why,
      scoreBreakdown: paper.breakdown,
    })),
  }
  return JSON.stringify(payload, null, 2)
}
