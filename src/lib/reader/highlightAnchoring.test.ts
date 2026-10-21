import { describe, expect, it } from 'vitest'
import { reanchorHighlight, reanchorHighlights } from './highlightAnchoring.ts'
import type { ReaderHighlight } from './highlightSchema.ts'

const body = {
  version: 1,
  format: 'rich',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Alpha beta gamma.' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Second paragraph text.' }] },
  ],
}

const baseHighlight: ReaderHighlight = {
  id: '11111111-1111-1111-1111-111111111111',
  creationId: '00000000-0000-0000-0000-000000000001',
  startParagraph: 0,
  startChar: 6,
  endParagraph: 0,
  endChar: 10,
  quote: 'beta',
  colour: 'yellow',
  note: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('reanchorHighlight', () => {
  it('keeps exact offsets when quote still matches', () => {
    const anchored = reanchorHighlight(baseHighlight, body, null)
    expect(anchored.unmatched).toBe(false)
    expect(anchored.startParagraph).toBe(0)
  })

  it('finds quote in another paragraph when text moved', () => {
    const movedBody = {
      ...body,
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Intro only.' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Alpha beta gamma.' }] },
      ],
    }
    const anchored = reanchorHighlight(baseHighlight, movedBody, null)
    expect(anchored.unmatched).toBe(false)
    expect(anchored.startParagraph).toBe(1)
  })

  it('marks unmatched when quote cannot be found', () => {
    const anchored = reanchorHighlight(
      { ...baseHighlight, quote: 'missing phrase entirely' },
      body,
      null,
    )
    expect(anchored.unmatched).toBe(true)
  })

  it('reanchors a list', () => {
    const list = reanchorHighlights([baseHighlight], body, null)
    expect(list).toHaveLength(1)
    expect(list[0]?.unmatched).toBe(false)
  })
})
