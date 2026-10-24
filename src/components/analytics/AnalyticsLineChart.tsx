import { chartScaleMax, chartSummary, type SeriesPoint } from '../../lib/analytics/chartHelpers.ts'

type AnalyticsLineChartProps = {
  label: string
  points: SeriesPoint[]
  testId?: string
}

export function AnalyticsLineChart({ label, points, testId }: AnalyticsLineChartProps) {
  const width = 320
  const height = 140
  const padding = 16
  const values = points.map((p) => p.value)
  const max = chartScaleMax(values)
  const innerW = width - padding * 2
  const innerH = height - padding * 2
  const summary = chartSummary(label, points)

  const coords =
    points.length === 0
      ? ''
      : points
          .map((p, i) => {
            const x = padding + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
            const y = padding + innerH - (p.value / max) * innerH
            return `${x},${y}`
          })
          .join(' ')

  return (
    <figure className="flex flex-col gap-2" data-testid={testId}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary} className="w-full text-coral">
        {coords ? <polyline fill="none" stroke="currentColor" strokeWidth={2} points={coords} /> : null}
      </svg>
      <figcaption className="text-sm text-muted">{summary}</figcaption>
    </figure>
  )
}
