import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FounderAnalyticsPanel } from './FounderAnalyticsPanel.tsx'

const founderAnalyticsOverview = vi.fn()
const founderAnalyticsRetention = vi.fn()
const founderAnalyticsPlatformHealth = vi.fn()
const founderPrepareMetrics = vi.fn()
const founderAnalyticsExport = vi.fn()

vi.mock('../../lib/founder/analyticsApi.ts', () => ({
  founderAnalyticsOverview: (...args: unknown[]) => founderAnalyticsOverview(...args),
  founderAnalyticsRetention: (...args: unknown[]) => founderAnalyticsRetention(...args),
  founderAnalyticsTopContent: vi.fn(async () => ({ ok: true, data: { posts: [], top_books: [] } })),
  founderAnalyticsTopCreators: vi.fn(async () => ({ ok: true, data: {} })),
  founderAnalyticsPlatformHealth: (...args: unknown[]) => founderAnalyticsPlatformHealth(...args),
  founderAnalyticsAudience: vi.fn(async () => ({ ok: true, data: {} })),
  founderAnalyticsFollowing: vi.fn(async () => ({ ok: true, data: {} })),
  founderAnalyticsEngagement: vi.fn(async () => ({ ok: true, data: {} })),
  founderPrepareMetrics: (...args: unknown[]) => founderPrepareMetrics(...args),
  founderAnalyticsExport: (...args: unknown[]) => founderAnalyticsExport(...args),
}))

describe('FounderAnalyticsPanel', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    founderPrepareMetrics.mockResolvedValue({ ok: true, data: {} })
    founderAnalyticsExport.mockResolvedValue({ ok: true, data: { rows: [{ total_users: 1 }] } })
    founderAnalyticsOverview.mockResolvedValue({
      ok: true,
      data: { total_users: 1, total_writers: 1, signups_series: [], dau_series: [] },
    })
    founderAnalyticsRetention.mockResolvedValue({
      ok: true,
      data: { day1_rate: 0, day7_rate: 0, day30_rate: 0, active_users: 0, inactive_users: 0, cohorts_by_week: [] },
    })
  })

  it('shows loading then overview metrics', async () => {
    founderAnalyticsOverview.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, data: { total_users: 99, total_writers: 10, signups_series: [], dau_series: [] } }), 10)
        }),
    )
    render(<FounderAnalyticsPanel tab="overview" />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('metric-total-users')).toHaveTextContent('99'))
  })

  it('shows error with Retry', async () => {
    founderAnalyticsOverview.mockResolvedValue({ ok: false, error: { message: 'Network down' } })
    render(<FounderAnalyticsPanel tab="overview" />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Network down'))
    founderAnalyticsOverview.mockResolvedValue({ ok: true, data: { total_users: 1, total_writers: 1, signups_series: [], dau_series: [] } })
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.getByTestId('metric-total-users')).toBeInTheDocument())
  })

  it('retention tab shows empty cohort table headers when payload has no rows', async () => {
    founderAnalyticsRetention.mockResolvedValue({
      ok: true,
      data: {
        day1_rate: 0,
        day7_rate: 0,
        day30_rate: 0,
        active_users: 0,
        inactive_users: 0,
        cohorts_by_week: [],
      },
    })
    render(<FounderAnalyticsPanel tab="retention" />)
    await waitFor(() => expect(screen.getByTestId('cohort-table')).toBeInTheDocument())
    expect(screen.getByTestId('cohort-table')).toHaveTextContent('Week')
  })

  it('retention tab renders cohort table when populated', async () => {
    founderAnalyticsRetention.mockResolvedValue({
      ok: true,
      data: {
        day1_rate: 0.1,
        day7_rate: 0.2,
        day30_rate: 0.3,
        active_users: 5,
        inactive_users: 2,
        cohorts_by_week: [{ week_start: '2026-01-06', signups: 10, day1_returns: 2, day7_returns: 4 }],
      },
    })
    render(<FounderAnalyticsPanel tab="retention" />)
    await waitFor(() => expect(screen.getByTestId('cohort-table')).toBeInTheDocument())
    expect(screen.getByTestId('cohort-table')).toHaveTextContent('2026-01-06')
  })

  it('export button triggers founderAnalyticsExport', async () => {
    render(<FounderAnalyticsPanel tab="overview" />)
    await waitFor(() => expect(screen.getByTestId('analytics-export')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('analytics-export'))
    await waitFor(() => expect(founderAnalyticsExport).toHaveBeenCalled())
  })

  it('platform health signups table renders one row per signup entry', async () => {
    founderAnalyticsPlatformHealth.mockResolvedValue({
      ok: true,
      data: {
        books: 0,
        chapters: 0,
        client_errors_in_range: 0,
        recent_signups: [
          {
            id: 'a1',
            username: 'alpha',
            email: 'a@test.com',
            role: 'reader',
            country: 'ZA',
            created_at: '2026-11-04T08:00:00.000Z',
          },
          {
            id: 'b2',
            username: 'beta',
            email: 'b@test.com',
            role: 'writer',
            country: 'GB',
            created_at: '2026-11-03T08:00:00.000Z',
          },
        ],
        today_logins: [],
        today_logins_count: 0,
      },
    })
    render(<FounderAnalyticsPanel tab="platform-health" />)
    await waitFor(() => expect(screen.getByTestId('platform-health-signups-table')).toBeInTheDocument())
    expect(screen.getAllByTestId('platform-health-signup-row')).toHaveLength(2)
  })

  it('platform health logins table renders one row per login entry', async () => {
    founderAnalyticsPlatformHealth.mockResolvedValue({
      ok: true,
      data: {
        books: 0,
        chapters: 0,
        client_errors_in_range: 0,
        recent_signups: [],
        today_logins_count: 2,
        today_logins: [
          { user_id: 'u1', username: 'login_a', signed_in_at: '2026-11-04T06:00:00.000Z' },
          { user_id: 'u2', username: 'login_b', signed_in_at: '2026-11-04T07:00:00.000Z' },
        ],
      },
    })
    render(<FounderAnalyticsPanel tab="platform-health" />)
    await waitFor(() => expect(screen.getByTestId('platform-health-logins-table')).toBeInTheDocument())
    expect(screen.getAllByTestId('platform-health-login-row')).toHaveLength(2)
    expect(screen.getByText('(2 today)')).toBeInTheDocument()
  })
})
