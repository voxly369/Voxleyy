import { describe, expect, it } from 'vitest'
import { parseAnalyticsDateRange, rangeFromPreset, validateCustomRange } from './dateRange.ts'

describe('dateRange', () => {
  it('rangeFromPreset 7 days inclusive', () => {
    const r = rangeFromPreset('7', '2026-01-10')
    expect(r.from).toBe('2026-01-04')
    expect(r.to).toBe('2026-01-10')
  })

  it('validateCustomRange rejects spans over 400 days', () => {
    expect(validateCustomRange('2024-01-01', '2026-01-01')).toMatch(/400/)
  })

  it('parseAnalyticsDateRange accepts valid custom range', () => {
    expect(parseAnalyticsDateRange('2026-01-01', '2026-01-31')?.preset).toBe('custom')
  })
})
