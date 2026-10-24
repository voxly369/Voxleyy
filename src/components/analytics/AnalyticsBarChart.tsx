import { barChartRows, chartScaleMax, chartSummary } from '../../lib/analytics/chartHelpers.ts'

type AnalyticsBarChartProps = {
  label: string
  raw: unknown
  testId?: string
}

export function AnalyticsBarChart({ label, raw, testId }: AnalyticsBarChartProps) {
  const rows = barChartRows(raw)
  const width = 320
  const height = 140
  const max = chartScaleMax(rows.map((r) => r.value))
  const barWidth = rows.length ? (width - 16) / rows.length - 4 : 0
  const summary = chartSummary(
    label,
    rows.map((r) => ({ day: r.label, value: r.value })),
  )

  return (
    <figure className="flex flex-col gap-2" data-testid={testId}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary} className="w-full text-coral">
        {rows.map((row, index) => {
          const barHeight = (row.value / max) * (height - 32)
          const x = index * (barWidth + 4) + 8
          const y = height - barHeight - 20
          return (
            <g key={row.label}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={3} fill="currentColor" opacity={0.85} />
              <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" className="fill-muted text-[8px]">
                {row.label.slice(0, 8)}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="text-sm text-muted">{summary}</figcaption>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Label</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
