import { describe, expect, it } from 'vitest'
import { notificationSettingsPatchSchema, parseNotificationSettingsPatch } from './settingsSchema.ts'

describe('notificationSettingsPatchSchema', () => {
  it('accepts partial toggles', () => {
    expect(notificationSettingsPatchSchema.safeParse({ notify_likes: false }).success).toBe(true)
  })

  it('rejects unknown keys', () => {
    expect(notificationSettingsPatchSchema.safeParse({ extra: true }).success).toBe(false)
  })

  it('validates quiet reach', () => {
    expect(parseNotificationSettingsPatch({ quiet_reach: 'nobody' })?.quiet_reach).toBe('nobody')
    expect(parseNotificationSettingsPatch({ quiet_reach: 'invalid' })).toBeNull()
  })
})
