/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { shouldShowEntrance, writeDeviceLastVisitDay, readDeviceLastVisitDay } from './entranceSchedule.ts'

describe('shouldShowEntrance', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns false when showEntranceScreen is false', () => {
    expect(
      shouldShowEntrance({
        timeZone: 'UTC',
        showEntranceScreen: false,
        serverLastEntranceDate: null,
        now: new Date('2026-06-01T10:00:00.000Z'),
      }),
    ).toBe(false)
  })

  it('returns false when server already recorded today', () => {
    expect(
      shouldShowEntrance({
        timeZone: 'UTC',
        showEntranceScreen: true,
        serverLastEntranceDate: '2026-06-01',
        now: new Date('2026-06-01T15:00:00.000Z'),
      }),
    ).toBe(false)
  })

  it('returns false when device visited today', () => {
    writeDeviceLastVisitDay('2026-06-01')
    expect(
      shouldShowEntrance({
        timeZone: 'UTC',
        showEntranceScreen: true,
        serverLastEntranceDate: null,
        now: new Date('2026-06-01T08:00:00.000Z'),
      }),
    ).toBe(false)
    expect(readDeviceLastVisitDay()).toBe('2026-06-01')
  })

  it('returns true on a new local day', () => {
    expect(
      shouldShowEntrance({
        timeZone: 'Africa/Johannesburg',
        showEntranceScreen: true,
        serverLastEntranceDate: '2026-05-30',
        now: new Date('2026-05-31T06:00:00.000Z'),
      }),
    ).toBe(true)
  })
})
