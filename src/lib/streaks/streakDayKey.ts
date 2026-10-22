/** Calendar day key (YYYY-MM-DD) for a timestamp in an IANA time zone. */
export function streakDayKey(instant: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(instant)
    const year = parts.find((p) => p.type === 'year')?.value
    const month = parts.find((p) => p.type === 'month')?.value
    const day = parts.find((p) => p.type === 'day')?.value
    if (year && month && day) return `${year}-${month}-${day}`
  } catch {
    // fall through
  }
  return instant.toISOString().slice(0, 10)
}

export function addCalendarDays(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d + delta))
  return utc.toISOString().slice(0, 10)
}

export function dayKeyDiff(later: string, earlier: string): number {
  const a = new Date(`${later}T00:00:00Z`).getTime()
  const b = new Date(`${earlier}T00:00:00Z`).getTime()
  return Math.round((a - b) / 86_400_000)
}
