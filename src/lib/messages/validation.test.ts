import { describe, expect, it } from 'vitest'
import { remainingCharacters, validateMessageBody } from './validation.ts'
import { MESSAGE_BODY_MAX } from './types.ts'

describe('message validation', () => {
  it('counts remaining characters', () => {
    expect(remainingCharacters('abc')).toBe(MESSAGE_BODY_MAX - 3)
  })

  it('validates trimmed body', () => {
    const result = validateMessageBody('  hello ')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.body).toBe('hello')
  })
})
