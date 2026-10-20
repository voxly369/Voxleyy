import { describe, expect, it } from 'vitest'
import { applyDiscoverFiltersToQuery, discoverOrderColumn, discoverTableForKind } from './discoverQuery.ts'

describe('discoverQuery', () => {
  it('selects trending table and score order', () => {
    expect(discoverTableForKind('trending', {})).toBe('discover_trending_creations')
    expect(discoverOrderColumn('discover_trending_creations').column).toBe('engagement_score')
  })

  it('maps genre slug to creation type filter', () => {
    expect(applyDiscoverFiltersToQuery({ genre: 'poetry' }, 'filtered').type).toBe('poem')
  })
})
