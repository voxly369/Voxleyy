/** Matches public.quote_of_the_day index selection (stable per local calendar day + tz). */
export function quoteDayEpochIndex(dayKey: string, timeZone: string, activeCount: number): number {
  if (activeCount <= 0) return 0
  const tz = timeZone.trim() || 'UTC'
  const anchor = Date.parse(`${dayKey}T12:00:00`)
  if (!Number.isFinite(anchor)) return 0
  // Approximate Postgres: (p_day::timestamp at time zone p_tz) epoch — use noon UTC date key + tz offset via formatter.
  let epochSec: number
  try {
    const utcNoon = new Date(`${dayKey}T12:00:00.000Z`)
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(utcNoon)
    const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
    const local = new Date(
      `${pick('year')}-${pick('month')}-${pick('day')}T${pick('hour')}:${pick('minute')}:${pick('second')}Z`,
    )
    epochSec = Math.floor(local.getTime() / 1000)
  } catch {
    epochSec = Math.floor(anchor / 1000)
  }
  let idx = epochSec % activeCount
  if (idx < 0) idx = -idx
  return idx % activeCount
}
