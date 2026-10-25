import { describe, expect, it } from 'vitest'
import { nudgePosition, snapRectCenter, snapValue, SNAP_THRESHOLD } from './snap.ts'

describe('snap', () => {
  it('snapValue snaps within threshold', () => {
    const result = snapValue(802, [800], SNAP_THRESHOLD)
    expect(result.value).toBe(800)
  })

  it('snapRectCenter snaps to canvas middle', () => {
    const { x, y, guides } = snapRectCenter(805, 1205, 1600, 2400, [])
    expect(x).toBe(800)
    expect(y).toBe(1200)
    expect(guides.length).toBeGreaterThan(0)
  })

  it('nudgePosition moves by step', () => {
    expect(nudgePosition(10, 20, 'ArrowLeft', false)).toEqual({ x: 9, y: 20 })
    expect(nudgePosition(10, 20, 'ArrowDown', true)).toEqual({ x: 10, y: 30 })
  })
})
