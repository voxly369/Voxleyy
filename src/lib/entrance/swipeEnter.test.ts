import { describe, expect, it } from 'vitest'
import {
  clampSwipeOffset,
  isHorizontalSwipeLocked,
  shouldCompleteSwipe,
  springBackOffset,
  swipeProgressFromOffset,
} from './swipeEnter.ts'

describe('swipeEnter', () => {
  it('computes progress from offset and width', () => {
    expect(swipeProgressFromOffset(175, 500)).toBeCloseTo(0.35)
    expect(swipeProgressFromOffset(500, 500)).toBe(1)
  })

  it('completes at 35% width or fast flick', () => {
    expect(shouldCompleteSwipe(180, 500, 0)).toBe(true)
    expect(shouldCompleteSwipe(50, 500, 0)).toBe(false)
    expect(shouldCompleteSwipe(80, 500, 0.6)).toBe(true)
  })

  it('springs back when below threshold', () => {
    expect(springBackOffset(100, 500)).toBe(0)
    expect(springBackOffset(200, 500)).toBe(500)
  })

  it('locks direction so vertical scroll does not count', () => {
    expect(isHorizontalSwipeLocked(30, 40)).toBe(false)
    expect(isHorizontalSwipeLocked(40, 10)).toBe(true)
  })

  it('rubber-bands past edges', () => {
    expect(clampSwipeOffset(-100, 400)).toBe(-15)
    expect(clampSwipeOffset(500, 400)).toBeGreaterThan(400)
  })
})
