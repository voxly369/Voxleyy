import { describe, expect, it } from 'vitest'
import { needsDisplayName } from './needsDisplayName.ts'

describe('needsDisplayName', () => {
  it('is true when display name is empty or matches username', () => {
    expect(needsDisplayName({ username: 'abc12x', displayName: '' })).toBe(true)
    expect(needsDisplayName({ username: 'abc12x', displayName: 'abc12x' })).toBe(true)
    expect(needsDisplayName({ username: 'abc12x', displayName: 'Ada Lovelace' })).toBe(false)
  })
})
