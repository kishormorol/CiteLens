import { isSeedPaperMatch, isSelfCitation, normalizeAuthorName } from './selfCitation.js'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function runSelfCitationTests(): void {
  // 1. author ID overlap => true
  assert(
    isSelfCitation(
      { authorIds: ['A-1', 'A-2'], authorNames: ['Alice Zhang'] },
      { authorIds: ['B-1', 'A-2'], authorNames: ['Bob Lee'] },
    ) === true,
    'expected true when author IDs overlap',
  )

  // 2. author ID non-overlap => false
  assert(
    isSelfCitation(
      { authorIds: ['A-1'], authorNames: ['Alice Zhang'] },
      { authorIds: ['B-1'], authorNames: ['Alice Zhang'] },
    ) === false,
    'expected false when both sides provide IDs but no ID overlap',
  )

  // 3. normalized name overlap => true
  assert(
    isSelfCitation(
      { authorNames: ['  Alice   Zhang  '] },
      { authorNames: ['alice zhang'] },
    ) === true,
    'expected true when normalized author names overlap',
  )

  // 4. normalized name non-overlap => false
  assert(
    isSelfCitation(
      { authorNames: ['Alice Zhang'] },
      { authorNames: ['Bob Lee'] },
    ) === false,
    'expected false when normalized author names do not overlap',
  )

  // 5. missing/null fields handled safely
  assert(isSelfCitation(undefined, { authorNames: ['Alice Zhang'] }) === false, 'expected safe false for missing seed')
  assert(isSelfCitation({ authorNames: ['Alice Zhang'] }, null) === false, 'expected safe false for missing candidate')
  assert(isSelfCitation({}, {}) === false, 'expected safe false for empty inputs')

  // 6. graph mapping seed protection helper
  assert(
    isSeedPaperMatch('Attention Is All You Need', 2017, 'attention is all you need', 2017) === true,
    'expected true when title/year match seed paper',
  )
  assert(
    isSeedPaperMatch('Attention Is All You Need', 2017, 'Attention Is All You Need', 2018) === false,
    'expected false when seed year differs',
  )

  // Conservative normalization check
  assert(
    normalizeAuthorName('  Alice   Zhang ') === 'alice zhang',
    'expected conservative name normalization',
  )
}

runSelfCitationTests()
console.log('selfCitation tests passed')
