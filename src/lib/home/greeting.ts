/** Hour in 0–23 in the user's IANA timezone (falls back to UTC). */
export function hourInTimeZone(timeZone: string, at: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: 'numeric', hour12: false }).formatToParts(at)
    const hourPart = parts.find((p) => p.type === 'hour')?.value
    const hour = hourPart ? Number.parseInt(hourPart, 10) : Number.NaN
    if (Number.isFinite(hour)) return hour === 24 ? 0 : hour
  } catch {
    /* invalid zone */
  }
  return at.getUTCHours()
}

const DISPLAY_NAME_MAX = 32

export function truncateDisplayName(displayName: string, max = DISPLAY_NAME_MAX): string {
  const trimmed = displayName.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max)}…`
}

export function greetingName(displayName: string, username: string): string {
  const fromDisplay = displayName.trim()
  if (fromDisplay) return truncateDisplayName(fromDisplay)
  const fromUser = username.trim()
  return fromUser || 'friend'
}

export function localDateKey(timeZone: string, at: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
  } catch {
    return at.toISOString().slice(0, 10)
  }
}

export function daysBetweenLocalDates(fromKey: string, toKey: string): number {
  const from = Date.parse(`${fromKey}T12:00:00Z`)
  const to = Date.parse(`${toKey}T12:00:00Z`)
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0
  return Math.floor((to - from) / 86_400_000)
}

/** Time-aware greeting; uses "Welcome back" after long absence (7+ local days). Never uses "Good night". */
export function entranceGreeting(
  timeZone: string,
  displayName: string,
  username: string,
  options: { longAbsence?: boolean; at?: Date } = {},
): string {
  const at = options.at ?? new Date()
  const name = greetingName(displayName, username)
  if (options.longAbsence) return `Welcome back, ${name}`
  const hour = hourInTimeZone(timeZone, at)
  if (hour >= 5 && hour < 12) return `Good morning, ${name}`
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
}

export function timeAwareGreeting(timeZone: string, displayName: string, at: Date = new Date()): string {
  return entranceGreeting(timeZone, displayName, '', { at })
}
