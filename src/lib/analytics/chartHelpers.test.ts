import { describe, expect, it } from 'vitest'
import { chartScaleMax, chartSummary, seriesFromDailyJson } from './chartHelpers.ts'

describe('chartHelpers', () => {
  it('seriesFromDailyJson maps day/value', () => {
    expect(seriesFromDailyJson([{ day: '2026-01-01', value: 2 }])).toEqual([{ day: '2026-01-01', value: 2 }])
  })

  it('chartScaleMax is at least 1', () => {
    expect(chartScaleMax([0, 0])).toBe(1)
  })

  it('chartSummary describes total and peak', () => {
    const summary = chartSummary('Signups', [
      { day: '2026-01-01', value: 1 },
      { day: '2026-01-02', value: 3 },
    ])
    expect(summary).toContain('4 total')
    expect(summary).toContain('peak 3')
  })
})
