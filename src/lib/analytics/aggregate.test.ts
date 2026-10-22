import { describe, expect, it } from 'vitest'
import { analyticsHasActivity, chartSeries, tableRows } from './aggregate.ts'
import type { CreatorAnalytics } from './types.ts'

const sample: CreatorAnalytics = {
  last7: { views: 3, likes: 1, saves: 0, comments: 0, followers: 1 },
  last30: { views: 10, likes: 4, saves: 2, comments: 1, followers: 2 },
  bestPiece: null,
  daily: [
    { date: '2026-03-01', views: 2, likes: 1 },
    { date: '2026-03-02', views: 1, likes: 0 },
  ],
}

describe('analytics aggregate helpers', () => {
  it('detects activity', () => {
    expect(analyticsHasActivity(sample)).toBe(true)
    expect(
      analyticsHasActivity({
        ...sample,
        last7: { views: 0, likes: 0, saves: 0, comments: 0, followers: 0 },
        last30: { views: 0, likes: 0, saves: 0, comments: 0, followers: 0 },
        daily: [],
      }),
    ).toBe(false)
  })

  it('builds chart and table rows', () => {
    expect(chartSeries(sample).length).toBe(2)
    expect(tableRows(sample).find((row) => row.metric === 'Views')).toEqual({
      metric: 'Views',
      seven: 3,
      thirty: 10,
    })
  })
})
