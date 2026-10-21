import { describe, expect, it } from 'vitest'
import { clampPageIndex, pageCount, pagesRemaining } from './pagingMath.ts'

describe('pagingMath', () => {
  it('computes page counts', () => {
    expect(pageCount(2000, 500)).toBe(4)
    expect(pagesRemaining(2, 4)).toBe(2)
    expect(clampPageIndex(9, 4)).toBe(3)
  })
})
