import { describe, expect, it } from 'vitest'
import { parseLanguagesFilter, serializeLanguagesFilter } from './parseLanguagesFilter.ts'

describe('parseLanguagesFilter', () => {
  it('parses comma-separated known codes', () => {
    expect(parseLanguagesFilter('en,af,EN')).toEqual(['af', 'en'])
  })

  it('drops unknown and invalid tokens', () => {
    expect(parseLanguagesFilter('en,zz,12,english')).toEqual(['en'])
  })

  it('serializes sorted unique codes', () => {
    expect(serializeLanguagesFilter(['af', 'en', 'en'])).toBe('af,en')
  })
})
