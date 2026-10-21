import { describe, expect, it } from 'vitest'
import {
  paragraphIndexFromScroll,
  percentFromParagraphIndex,
  readerParagraphIndexFromBlockIndex,
} from './paragraphIndex.ts'

const body = {
  version: 1,
  format: 'rich',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Intro' }] },
    { type: 'heading', level: 2, content: [{ type: 'text', text: 'Chapter' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Body' }] },
  ],
}

describe('paragraphIndex', () => {
  it('maps block index to reader paragraph index and back via percent', () => {
    expect(readerParagraphIndexFromBlockIndex(1, body, null)).toBe(1)
    expect(readerParagraphIndexFromBlockIndex(2, body, null)).toBe(2)
    const percent = percentFromParagraphIndex(2, 3)
    expect(percent).toBe(100)
  })

  it('maps scroll position to paragraph index', () => {
    expect(paragraphIndexFromScroll([0, 100, 200], 0, 400)).toBe(1)
    expect(paragraphIndexFromScroll([0, 100, 200], 150, 400)).toBe(2)
  })

  it('derives percent from paragraph index', () => {
    expect(percentFromParagraphIndex(0, 4)).toBe(25)
    expect(percentFromParagraphIndex(3, 4)).toBe(100)
  })
})
