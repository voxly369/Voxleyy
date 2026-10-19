import { describe, expect, it } from 'vitest'
import { shouldLimitProfileWorksToPublic } from './publishedWorksFilter.ts'

describe('shouldLimitProfileWorksToPublic', () => {
  it('always limits to public posts for any viewer', () => {
    expect(shouldLimitProfileWorksToPublic('author-1', 'viewer-2')).toBe(true)
    expect(shouldLimitProfileWorksToPublic('author-1', 'author-1')).toBe(true)
    expect(shouldLimitProfileWorksToPublic('author-1', null)).toBe(true)
  })
})
