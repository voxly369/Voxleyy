import { describe, expect, it } from 'vitest'
import { isQuietModeActive, timeToMinutes } from './quietMode.ts'
import type { NotificationSettings } from './types.ts'

function settings(partial: Partial<NotificationSettings>): NotificationSettings {
  return {
    userId: 'u',
    notifyLikes: true,
    notifyComments: true,
    notifyFollows: true,
    notifyMentions: true,
    notifyMessages: true,
    notifySales: true,
    notifyChapters: true,
    notifyAnnouncements: true,
    quietEnabled: false,
    quietManual: false,
    quietScheduleStart: null,
    quietScheduleEnd: null,
    quietReach: 'everyone',
    timezone: 'UTC',
    showLocalTime: false,
    digestEnabled: false,
    digestTime: null,
    updatedAt: '2026-01-01T00:00:00Z',
    ...partial,
  }
}

describe('quietMode', () => {
  it('parses postgres times', () => {
    expect(timeToMinutes('22:30:00')).toBe(22 * 60 + 30)
    expect(timeToMinutes('bad')).toBeNull()
  })

  it('honours manual quiet', () => {
    expect(isQuietModeActive(settings({ quietManual: true }))).toBe(true)
  })

  it('handles same-day schedule window', () => {
    const at = new Date('2026-06-01T15:00:00Z')
    expect(
      isQuietModeActive(
        settings({
          quietEnabled: true,
          quietScheduleStart: '14:00:00',
          quietScheduleEnd: '18:00:00',
          timezone: 'UTC',
        }),
        at,
      ),
    ).toBe(true)
  })

  it('handles overnight schedule window', () => {
    const late = new Date('2026-06-01T23:30:00Z')
    expect(
      isQuietModeActive(
        settings({
          quietEnabled: true,
          quietScheduleStart: '22:00:00',
          quietScheduleEnd: '07:00:00',
          timezone: 'UTC',
        }),
        late,
      ),
    ).toBe(true)
  })
})
