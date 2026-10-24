import { describe, expect, it } from 'vitest'
import { guessCountryFromTimeZone } from './countryPrefill.ts'

describe('guessCountryFromTimeZone', () => {
  it('maps a single-zone country', () => {
    expect(guessCountryFromTimeZone('Africa/Johannesburg')).toBe('ZA')
  })

  it('returns null when unknown', () => {
    expect(guessCountryFromTimeZone('Etc/Unknown-Zone')).toBeNull()
  })
})
