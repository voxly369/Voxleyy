import { describe, expect, it } from 'vitest'
import {
  clampPositionOffset,
  pageIndexForParagraph,
  readingPositionFromParagraph,
} from './readingPosition.ts'
import { columnPageCount } from './pagingMath.ts'

describe('readingPosition', () => {
  it('maps paragraph index and offset to stored percent', () => {
    expect(readingPositionFromParagraph(1, 0.5, 4)).toEqual({
      paragraphIndex: 1,
      positionOffset: 0.5,
      percent: 50,
    })
    expect(clampPositionOffset(2)).toBe(1)
    expect(clampPositionOffset(-1)).toBe(0)
  })

  it('maps paragraph horizontal focus to page index', () => {
    const paragraph = {
      offsetLeft: 750,
      offsetWidth: 300,
    } as HTMLElement
    expect(pageIndexForParagraph(paragraph, 375, 0)).toBe(2)
    expect(columnPageCount(1500, 375)).toBe(4)
  })
})
