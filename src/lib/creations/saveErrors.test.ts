import { describe, expect, it } from 'vitest'
import { isTransientSaveError } from './saveErrors.ts'

describe('save error classification', () => {
  it('treats network and 5xx errors as transient', () => {
    expect(isTransientSaveError({ message: 'Failed to fetch' })).toBe(true)
    expect(isTransientSaveError({ status: 503, message: 'upstream' })).toBe(true)
  })

  it('treats validation, policy, and tag limits as permanent', () => {
    expect(isTransientSaveError({ code: '42501', message: 'policy' })).toBe(false)
    expect(isTransientSaveError({ message: 'A creation can have at most 15 tags.' })).toBe(false)
    expect(isTransientSaveError({ message: 'You are creating too fast.' })).toBe(false)
    expect(isTransientSaveError({ code: '23514', message: 'check' })).toBe(false)
    expect(isTransientSaveError({ status: 403, message: 'forbidden' })).toBe(false)
  })
})
