import { describe, expect, it } from 'vitest'
import { mergeDeletedHighlightIds, mergeHighlightLists } from './highlightMerge.ts'
import type { ReaderHighlight } from './highlightSchema.ts'

function highlight(id: string, updatedAt: string, quote = 'quote'): ReaderHighlight {
  return {
    id,
    creationId: '00000000-0000-0000-0000-000000000001',
    startParagraph: 0,
    startChar: 0,
    endParagraph: 0,
    endChar: 4,
    quote,
    colour: 'yellow',
    note: null,
    createdAt: updatedAt,
    updatedAt,
  }
}

describe('mergeHighlightLists', () => {
  it('prefers the newer updatedAt when ids collide', () => {
    const remote = [highlight('a', '2026-01-01T00:00:00Z', 'remote')]
    const local = [highlight('a', '2026-01-02T00:00:00Z', 'local')]
    const merged = mergeHighlightLists(remote, local)
    expect(merged).toHaveLength(1)
    expect(merged[0]?.quote).toBe('local')
  })

  it('keeps unique ids from both lists', () => {
    const merged = mergeHighlightLists(
      [highlight('a', '2026-01-01T00:00:00Z')],
      [highlight('b', '2026-01-01T00:00:00Z')],
    )
    expect(merged.map((h) => h.id).sort()).toEqual(['a', 'b'])
  })
})

describe('mergeDeletedHighlightIds', () => {
  it('removes deleted ids from remote list', () => {
    const remote = [highlight('a', '2026-01-01T00:00:00Z'), highlight('b', '2026-01-01T00:00:00Z')]
    const next = mergeDeletedHighlightIds(remote, ['a'])
    expect(next.map((h) => h.id)).toEqual(['b'])
  })
})
