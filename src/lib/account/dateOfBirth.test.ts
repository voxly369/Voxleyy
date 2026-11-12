import { describe, expect, it } from 'vitest'
import {
  ageInYearsFromDateOfBirth,
  meetsMinimumSignupAge,
  parseIsoDateOnly,
  viewerIsAdultByDateOfBirth,
} from './dateOfBirth.ts'

const ref = new Date(Date.UTC(2026, 10, 12))

describe('dateOfBirth', () => {
  it('parses ISO date-only strings', () => {
    expect(parseIsoDateOnly('1990-05-20')).not.toBeNull()
    expect(parseIsoDateOnly('1990-13-01')).toBeNull()
    expect(parseIsoDateOnly('bad')).toBeNull()
  })

  it('requires at least 13 to sign up', () => {
    const teen = new Date(Date.UTC(ref.getUTCFullYear() - 14, ref.getUTCMonth(), ref.getUTCDate()))
      .toISOString()
      .slice(0, 10)
    const child = new Date(Date.UTC(ref.getUTCFullYear() - 10, ref.getUTCMonth(), ref.getUTCDate()))
      .toISOString()
      .slice(0, 10)
    expect(meetsMinimumSignupAge(teen, ref)).toBe(true)
    expect(meetsMinimumSignupAge(child, ref)).toBe(false)
  })

  it('treats 18+ as adult for mature content', () => {
    const adult = new Date(Date.UTC(ref.getUTCFullYear() - 20, ref.getUTCMonth(), ref.getUTCDate()))
      .toISOString()
      .slice(0, 10)
    const minor = new Date(Date.UTC(ref.getUTCFullYear() - 16, ref.getUTCMonth(), ref.getUTCDate()))
      .toISOString()
      .slice(0, 10)
    expect(viewerIsAdultByDateOfBirth(adult, ref)).toBe(true)
    expect(viewerIsAdultByDateOfBirth(minor, ref)).toBe(false)
    expect(viewerIsAdultByDateOfBirth(null, ref)).toBe(false)
    expect(ageInYearsFromDateOfBirth(adult, ref)).toBe(20)
  })
})
