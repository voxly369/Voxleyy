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
    expect(summary).toContain('on 2026-01-02')
  })

  it('chartSummary peak day is the highest value day in range, not first row', () => {
    const summary = chartSummary('Views', [
      { day: '2026-03-01', value: 5 },
      { day: '2026-03-03', value: 12 },
      { day: '2026-03-02', value: 4 },
    ])
    expect(summary).toContain('peak 12 on 2026-03-03')
  })

  it('chartSummary uses latest day when peak value is tied', () => {
    const summary = chartSummary('Views', [
      { day: '2026-04-01', value: 2 },
      { day: '2026-04-10', value: 2 },
    ])
    expect(summary).toContain('peak 2 on 2026-04-10')
  })
})
