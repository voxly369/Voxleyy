import type { CreatorAnalytics } from '../../lib/analytics/types.ts'
import { analyticsHasActivity, chartSeries, tableRows } from '../../lib/analytics/aggregate.ts'
import { EmptyState } from '../states/EmptyState.tsx'
import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'

type ProfileAnalyticsTabProps = {
  data: CreatorAnalytics | null
  loading: boolean
  error: string | null
}

function MiniBarChart({ series }: { series: { label: string; value: number }[] }) {
  const max = Math.max(1, ...series.map((row) => row.value))
  const width = 280
  const height = 120
  const barWidth = width / series.length - 6
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Analytics bar chart"
      className="w-full max-w-md text-coral"
      data-testid="analytics-chart"
    >
      {series.map((row, index) => {
        const barHeight = (row.value / max) * (height - 24)
        const x = index * (barWidth + 6) + 4
        const y = height - barHeight - 16
        return (
          <g key={row.label}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={4} fill="currentColor" opacity={0.85} />
            <text x={x + barWidth / 2} y={height - 2} textAnchor="middle" className="fill-muted text-[10px]">
              {row.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function ProfileAnalyticsTab({ data, loading, error }: ProfileAnalyticsTabProps) {
  if (loading) {
    return (
      <p className="text-sm text-muted" aria-busy="true" data-testid="profile-analytics-tab">
        Loading analytics…
      </p>
    )
  }
  if (error) {
    return (
      <p role="alert" className="text-sm text-coral" data-testid="profile-analytics-tab">
        {error}
      </p>
    )
  }
  if (!data || !analyticsHasActivity(data)) {
    return (
      <div data-testid="profile-analytics-tab">
        <EmptyState title="No analytics yet" message="Publish work and engage readers to see views and likes here." />
      </div>
    )
  }

  const series = chartSeries(data)
  const rows = tableRows(data)

  return (
    <div className="flex flex-col gap-6" data-testid="profile-analytics-tab">
      <Link
        to="/creator"
        className={`inline-flex min-h-11 items-center self-start rounded-2xl bg-raised px-4 text-sm font-semibold text-ink ${focusRing}`}
        data-testid="open-creator-dashboard"
      >
        Open Creator Dashboard
      </Link>
      <MiniBarChart series={series} />
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm" data-testid="analytics-table">
          <caption className="sr-only">Creator analytics for the last 7 and 30 days</caption>
          <thead>
            <tr className="border-b border-line text-muted">
              <th scope="col" className="py-2 pr-4 font-medium">
                Metric
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                7 days
              </th>
              <th scope="col" className="py-2 font-medium">
                30 days
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.metric} className="border-b border-line/60">
                <th scope="row" className="py-2 pr-4 font-medium text-ink">
                  {row.metric}
                </th>
                <td className="py-2 pr-4 tabular-nums">{row.seven}</td>
                <td className="py-2 tabular-nums">{row.thirty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.bestPiece ? (
        <section aria-labelledby="best-piece-heading" className="flex flex-col gap-1">
          <h3 id="best-piece-heading" className="font-serif text-lg text-ink">
            Best piece
          </h3>
          <Link to={`/c/${data.bestPiece.id}`} className={`text-base font-medium text-coral ${focusRing}`}>
            {data.bestPiece.title?.trim() || 'Untitled work'}
          </Link>
          <p className="text-sm text-muted">
            {data.bestPiece.views} views · {data.bestPiece.likes} likes
          </p>
        </section>
      ) : null}
      <div className="flex flex-col gap-1 text-sm text-muted">
        <p>{data.salesPlaceholder}</p>
        <p>{data.watchTimePlaceholder}</p>
      </div>
    </div>
  )
}
