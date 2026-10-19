import { describe, expect, it } from 'vitest'
import { isTransientSaveError, saveErrorMessage, SIGN_IN_AGAIN_SAVE_MESSAGE } from './saveErrors.ts'

describe('save failure uses provider code and status first', () => {
  it('PGRST301 shows sign-in message and does not auto-retry as transient', () => {
    const error = { code: 'PGRST301', message: 'JWT expired', status: 401 }
    expect(saveErrorMessage(error, 'fallback')).toBe(SIGN_IN_AGAIN_SAVE_MESSAGE)
    expect(isTransientSaveError(error)).toBe(false)
  })

  it('503 is transient for retry classification', () => {
    const error = { code: '', message: 'upstream', status: 503 }
    expect(isTransientSaveError(error)).toBe(true)
  })

  it('23514 is permanent with plain fallback message', () => {
    const error = { code: '23514', message: 'check constraint', status: 400 }
    expect(isTransientSaveError(error)).toBe(false)
    expect(saveErrorMessage(error, 'We could not save this work. Try again.')).toBe('We could not save this work. Try again.')
  })
})
