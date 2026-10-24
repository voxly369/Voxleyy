import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { EmptyState } from '../states/EmptyState.tsx'
import { AnalyticsToolbar, toolbarFilterParams } from '../analytics/AnalyticsToolbar.tsx'
import { MetricCard } from '../analytics/MetricCard.tsx'
import { AnalyticsLineChart } from '../analytics/AnalyticsLineChart.tsx'
import { AnalyticsBarChart } from '../analytics/AnalyticsBarChart.tsx'
import { AvailableWhenCard } from '../analytics/AvailableWhenCard.tsx'
import { rangeFromPreset, validateCustomRange, type AnalyticsDateRange } from '../../lib/analytics/dateRange.ts'
import { formatPeriodChange, periodOverPeriodChange } from '../../lib/analytics/periodChange.ts'
import { seriesFromDailyJson } from '../../lib/analytics/chartHelpers.ts'
import { cohortRowsFromPayload, cohortReturnRate } from '../../lib/analytics/cohortTable.ts'
import { buildCsv, downloadCsv, flattenJsonRows } from '../../lib/analytics/csvExport.ts'
import {
  founderAnalyticsAudience,
  founderAnalyticsEngagement,
  founderAnalyticsExport,
  founderAnalyticsFollowing,
  founderAnalyticsOverview,
  founderAnalyticsPlatformHealth,
  founderAnalyticsRetention,
  founderAnalyticsTopContent,
  founderAnalyticsTopCreators,
  founderPrepareMetrics,
} from '../../lib/founder/analyticsApi.ts'
import { FounderCloseMonthModal } from './FounderCloseMonthModal.tsx'

export type FounderAnalyticsTabId =
  | 'overview'
  | 'retention'
  | 'top-content'
  | 'top-creators'
  | 'platform-health'
  | 'audience'
  | 'following'
  | 'engagement'
  | 'revenue'
  | 'curation'

type FounderAnalyticsPanelProps = {
  tab: FounderAnalyticsTabId
}

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function FounderAnalyticsPanel({ tab }: FounderAnalyticsPanelProps) {
  const [range, setRange] = useState<AnalyticsDateRange>(() => rangeFromPreset('30'))
  const [country, setCountry] = useState('')
  const [role, setRole] = useState('')
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshBusy, setRefreshBusy] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [topWindow, setTopWindow] = useState('month')
  const [topSort, setTopSort] = useState('views')
  const [closeMonthOpen, setCloseMonthOpen] = useState(false)
  const closeMonthTarget = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}-01`

  const filters = useMemo(() => toolbarFilterParams(country, role), [country, role])

  const load = useCallback(async () => {
    const customErr = range.preset === 'custom' ? validateCustomRange(range.from, range.to) : null
    if (customErr || filters.error) {
      setError(customErr ?? filters.error)
      return
    }
    setLoading(true)
    setError(null)
    await founderPrepareMetrics(range.from, range.to)
    let result
    switch (tab) {
      case 'overview':
        result = await founderAnalyticsOverview(range.from, range.to, filters.country, filters.role)
        break
      case 'retention':
        result = await founderAnalyticsRetention(range.from, range.to, filters.country, filters.role)
        break
      case 'top-content':
        result = await founderAnalyticsTopContent(range.from, range.to, topWindow, null, topSort)
        break
      case 'top-creators':
        result = await founderAnalyticsTopCreators(range.from, range.to, filters.country)
        break
      case 'platform-health':
        result = await founderAnalyticsPlatformHealth(range.from, range.to)
        break
      case 'audience':
        result = await founderAnalyticsAudience(filters.country, filters.role)
        break
      case 'following':
        result = await founderAnalyticsFollowing(range.from, range.to)
        break
      case 'engagement':
        result = await founderAnalyticsEngagement(range.from, range.to)
        break
      default:
        result = { ok: true as const, data: {} }
    }
    setLoading(false)
    if (!result.ok) {
      setError(result.error.message)
      setPayload(null)
      return
    }
    setPayload(result.data)
  }, [tab, range, filters, topWindow, topSort])

  useEffect(() => {
    if (tab === 'revenue' || tab === 'curation') return
    void load()
  }, [load, tab])

  async function handleRefresh() {
    setRefreshBusy(true)
    await founderPrepareMetrics(range.from, range.to)
    setRefreshBusy(false)
    await load()
  }

  async function handleExport() {
    const sectionMap: Partial<Record<FounderAnalyticsTabId, string>> = {
      overview: 'overview',
      retention: 'retention',
      'top-content': 'top_content',
      'top-creators': 'top_creators',
      'platform-health': 'platform_health',
      audience: 'audience',
      following: 'following',
      engagement: 'engagement',
    }
    const section = sectionMap[tab]
    if (!section) return
    setExportBusy(true)
    const result = await founderAnalyticsExport(section, range.from, range.to, filters.country, filters.role)
    setExportBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    const rows = flattenJsonRows(section, result.data.rows)
    const headers = rows.length ? Object.keys(rows[0]!) : ['section']
    const csv = buildCsv(headers, rows)
    downloadCsv(`voxly-founder-${section}-${range.from}-${range.to}.csv`, csv)
  }

  if (tab === 'revenue') {
    return (
      <AvailableWhenCard
        testId="founder-revenue-tab"
        title="Revenue"
        whenLabel="Available when selling launches"
        bullets={[
          'Subscription and premium sales totals',
          'Platform share and payouts due',
          'Never shown with placeholder numbers before payments go live',
        ]}
      />
    )
  }

  if (tab === 'curation') {
    return (
      <div className="flex flex-col gap-4" data-testid="founder-curation-tab">
        <AvailableWhenCard
          title="Featured Writers and Word of the Day"
          whenLabel="Partial — use controls below where wired; full curation UI is scheduled"
          bullets={['Featured badge control is available from user search.', 'Challenges and Word of the Day coming later.']}
        />
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-serif text-xl text-ink">Month close</h2>
          <p className="text-sm text-muted">Award performance badges after month end.</p>
          <button
            type="button"
            onClick={() => setCloseMonthOpen(true)}
            className={`mt-3 min-h-11 rounded-2xl bg-coral px-4 font-semibold text-white ${focusRing}`}
          >
            Close month…
          </button>
        </section>
        <p className="text-sm text-muted">Award the Featured badge from the Users tab after you search for a writer.</p>
        <FounderCloseMonthModal open={closeMonthOpen} month={closeMonthTarget} onClose={() => setCloseMonthOpen(false)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid={`founder-analytics-${tab}`}>
      <AnalyticsToolbar
        range={range}
        country={country}
        role={role}
        onRangeChange={setRange}
        onCountryChange={setCountry}
        onRoleChange={setRole}
        onRefresh={tab === 'overview' || tab === 'engagement' ? handleRefresh : handleRefresh}
        refreshBusy={refreshBusy}
        onExport={handleExport}
        exportBusy={exportBusy}
        filterError={filters.error}
      />
      {tab === 'top-content' ? (
        <div className="flex flex-wrap gap-2">
          {['day', 'week', 'month', 'all'].map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={topWindow === w}
              onClick={() => setTopWindow(w)}
              className={`min-h-11 rounded-2xl px-3 text-sm font-semibold ${topWindow === w ? 'bg-surface text-coral ring-2 ring-inset ring-coral' : 'bg-raised'} ${focusRing}`}
            >
              {w}
            </button>
          ))}
          {['views', 'likes', 'saves', 'comments'].map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={topSort === s}
              onClick={() => setTopSort(s)}
              className={`min-h-11 rounded-2xl px-3 text-sm font-semibold ${topSort === s ? 'bg-surface text-coral ring-2 ring-inset ring-coral' : 'bg-raised'} ${focusRing}`}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted" aria-busy="true">
          Loading…
        </p>
      ) : null}
      {error ? (
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-sm text-coral">
            {error}
          </p>
          <button type="button" onClick={() => void load()} className={`min-h-11 self-start rounded-2xl bg-raised px-4 text-sm font-semibold ${focusRing}`}>
            Retry
          </button>
        </div>
      ) : null}
      {!loading && !error && payload && tab === 'overview' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Total users" value={num(payload.total_users)} testId="metric-total-users" />
            <MetricCard label="Writers" value={num(payload.total_writers)} />
            <MetricCard
              label="New users (7d)"
              value={num(payload.new_users_7d)}
              hint={formatPeriodChange(periodOverPeriodChange(num(payload.new_users_7d), num(payload.prev_new_users_7d)))}
            />
            <MetricCard
              label="New users (30d)"
              value={num(payload.new_users_30d)}
              hint={formatPeriodChange(periodOverPeriodChange(num(payload.new_users_30d), num(payload.prev_new_users_30d)))}
            />
            <MetricCard label="Daily active users (latest UTC day)" value={num(payload.dau_latest)} />
            <MetricCard label="Total follows" value={num(payload.total_follows)} />
            <MetricCard label="Published posts" value={num(payload.total_posts)} />
            <MetricCard label="Comments" value={num(payload.total_comments)} />
            <MetricCard label="Open reports" value={num(payload.open_reports)} hint="Use the Report queue tab to review." />
          </div>
          <AnalyticsLineChart label="Signups" points={seriesFromDailyJson(payload.signups_series)} testId="chart-signups" />
          <AnalyticsLineChart label="Active users" points={seriesFromDailyJson(payload.dau_series)} testId="chart-dau" />
        </>
      ) : null}
      {!loading && !error && payload && tab === 'retention' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Day-1 return rate" value={`${Math.round(num(payload.day1_rate) * 1000) / 10}%`} />
            <MetricCard label="Day-7 return rate" value={`${Math.round(num(payload.day7_rate) * 1000) / 10}%`} />
            <MetricCard label="Day-30 return rate" value={`${Math.round(num(payload.day30_rate) * 1000) / 10}%`} />
            <MetricCard label="Active (14d)" value={num(payload.active_users)} />
            <MetricCard label="Inactive (14d)" value={num(payload.inactive_users)} />
          </div>
          <table className="w-full text-left text-sm" data-testid="cohort-table">
            <caption className="sr-only">Signup cohort return rates by week</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="py-2">
                  Week
                </th>
                <th scope="col" className="py-2">
                  Signups
                </th>
                <th scope="col" className="py-2">
                  Day-1
                </th>
                <th scope="col" className="py-2">
                  Day-7
                </th>
              </tr>
            </thead>
            <tbody>
              {cohortRowsFromPayload(payload.cohorts_by_week).map((row) => (
                <tr key={row.week_start} className="border-b border-line/60">
                  <th scope="row" className="py-2 font-medium">
                    {row.week_start}
                  </th>
                  <td className="py-2 tabular-nums">{row.signups}</td>
                  <td className="py-2 tabular-nums">{cohortReturnRate(row.day1_returns, row.signups)}</td>
                  <td className="py-2 tabular-nums">{cohortReturnRate(row.day7_returns, row.signups)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      {!loading && !error && payload && tab === 'top-content' ? (
        <ul className="flex flex-col gap-3">
          {Array.isArray(payload.posts) && payload.posts.length ? (
            (payload.posts as Record<string, unknown>[]).map((post) => (
              <li key={String(post.id)} className="rounded-2xl border border-line bg-surface p-4">
                <Link to={`/c/${String(post.id)}`} className={`font-semibold text-coral ${focusRing}`}>
                  {String(post.title ?? 'Untitled')}
                </Link>
                <p className="text-sm text-muted">
                  {String(post.type)} · {num(post.views)} views · {num(post.likes)} likes
                  {post.is_removed ? ' · removed' : ''}
                </p>
              </li>
            ))
          ) : (
            <EmptyState title="No posts" message="No published posts match this filter." />
          )}
        </ul>
      ) : null}
      {!loading && !error && payload && tab === 'top-creators' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {(['most_followed', 'fastest_growing', 'most_active'] as const).map((key) => (
            <section key={key} className="rounded-2xl border border-line bg-surface p-4">
              <h3 className="font-serif text-lg capitalize text-ink">{key.replace('_', ' ')}</h3>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {Array.isArray(payload[key])
                  ? (payload[key] as Record<string, unknown>[]).map((row) => (
                      <li key={String(row.user_id)}>
                        <Link to={`/u/${String(row.username)}`} className={`font-semibold text-coral ${focusRing}`}>
                          {String(row.display_name || row.username)}
                        </Link>
                      </li>
                    ))
                  : null}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
      {!loading && !error && payload && tab === 'platform-health' ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Books" value={num(payload.books)} />
            <MetricCard label="Chapters" value={num(payload.chapters)} />
            <MetricCard label="Writer / reader ratio" value={String(payload.writer_reader_ratio ?? '—')} />
            <MetricCard label="Client errors in range" value={num(payload.client_errors_in_range)} />
          </div>
          <p className="text-sm text-muted">Reports by status: {JSON.stringify(payload.reports_by_status)}</p>
        </div>
      ) : null}
      {!loading && !error && payload && tab === 'audience' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <AnalyticsBarChart label="Country" raw={payload.by_country} />
          <AnalyticsBarChart label="Timezone" raw={payload.by_timezone} />
          <AnalyticsBarChart label="Language" raw={payload.by_language} />
          <AnalyticsBarChart label="Role" raw={payload.by_role} />
        </div>
      ) : null}
      {!loading && !error && payload && tab === 'following' ? (
        <>
          <MetricCard label="Total follows" value={num(payload.total_follows)} />
          <AnalyticsLineChart label="Daily follows" points={seriesFromDailyJson(payload.daily_series)} />
        </>
      ) : null}
      {!loading && !error && payload && tab === 'engagement' ? (
        <>
          <AnalyticsLineChart label="Views" points={seriesFromDailyJson(payload.views_series)} />
          <AnalyticsLineChart label="Likes" points={seriesFromDailyJson(payload.likes_series)} />
          <p className="text-sm text-muted">{String(payload.completion_note ?? '')}</p>
        </>
      ) : null}
    </div>
  )
}
