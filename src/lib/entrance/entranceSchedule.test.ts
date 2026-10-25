/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  ENTRANCE_FRESH_OPEN_ABSENCE_MS,
  LAST_ENTRANCE_DISMISSED_AT_KEY,
  isFreshOpenAfterAbsence,
  readLastEntranceDismissedAtMs,
  shouldShowEntrance,
  writeLastEntranceDismissedAtMs,
} from './entranceSchedule.ts'

const MINUTE_MS = 60 * 1000

describe('entrance fresh-open rule', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns false when Show the entrance screen is off', () => {
    expect(
      shouldShowEntrance({
        showEntranceScreen: false,
        lastDismissedAtMs: null,
        now: new Date('2026-06-01T10:00:00.000Z'),
      }),
    ).toBe(false)
  })

  it('returns true on first fresh open when the entrance setting is on', () => {
    expect(
      shouldShowEntrance({
        showEntranceScreen: true,
        lastDismissedAtMs: null,
        now: new Date('2026-06-01T10:00:00.000Z'),
      }),
    ).toBe(true)
  })

  it('30-minute boundary: 29 minutes away stays inside, 30 and 31 minutes show again', () => {
    const dismissedAt = new Date('2026-06-01T10:00:00.000Z').getTime()
    expect(
      isFreshOpenAfterAbsence(dismissedAt, new Date(dismissedAt + 29 * MINUTE_MS)),
    ).toBe(false)
    expect(
      isFreshOpenAfterAbsence(dismissedAt, new Date(dismissedAt + 30 * MINUTE_MS)),
    ).toBe(true)
    expect(
      isFreshOpenAfterAbsence(dismissedAt, new Date(dismissedAt + 31 * MINUTE_MS)),
    ).toBe(true)
    expect(ENTRANCE_FRESH_OPEN_ABSENCE_MS).toBe(30 * MINUTE_MS)
  })

  it('persists last dismiss timestamp on device', () => {
    writeLastEntranceDismissedAtMs(1_700_000_000_000)
    expect(readLastEntranceDismissedAtMs()).toBe(1_700_000_000_000)
    expect(localStorage.getItem(LAST_ENTRANCE_DISMISSED_AT_KEY)).toBe('1700000000000')
  })
})
