import { describe, expect, it } from 'vitest'
import { clamp, layerBoundsCenter, resizeWithAspect, rotatePoint } from './transform.ts'

describe('transform', () => {
  it('clamp bounds values', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
  })

  it('resizeWithAspect preserves aspect when locked', () => {
    const next = resizeWithAspect(100, 200, 50, true, 0.5)
    expect(next.width).toBe(50)
    expect(next.height).toBe(100)
  })

  it('rotatePoint rotates around center', () => {
    const p = rotatePoint(110, 100, 100, 100, 90)
    expect(Math.round(p.x)).toBe(100)
    expect(Math.round(p.y)).toBe(110)
  })

  it('layerBoundsCenter', () => {
    expect(layerBoundsCenter(0, 0, 100, 200)).toEqual({ cx: 50, cy: 100 })
  })
})
