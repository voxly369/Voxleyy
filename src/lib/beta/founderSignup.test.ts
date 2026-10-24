import { describe, expect, it } from 'vitest'
import { FOUNDER_SIGNUP_EMAIL, isFounderSignupEmail } from './founderSignup.ts'

describe('founderSignup', () => {
  it('matches founder email case-insensitively', () => {
    expect(isFounderSignupEmail(FOUNDER_SIGNUP_EMAIL)).toBe(true)
    expect(isFounderSignupEmail('  Voxly369@Gmail.com ')).toBe(true)
    expect(isFounderSignupEmail('other@test.example')).toBe(false)
  })
})
