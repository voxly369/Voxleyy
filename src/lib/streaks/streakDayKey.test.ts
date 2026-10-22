import { describe, expect, it } from 'vitest'
import { addCalendarDays, dayKeyDiff, streakDayKey } from './streakDayKey.ts'
import { liveCurrentStreak } from './liveCurrentStreak.ts'

describe('streakDayKey', () => {
  it('uses the profile time zone for the calendar day', () => {
    const instant = new Date('2026-03-01T03:30:00Z')
    expect(streakDayKey(instant, 'America/New_York')).toBe('2026-02-28')
    expect(streakDayKey(instant, 'UTC')).toBe('2026-03-01')
  })

  it('diffs calendar days', () => {
    expect(dayKeyDiff('2026-03-03', '2026-03-01')).toBe(2)
    expect(addCalendarDays('2026-03-01', 1)).toBe('2026-03-02')
  })
})

describe('liveCurrentStreak', () => {
  it('keeps streak alive when last active was yesterday', () => {
    expect(
      liveCurrentStreak(
        { current: 5, longest: 5, lastActiveDay: '2026-03-01' },
        'UTC',
        new Date('2026-03-02T12:00:00Z'),
      ),
    ).toBe(5)
  })

  it('resets when gap is more than one day', () => {
    expect(
      liveCurrentStreak(
        { current: 5, longest: 5, lastActiveDay: '2026-03-01' },
        'UTC',
        new Date('2026-03-03T12:00:00Z'),
      ),
    ).toBe(0)
  })
})
