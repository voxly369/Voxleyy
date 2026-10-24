import { describe, expect, it } from 'vitest'
import { inviteCodeFormatError, isValidInviteCodeFormat, normalizeInviteCode } from './inviteCode.ts'

describe('inviteCode', () => {
  it('normalizes to uppercase trimmed', () => {
    expect(normalizeInviteCode('  abcd234567  ')).toBe('ABCD234567')
  })

  it('accepts valid 10-char codes', () => {
    expect(isValidInviteCodeFormat('ABCDEFGHJK')).toBe(true)
    expect(isValidInviteCodeFormat('23456789AB')).toBe(true)
  })

  it('rejects ambiguous or short codes', () => {
    expect(isValidInviteCodeFormat('')).toBe(false)
    expect(isValidInviteCodeFormat('IO01IL01IO')).toBe(false)
    expect(isValidInviteCodeFormat('SHORT')).toBe(false)
    expect(inviteCodeFormatError('IO01IL01IO')).toBe('That invite code is not valid.')
  })
})
