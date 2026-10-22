import type { NotificationSettings } from './types.ts'

/** Parse "HH:MM:SS" or "HH:MM" from Postgres time into minutes since midnight. */
export function timeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null
  const parts = value.split(':')
  if (parts.length < 2) return null
  const hours = Number(parts[0])
  const minutes = Number(parts[1])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

function localMinutesNow(timezone: string, at: Date): number {
  try {
    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(at)
    const [h, m] = formatted.split(':').map((part) => Number(part))
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
    return h * 60 + m
  } catch {
    return at.getUTCHours() * 60 + at.getUTCMinutes()
  }
}

/** Mirrors public.is_quiet_mode_active schedule math on the client. */
export function isQuietModeActive(
  settings: Pick<
    NotificationSettings,
    'quietManual' | 'quietEnabled' | 'quietScheduleStart' | 'quietScheduleEnd' | 'timezone'
  >,
  at: Date = new Date(),
): boolean {
  if (settings.quietManual) return true
  if (!settings.quietEnabled) return false

  const start = timeToMinutes(settings.quietScheduleStart)
  const end = timeToMinutes(settings.quietScheduleEnd)
  if (start === null || end === null) return false
  if (start === end) return false

  const now = localMinutesNow(settings.timezone || 'UTC', at)

  if (start < end) {
    return now >= start && now < end
  }
  return now >= start || now < end
}
