import { describe, expect, it } from 'vitest'
import { maskEmailForDisplay } from './maskEmail.ts'

describe('maskEmailForDisplay', () => {
  it('masks the local part to the first letter', () => {
    expect(maskEmailForDisplay('reader@example.com')).toBe('r***@example.com')
  })
})
