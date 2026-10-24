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

export function timeAwareGreeting(timeZone: string, displayName: string, at: Date = new Date()): string {
  const hour = hourInTimeZone(timeZone, at)
  const name = displayName.trim() || 'friend'
  if (hour >= 5 && hour < 12) return `Good morning, ${name}`
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
}
