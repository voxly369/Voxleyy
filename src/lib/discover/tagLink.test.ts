import { describe, expect, it } from 'vitest'
import { normalizeTagRouteParam, tagPagePath } from './tagLink.ts'

describe('tagLink', () => {
  it('normalises hashtag paths', () => {
    expect(normalizeTagRouteParam('#Poetry')).toBe('poetry')
    expect(tagPagePath('Poetry')).toBe('/tags/poetry')
  })
})
