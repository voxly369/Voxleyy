import { describe, expect, it } from 'vitest'
import { filterValidationError, normalizeCountryFilter } from './filters.ts'

describe('filters', () => {
  it('normalizeCountryFilter uppercases valid code', () => {
    expect(normalizeCountryFilter('za')).toBe('ZA')
  })

  it('filterValidationError rejects bad country', () => {
    expect(filterValidationError('ZZZ', '')).toMatch(/two-letter/)
  })
})
