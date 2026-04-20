export interface AuthorMatchInput {
  authorIds?: Array<string | null | undefined>
  authorNames?: Array<string | null | undefined>
  authorsText?: string | null
}

function normalizeId(id: string): string {
  return id.trim().toLowerCase()
}

export function normalizeAuthorName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function splitAuthorsText(authorsText?: string | null): string[] {
  if (!authorsText) return []
  return authorsText
    .split(',')
    .map((name) => normalizeAuthorName(name))
    .filter(Boolean)
}

function toIdSet(authorIds?: Array<string | null | undefined>): Set<string> {
  if (!authorIds || authorIds.length === 0) return new Set()
  return new Set(
    authorIds
      .filter((id): id is string => typeof id === 'string')
      .map(normalizeId)
      .filter(Boolean),
  )
}

function toNameSet(input: AuthorMatchInput): Set<string> {
  const names = [
    ...(input.authorNames ?? []),
    ...splitAuthorsText(input.authorsText),
  ]
  return new Set(
    names
      .filter((name): name is string => typeof name === 'string')
      .map(normalizeAuthorName)
      .filter(Boolean),
  )
}

function hasOverlap(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false
  for (const value of a) {
    if (b.has(value)) return true
  }
  return false
}

export function isSelfCitation(
  seedAuthors: AuthorMatchInput | null | undefined,
  candidateAuthors: AuthorMatchInput | null | undefined,
): boolean {
  if (!seedAuthors || !candidateAuthors) return false

  const seedIds = toIdSet(seedAuthors.authorIds)
  const candidateIds = toIdSet(candidateAuthors.authorIds)

  // Prefer stable IDs when both sides provide them.
  if (seedIds.size > 0 && candidateIds.size > 0) {
    return hasOverlap(seedIds, candidateIds)
  }

  const seedNames = toNameSet(seedAuthors)
  const candidateNames = toNameSet(candidateAuthors)
  return hasOverlap(seedNames, candidateNames)
}

export function isSeedPaperMatch(
  seedTitle: string | null | undefined,
  seedYear: number | null | undefined,
  candidateTitle: string | null | undefined,
  candidateYear: number | null | undefined,
): boolean {
  if (!seedTitle || !candidateTitle) return false
  const titleMatch = seedTitle.trim().toLowerCase() === candidateTitle.trim().toLowerCase()
  if (!titleMatch) return false
  if (!seedYear || !candidateYear) return true
  return seedYear === candidateYear
}
