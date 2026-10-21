import { describe, expect, it } from 'vitest'
import { highlightQuoteSchema, readerHighlightSchema, readerBookmarkSchema } from './highlightSchema.ts'

describe('highlightSchema', () => {
  it('accepts a valid highlight row', () => {
    const parsed = readerHighlightSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440001',
      creationId: '550e8400-e29b-41d4-a716-446655440000',
      startParagraph: 0,
      startChar: 0,
      endParagraph: 0,
      endChar: 4,
      quote: 'word',
      colour: 'yellow',
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects empty quotes and overlong notes', () => {
    expect(highlightQuoteSchema.safeParse('').success).toBe(false)
    expect(
      readerHighlightSchema.safeParse({
        id: '11111111-1111-1111-1111-111111111111',
        creationId: '00000000-0000-0000-0000-000000000001',
        startParagraph: 0,
        startChar: 0,
        endParagraph: 0,
        endChar: 4,
        quote: 'word',
        colour: 'yellow',
        note: 'x'.repeat(2001),
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      }).success,
    ).toBe(false)
  })

  it('validates bookmarks', () => {
    const parsed = readerBookmarkSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440001',
      creationId: '550e8400-e29b-41d4-a716-446655440000',
      paragraph: 2,
      paragraphOffset: 0.5,
      label: 'Chapter',
      createdAt: '2026-01-01T00:00:00Z',
    })
    expect(parsed.success).toBe(true)
  })
})
