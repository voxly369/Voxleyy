import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FounderAnalyticsPanel } from './FounderAnalyticsPanel.tsx'

const founderAnalyticsOverview = vi.fn()
const founderAnalyticsRetention = vi.fn()
const founderPrepareMetrics = vi.fn()
const founderAnalyticsExport = vi.fn()

vi.mock('../../lib/founder/analyticsApi.ts', () => ({
  founderAnalyticsOverview: (...args: unknown[]) => founderAnalyticsOverview(...args),
  founderAnalyticsRetention: (...args: unknown[]) => founderAnalyticsRetention(...args),
  founderAnalyticsTopContent: vi.fn(async () => ({ ok: true, data: { posts: [], top_books: [] } })),
  founderAnalyticsTopCreators: vi.fn(async () => ({ ok: true, data: {} })),
  founderAnalyticsPlatformHealth: vi.fn(async () => ({ ok: true, data: {} })),
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
})
