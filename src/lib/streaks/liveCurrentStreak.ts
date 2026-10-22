import { addCalendarDays, dayKeyDiff, streakDayKey } from './streakDayKey.ts'

export type StreakSnapshot = {
  current: number
  longest: number
  lastActiveDay: string | null
}

/**
 * Returns the streak count that should display "right now" for a writer/reader.
 * A streak stays alive through today if the last active day was today or yesterday.
 */
export function liveCurrentStreak(
  snapshot: StreakSnapshot,
  timeZone: string,
  now: Date = new Date(),
): number {
  const stored = Math.max(0, snapshot.current)
  if (!snapshot.lastActiveDay || stored === 0) return 0

  const today = streakDayKey(now, timeZone)
  const gap = dayKeyDiff(today, snapshot.lastActiveDay)
  if (gap <= 0) return stored
  if (gap === 1) return stored
  return 0
}

export function streakStillActive(lastActiveDay: string | null, timeZone: string, now: Date = new Date()): boolean {
  if (!lastActiveDay) return false
  const today = streakDayKey(now, timeZone)
  const yesterday = addCalendarDays(today, -1)
  return lastActiveDay === today || lastActiveDay === yesterday
}
