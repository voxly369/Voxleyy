import { describe, expect, it } from 'vitest'
import { hourInTimeZone, timeAwareGreeting } from './greeting.ts'

describe('timeAwareGreeting', () => {
  it('uses morning copy before noon in Africa/Johannesburg', () => {
    const at = new Date('2026-06-15T07:30:00.000Z')
    expect(timeAwareGreeting('Africa/Johannesburg', 'Jaydin', at)).toBe('Good morning, Jaydin')
  })

  it('uses afternoon copy midday UTC in UTC', () => {
    const at = new Date('2026-01-15T14:00:00.000Z')
    expect(timeAwareGreeting('UTC', 'Sam', at)).toBe('Good afternoon, Sam')
  })

  it('uses evening copy late night', () => {
    const at = new Date('2026-01-15T22:00:00.000Z')
    expect(timeAwareGreeting('UTC', 'Sam', at)).toBe('Good evening, Sam')
  })

  it('handles midnight boundary via hourInTimeZone', () => {
    const at = new Date('2026-01-01T00:30:00.000Z')
    expect(hourInTimeZone('UTC', at)).toBe(0)
    expect(timeAwareGreeting('UTC', 'A', at)).toBe('Good evening, A')
  })
})
