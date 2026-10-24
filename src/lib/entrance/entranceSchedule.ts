import { daysBetweenLocalDates, localDateKey } from '../home/greeting.ts'

const DEVICE_LAST_VISIT_KEY = 'voxly-last-visit-v1'
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

export type EntranceScheduleInput = {
  timeZone: string
  showEntranceScreen: boolean
  serverLastEntranceDate: string | null
  now?: Date
}

export function shouldShowEntrance(input: EntranceScheduleInput): boolean {
  if (!input.showEntranceScreen) return false
  const now = input.now ?? new Date()
  const today = localDateKey(input.timeZone, now)
  if (input.serverLastEntranceDate === today) return false
  try {
    const deviceDay = readDeviceLastVisitDay()
    if (deviceDay === today) return false
  } catch {
    /* ignore */
  }
  return true
}

export function isLongAbsence(timeZone: string, serverLastEntranceDate: string | null, now: Date = new Date()): boolean {
  const today = localDateKey(timeZone, now)
  const last = serverLastEntranceDate ?? readDeviceLastVisitDay()
  if (!last) return false
  return daysBetweenLocalDates(last, today) >= ABSENCE_DAYS
}
