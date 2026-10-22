import { describe, expect, it } from 'vitest'
import { isPenPalContact, shouldHoldForQuietMode } from './quietReach.ts'

const baseSettings = {
  quietManual: true,
  quietEnabled: false,
  quietScheduleStart: null,
  quietScheduleEnd: null,
  timezone: 'UTC',
  quietReach: 'everyone' as const,
}

describe('shouldHoldForQuietMode', () => {
  it('everyone reach never holds while quiet is on', () => {
    expect(
      shouldHoldForQuietMode(
        { ...baseSettings, quietReach: 'everyone' },
        'actor-1',
        'like',
      ),
    ).toBe(false)
  })

  it('nobody reach holds engagement types', () => {
    expect(
      shouldHoldForQuietMode(
        { ...baseSettings, quietReach: 'nobody' },
        'actor-1',
        'comment',
      ),
    ).toBe(true)
  })

  it('close contacts holds non-mutual actors', () => {
    expect(
      shouldHoldForQuietMode(
        { ...baseSettings, quietReach: 'close_contacts' },
        'actor-1',
        'follow',
        { mutualFollow: false },
      ),
    ).toBe(true)
    expect(
      shouldHoldForQuietMode(
        { ...baseSettings, quietReach: 'close_contacts' },
        'actor-1',
        'follow',
        { mutualFollow: true },
      ),
    ).toBe(false)
  })

  it('pen pals behaves like nobody until feature ships', () => {
    expect(isPenPalContact('a', 'b')).toBe(false)
    expect(
      shouldHoldForQuietMode(
        { ...baseSettings, quietReach: 'pen_pals' },
        'actor-1',
        'mention',
      ),
    ).toBe(true)
  })

  it('moderation types are never held', () => {
    expect(
      shouldHoldForQuietMode(
        { ...baseSettings, quietReach: 'nobody' },
        'actor-1',
        'warning',
      ),
    ).toBe(false)
  })
})
