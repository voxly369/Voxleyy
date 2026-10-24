export function periodOverPeriodChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null
  }
  return (current - previous) / previous
}

export function formatPeriodChange(ratio: number | null): string {
  if (ratio === null) return 'No prior period data'
  if (ratio === 0) return 'No change vs prior period'
  const pct = Math.round(ratio * 1000) / 10
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct}% vs prior period`
}
