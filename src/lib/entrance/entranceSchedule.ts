import { daysBetweenLocalDates, localDateKey } from '../home/greeting.ts'

const DEVICE_LAST_VISIT_KEY = 'voxly-last-visit-v1'
export const LAST_ENTRANCE_DISMISSED_AT_KEY = 'voxly-last-entrance-dismissed-at-v1'

/** Show entrance again after this gap away (fresh load or long tab absence). */
export const ENTRANCE_FRESH_OPEN_ABSENCE_MS = 30 * 60 * 1000

const ABSENCE_DAYS = 7

export function readDeviceLastVisitDay(): string | null {
  try {
    const raw = localStorage.getItem(DEVICE_LAST_VISIT_KEY)
    return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null
  } catch {
    return null
  }
}

export function writeDeviceLastVisitDay(dayKey: string): void {
  try {
    localStorage.setItem(DEVICE_LAST_VISIT_KEY, dayKey)
  } catch {
    /* ignore */
  }
}

export function readLastEntranceDismissedAtMs(): number | null {
  try {
    const raw = localStorage.getItem(LAST_ENTRANCE_DISMISSED_AT_KEY)
    if (!raw) return null
    const ms = Number(raw)
    return Number.isFinite(ms) && ms > 0 ? ms : null
  } catch {
    return null
  }
}

export function writeLastEntranceDismissedAtMs(ms: number): void {
  try {
    localStorage.setItem(LAST_ENTRANCE_DISMISSED_AT_KEY, String(ms))
  } catch {
    /* ignore */
  }
}

export type EntranceScheduleInput = {
  showEntranceScreen: boolean
  lastDismissedAtMs: number | null
  now?: Date
}

/** Fresh-open rule: first visit, or return after {@link ENTRANCE_FRESH_OPEN_ABSENCE_MS}. */
export function shouldShowEntrance(input: EntranceScheduleInput): boolean {
  if (!input.showEntranceScreen) return false
  const nowMs = (input.now ?? new Date()).getTime()
  if (input.lastDismissedAtMs == null) return true
  return nowMs - input.lastDismissedAtMs >= ENTRANCE_FRESH_OPEN_ABSENCE_MS
}

export function isFreshOpenAfterAbsence(
  lastDismissedAtMs: number | null,
  now: Date = new Date(),
): boolean {
  return shouldShowEntrance({ showEntranceScreen: true, lastDismissedAtMs, now })
}

export function isLongAbsence(timeZone: string, serverLastEntranceDate: string | null, now: Date = new Date()): boolean {
  const today = localDateKey(timeZone, now)
  const last = serverLastEntranceDate ?? readDeviceLastVisitDay()
  if (!last) return false
  return daysBetweenLocalDates(last, today) >= ABSENCE_DAYS
}
