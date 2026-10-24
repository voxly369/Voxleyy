import { describe, expect, it } from 'vitest'
import { quoteDayEpochIndex } from './quoteOfDay.ts'

describe('quoteDayEpochIndex', () => {
  it('returns stable index for same day and timezone', () => {
    const a = quoteDayEpochIndex('2026-03-01', 'UTC', 120)
    const b = quoteDayEpochIndex('2026-03-01', 'UTC', 120)
    expect(a).toBe(b)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(120)
  })

  it('changes index when active count changes', () => {
    const day = '2026-03-01'
    const small = quoteDayEpochIndex(day, 'UTC', 10)
    const large = quoteDayEpochIndex(day, 'UTC', 120)
    expect(small).toBeLessThan(10)
    expect(large).toBeLessThan(120)
  })

  it('handles zero active count', () => {
    expect(quoteDayEpochIndex('2026-03-01', 'UTC', 0)).toBe(0)
  })
})
