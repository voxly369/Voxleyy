import { describe, expect, it } from 'vitest'
import { countryFlag, countryName, countryPrimaryTimezone } from './countries.ts'

describe('country helpers', () => {
  it('derives flag emoji from ISO code', () => {
    expect(countryFlag('ZA')).toBe('🇿🇦')
    expect(countryFlag('us')).toBe('🇺🇸')
  })

  it('resolves English country names from generated list', () => {
    expect(countryName('ZA')).toBe('South Africa')
  })

  it('exposes primary timezone when seeded', () => {
    expect(countryPrimaryTimezone('ZA')).toBe('Africa/Johannesburg')
    expect(countryPrimaryTimezone('AQ')).toBeNull()
  })
})
