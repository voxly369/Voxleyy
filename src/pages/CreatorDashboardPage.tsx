import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { MetricCard } from '../components/analytics/MetricCard.tsx'
import { AnalyticsLineChart } from '../components/analytics/AnalyticsLineChart.tsx'
import { AvailableWhenCard } from '../components/analytics/AvailableWhenCard.tsx'
import { AnalyticsToolbar } from '../components/analytics/AnalyticsToolbar.tsx'
import { rangeFromPreset, type AnalyticsDateRange } from '../lib/analytics/dateRange.ts'
import { formatPeriodChange, periodOverPeriodChange } from '../lib/analytics/periodChange.ts'
import { seriesFromDailyJson } from '../lib/analytics/chartHelpers.ts'
import {
  getCreatorDashboardAudience,
  getCreatorDashboardBooks,
  getCreatorDashboardOverview,
  getCreatorDashboardTopPosts,
  getCreatorDashboardWip,
} from '../lib/creator/dashboardApi.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export default function CreatorDashboardPage() {
  useDocumentTitle('Creator dashboard')
  const [range, setRange] = useState<AnalyticsDateRange>(() => rangeFromPreset('30'))
  const [section, setSection] = useState<'overview' | 'posts' | 'audience' | 'wip' | 'books'>('overview')
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [postWindow, setPostWindow] = useState('30')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    let result
    if (section === 'overview') result = await getCreatorDashboardOverview(range.from, range.to)
    else if (section === 'posts') result = await getCreatorDashboardTopPosts(postWindow)
    else if (section === 'audience') result = await getCreatorDashboardAudience(range.from, range.to)
    else if (section === 'wip') result = await getCreatorDashboardWip()
    else result = await getCreatorDashboardBooks()
    setLoading(false)
    if (!result.ok) {
      setError(result.error.message)
      setPayload(null)
      return
    }
    setPayload(result.data)
  }, [section, range, postWindow])

  useEffect(() => {
    void load()
  }, [load])

  const sections = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'posts' as const, label: 'Top posts' },
    { id: 'audience' as const, label: 'Audience' },
    { id: 'wip' as const, label: 'Work in progress' },
    { id: 'books' as const, label: 'Books' },
  ]

  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 py-8" testId="creator-dashboard">
      <PageHeader title="Creator dashboard" />
      <nav aria-label="Creator sections" className="flex flex-wrap gap-2">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={section === item.id ? 'page' : undefined}
            onClick={() => setSection(item.id)}
            className={`min-h-11 rounded-2xl px-4 text-sm font-semibold ${section === item.id ? 'bg-surface text-coral ring-2 ring-inset ring-coral' : 'bg-raised text-ink'} ${focusRing}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {section === 'overview' || section === 'audience' ? (
        <AnalyticsToolbar
          range={range}
          country=""
          role=""
          onRangeChange={setRange}
          onCountryChange={() => {}}
          onRoleChange={() => {}}
        />
      ) : null}
      {section === 'posts' ? (
        <div className="flex flex-wrap gap-2">
          {['7', '30', '90', 'all'].map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={postWindow === w}
              onClick={() => setPostWindow(w)}
              className={`min-h-11 rounded-2xl px-3 text-sm font-semibold ${postWindow === w ? 'bg-surface text-coral ring-2 ring-inset ring-coral' : 'bg-raised'} ${focusRing}`}
            >
              {w === 'all' ? 'All time' : `${w} days`}
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
      {!loading && !error && payload && section === 'overview' ? (
        <>
          {!payload.unfollow_history_available ? (
            <p className="text-sm text-muted">Follower loss before follow event history may be unavailable.</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Followers gained (range)" value={num(payload.followers_gained)} />
            <MetricCard label="Followers lost (range)" value={num(payload.followers_lost)} />
            <MetricCard
              label="Views"
              value={num(payload.views)}
              hint={formatPeriodChange(periodOverPeriodChange(num(payload.views), num(payload.prev_views)))}
            />
            <MetricCard
              label="Likes"
              value={num(payload.likes)}
              hint={formatPeriodChange(periodOverPeriodChange(num(payload.likes), num(payload.prev_likes)))}
            />
            <MetricCard label="Saves" value={num(payload.saves)} />
            <MetricCard label="Comments" value={num(payload.comments)} />
          </div>
          <AnalyticsLineChart label="Daily views" points={seriesFromDailyJson(payload.views_series)} />
        </>
      ) : null}
      {!loading && !error && payload && section === 'posts' ? (
        <ul className="flex flex-col gap-3">
          {Array.isArray(payload.posts)
            ? (payload.posts as Record<string, unknown>[]).map((post) => (
                <li key={String(post.id)} className="rounded-2xl border border-line bg-surface p-4">
                  <Link to={`/c/${String(post.id)}`} className={`font-semibold text-coral ${focusRing}`}>
                    {String(post.title ?? 'Untitled')}
                  </Link>
                  <p className="text-sm text-muted">
                    {num(post.views)} views · {num(post.likes)} likes
                  </p>
                </li>
              ))
            : null}
        </ul>
      ) : null}
      {!loading && !error && payload && section === 'audience' ? (
        <>
          <MetricCard label="Returning readers" value={num(payload.returning_readers)} hint={String(payload.returning_readers_note ?? '')} />
          <ul className="flex flex-col gap-2">
            {Array.isArray(payload.top_engaged_followers)
              ? (payload.top_engaged_followers as Record<string, unknown>[]).map((row) => (
                  <li key={String(row.user_id)}>
                    <Link to={`/u/${String(row.username)}`} className={`font-semibold text-coral ${focusRing}`}>
                      {String(row.display_name || row.username)}
                    </Link>
                    <span className="text-sm text-muted"> · {num(row.engagement)} interactions</span>
                  </li>
                ))
              : null}
          </ul>
        </>
      ) : null}
      {!loading && !error && payload && section === 'wip' ? (
        <div className="flex flex-col gap-4">
          {Array.isArray(payload.drafts)
            ? (payload.drafts as Record<string, unknown>[]).map((draft) => (
                <article key={String(draft.id)} className="rounded-2xl border border-line bg-surface p-4">
                  <p className="font-medium text-ink">{String(draft.title ?? 'Untitled')}</p>
                  <p className="text-sm text-muted">Updated {String(draft.updated_at ?? '')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link to={`/write/${String(draft.id)}`} className={`min-h-11 rounded-2xl bg-raised px-4 text-sm font-semibold ${focusRing}`}>
                      Edit
                    </Link>
                    <Link to={`/write/${String(draft.id)}?publish=1`} className={`min-h-11 rounded-2xl bg-coral px-4 text-sm font-semibold text-white ${focusRing}`}>
                      Publish
                    </Link>
                  </div>
                </article>
              ))
            : null}
        </div>
      ) : null}
      {!loading && !error && payload && section === 'books' ? (
        <ul className="flex flex-col gap-3">
          {Array.isArray(payload.books)
            ? (payload.books as Record<string, unknown>[]).map((book) => (
                <li key={String(book.book_id)} className="rounded-2xl border border-line bg-surface p-4">
                  <Link to={`/books/${String(book.book_id)}/builder`} className={`font-semibold text-coral ${focusRing}`}>
                    {String(book.title ?? 'Book')}
                  </Link>
                  <p className="text-sm text-muted">
                    {num(book.readers)} readers · {num(book.completed_readers)} completed · {num(book.chapter_count)} chapters
                  </p>
                </li>
              ))
            : null}
        </ul>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <AvailableWhenCard
          testId="creator-subscriptions-placeholder"
          title="Subscriptions"
          whenLabel="Available when selling launches"
          bullets={['Active subscribers', 'New and cancelled this month', 'Monthly recurring revenue']}
        />
        <AvailableWhenCard
          title="Premium content"
          whenLabel="Available when selling launches"
          bullets={['Sales per book or chapter', 'Earnings after platform share']}
        />
        <AvailableWhenCard
          title="Wallet"
          whenLabel="Available when selling launches"
          bullets={['Balance, pending payouts', 'Payout history and requests']}
        />
        <AvailableWhenCard
          title="Videos and recitations"
          whenLabel="Available when video launches"
          bullets={['Plays, watch time, completion rate per video']}
        />
      </div>
    </PageContainer>
  )
}
