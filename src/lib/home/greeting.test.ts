import { describe, expect, it } from 'vitest'
import {
  daysBetweenLocalDates,
  entranceGreeting,
  greetingName,
  hourInTimeZone,
  localDateKey,
  timeAwareGreeting,
  truncateDisplayName,
} from './greeting.ts'

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

describe('entranceGreeting', () => {
  it('uses welcome back after long absence', () => {
    expect(
      entranceGreeting('UTC', 'Sam', 'sam', { longAbsence: true, at: new Date('2026-01-15T14:00:00.000Z') }),
    ).toBe('Welcome back, Sam')
  })

  it('never uses good night copy', () => {
    const at = new Date('2026-01-15T23:00:00.000Z')
    const text = entranceGreeting('UTC', 'A', 'a', { at })
    expect(text.toLowerCase()).not.toContain('good night')
    expect(text).toBe('Good evening, A')
  })
})

describe('greetingName and truncation', () => {
  it('truncates long display names', () => {
    const long = 'A'.repeat(40)
    expect(truncateDisplayName(long).endsWith('…')).toBe(true)
  })

  it('falls back to username', () => {
    expect(greetingName('', 'readerone')).toBe('readerone')
  })
})

describe('localDateKey', () => {
  it('formats calendar day in timezone', () => {
    expect(localDateKey('UTC', new Date('2026-06-01T23:30:00.000Z'))).toBe('2026-06-01')
  })

  it('counts days between local date keys', () => {
    expect(daysBetweenLocalDates('2026-06-01', '2026-06-08')).toBe(7)
  })
})
