export type SeriesPoint = { day: string; value: number }

export function seriesFromDailyJson(raw: unknown): SeriesPoint[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const day = String((row as { day?: unknown }).day ?? '')
      const value = Number((row as { value?: unknown }).value ?? 0)
      if (!day) return null
      return { day, value: Number.isFinite(value) ? value : 0 }
    })
    .filter((row): row is SeriesPoint => row !== null)
}

export function chartScaleMax(values: number[]): number {
  return Math.max(1, ...values, 0)
}

export function chartSummary(label: string, points: SeriesPoint[]): string {
  if (points.length === 0) return `${label}: no data in this range.`
  const total = points.reduce((sum, p) => sum + p.value, 0)
  const peak = points.reduce((best, p) => (p.value > best.value ? p : best), points[0]!)
  return `${label}: ${total} total in range; peak ${peak.value} on ${peak.day}.`
}

export function barChartRows(raw: unknown): { label: string; value: number }[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const label = String((row as { label?: unknown }).label ?? '')
      const value = Number((row as { value?: unknown }).value ?? 0)
      if (!label) return null
      return { label, value: Number.isFinite(value) ? value : 0 }
    })
    .filter((row): row is { label: string; value: number } => row !== null)
}
