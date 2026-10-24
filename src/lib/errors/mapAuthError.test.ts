import { describe, expect, it } from 'vitest'
import { mapAuthError } from './mapAuthError.ts'
import { LOGIN_FAILED, RATE_LIMITED } from '../auth/messages.ts'

describe('mapAuthError', () => {
  it('maps known Supabase codes', () => {
    expect(mapAuthError({ code: 'invalid_credentials' }, 'fallback')).toBe(LOGIN_FAILED)
    expect(mapAuthError({ code: 'over_request_rate_limit' }, 'fallback')).toBe(RATE_LIMITED)
    expect(mapAuthError({ code: 'email_not_confirmed' }, 'fallback')).toContain('confirm your email')
  })

  it('uses status 429 when code is unknown', () => {
    expect(mapAuthError({ status: 429 }, 'fallback')).toBe(RATE_LIMITED)
  })

  it('falls back when unmapped', () => {
    expect(mapAuthError({ code: 'unknown_code' }, 'Custom fallback')).toBe('Custom fallback')
  })
})
