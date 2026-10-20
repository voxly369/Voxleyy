import { describe, expect, it } from 'vitest'
import { isSearchQueryReady, sanitizeSearchInput } from './searchInput.ts'

describe('searchInput', () => {
  it('trims, collapses whitespace and strips wildcard characters', () => {
    expect(sanitizeSearchInput('  hello   world  ')).toBe('hello world')
    expect(sanitizeSearchInput('100%_bad')).toBe('100 bad')
  })

  it('requires at least two characters', () => {
    expect(isSearchQueryReady('a')).toBe(false)
    expect(isSearchQueryReady('ab')).toBe(true)
  })
})
