import { describe, expect, it } from 'vitest'
import { passwordChecklist } from './passwords.ts'

describe('password checklist', () => {
  it('starts unticked and ticks each rule as the password qualifies', () => {
    expect(passwordChecklist('').map((item) => item.met)).toEqual([false, false, false, false, false])

    const mixed = passwordChecklist('Correct horse battery 1')
    expect(mixed.every((item) => item.met)).toBe(true)
    expect(mixed.map((item) => item.label)).toEqual([
      'At least 10 characters',
      'One lowercase letter',
      'One uppercase letter',
      'One digit',
      'Not a common password',
    ])
  })

  it('rejects a common password even when the other rules pass', () => {
    const checks = Object.fromEntries(passwordChecklist('Password123').map((item) => [item.id, item.met]))
    expect(checks.length).toBe(true)
    expect(checks.lower).toBe(true)
    expect(checks.upper).toBe(true)
    expect(checks.digit).toBe(true)
    expect(checks.common).toBe(false)
  })
})
