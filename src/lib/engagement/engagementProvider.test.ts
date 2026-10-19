import { describe, expect, it } from 'vitest'
import { engagementErrorMessage } from './errors.ts'
import { isTransientSaveError } from '../creations/saveErrors.ts'

describe('engagement failure classification', () => {
  it('maps PGRST301 to sign-in copy without treating it as transient', () => {
    const error = { code: 'PGRST301', message: 'JWT expired', status: 401 }
    expect(engagementErrorMessage(error)).toContain('Sign in')
    expect(isTransientSaveError(error)).toBe(false)
  })

  it('treats 503 as transient for retry logic', () => {
    expect(isTransientSaveError({ status: 503, message: 'upstream' })).toBe(true)
  })

  it('maps 23514 to a plain message without leaking check text', () => {
    expect(engagementErrorMessage({ code: '23514', message: 'check constraint "comments_body_check"' }, 'fallback')).toBe(
      'fallback',
    )
  })
})
