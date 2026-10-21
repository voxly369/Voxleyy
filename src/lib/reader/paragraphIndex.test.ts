import { describe, expect, it } from 'vitest'
import { paragraphIndexFromScroll, percentFromParagraphIndex } from './paragraphIndex.ts'

describe('paragraphIndex', () => {
  it('maps scroll position to paragraph index', () => {
    expect(paragraphIndexFromScroll([0, 100, 200], 0, 400)).toBe(1)
    expect(paragraphIndexFromScroll([0, 100, 200], 150, 400)).toBe(2)
  })

  it('derives percent from paragraph index', () => {
    expect(percentFromParagraphIndex(0, 4)).toBe(25)
    expect(percentFromParagraphIndex(3, 4)).toBe(100)
  })
})
