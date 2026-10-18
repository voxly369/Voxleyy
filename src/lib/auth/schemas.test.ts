import { describe, expect, it } from 'vitest'
import { COMMON_PASSWORDS } from './passwords.ts'
import { emailSchema, passwordSchema, signUpSchema, usernameSchema } from './schemas.ts'

const validSignUp = {
  email: 'reader@example.com',
  username: 'reader_name',
  password: 'Correct horse battery 1',
  confirmPassword: 'Correct horse battery 1',
  acceptedTerms: true,
}

describe('auth schemas', () => {
  it('accepts a normal email and rejects a malformed one', () => {
    expect(emailSchema.safeParse('reader@example.com').success).toBe(true)
    expect(emailSchema.safeParse('not-an-email').success).toBe(false)
  })

  it('requires length, both cases, a digit, and rejects a common password', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false)
    expect(passwordSchema.safeParse('abcdefghij').success).toBe(false)
    expect(passwordSchema.safeParse('Abcdefghij').success).toBe(false)
    expect(passwordSchema.safeParse('abcdefghi1').success).toBe(false)
    expect(passwordSchema.safeParse('ABCDEFGHI1').success).toBe(false)
    expect(passwordSchema.safeParse('Password123').success).toBe(false)
    expect(passwordSchema.safeParse('Correct horse battery 1').success).toBe(true)
  })

  it('keeps a list of 20 common passwords', () => {
    expect(COMMON_PASSWORDS).toHaveLength(20)
  })

  it('matches the profile username check and does not require a leading letter', () => {
    expect(usernameSchema.safeParse('1abc').success).toBe(true)
    expect(usernameSchema.safeParse('_ab').success).toBe(true)
    expect(usernameSchema.safeParse('a'.repeat(30)).success).toBe(true)
    expect(usernameSchema.safeParse('ab').success).toBe(false)
    expect(usernameSchema.safeParse('a'.repeat(31)).success).toBe(false)
    expect(usernameSchema.safeParse('Admin').success).toBe(false)
    expect(usernameSchema.safeParse('bad-name').success).toBe(false)
    expect(usernameSchema.safeParse('has space').success).toBe(false)
  })

  it('rejects a reserved username', () => {
    expect(usernameSchema.safeParse('admin').success).toBe(false)
    expect(usernameSchema.safeParse('founder').success).toBe(false)
    expect(usernameSchema.safeParse('penpals').success).toBe(false)
  })

  it('requires matching passwords and accepted terms', () => {
    expect(signUpSchema.safeParse(validSignUp).success).toBe(true)
    expect(signUpSchema.safeParse({ ...validSignUp, confirmPassword: 'another long password' }).success).toBe(false)
    expect(signUpSchema.safeParse({ ...validSignUp, acceptedTerms: false }).success).toBe(false)
  })
})
