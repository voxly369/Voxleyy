export type CohortWeekRow = {
  week_start: string
  signups: number
  day1_returns: number
  day7_returns: number
}

export function cohortRowsFromPayload(raw: unknown): CohortWeekRow[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const o = row as Record<string, unknown>
      return {
        week_start: String(o.week_start ?? ''),
        signups: Number(o.signups ?? 0),
        day1_returns: Number(o.day1_returns ?? 0),
        day7_returns: Number(o.day7_returns ?? 0),
      }
    })
    .filter((row): row is CohortWeekRow => row !== null && Boolean(row.week_start))
}

export function cohortReturnRate(returns: number, signups: number): string {
  if (signups <= 0) return '—'
  return `${Math.round((returns / signups) * 1000) / 10}%`
}
