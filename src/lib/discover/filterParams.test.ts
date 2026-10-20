import { describe, expect, it } from 'vitest'
import { discoverFiltersToSearchParams, parseDiscoverFilters } from './filterParams.ts'

describe('filterParams', () => {
  it('round-trips mood and sort in the URL', () => {
    const params = discoverFiltersToSearchParams({ mood: 'hope', sort: 'trending' })
    expect(parseDiscoverFilters(params)).toEqual({ mood: 'hope', sort: 'trending' })
  })

  it('ignores invalid values', () => {
    expect(parseDiscoverFilters(new URLSearchParams('mood=invalid&sort=hot'))).toEqual({})
  })
})
