import { describe, expect, it } from 'vitest'
import { shouldLimitProfileWorksToPublic } from './publishedWorksFilter.ts'

describe('profile published works audience filter', () => {
  it('limits other people profiles to public only', () => {
    expect(shouldLimitProfileWorksToPublic('author-1', 'viewer-2')).toBe(true)
    expect(shouldLimitProfileWorksToPublic('author-1', null)).toBe(true)
  })

  it('does not limit the signed-in owner profile', () => {
    expect(shouldLimitProfileWorksToPublic('author-1', 'author-1')).toBe(false)
  })
})
