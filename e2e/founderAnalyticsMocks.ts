import type { Page } from '@playwright/test'

const overviewPayload = {
  total_users: 100,
  total_writers: 40,
  new_users_7d: 5,
  new_users_30d: 20,
  prev_new_users_7d: 4,
  prev_new_users_30d: 18,
  dau_latest: 12,
  total_follows: 300,
  total_posts: 500,
  total_comments: 800,
  open_reports: 2,
  signups_series: [{ day: '2026-01-01', value: 1 }],
  dau_series: [{ day: '2026-01-01', value: 2 }],
}

export function installFounderAnalyticsMocks(page: Page) {
  page.route('**/rest/v1/rpc/founder_prepare_daily_metrics**', async (route) => {
    await route.fulfill({ json: { refreshes: [], last_completed_day: '2026-01-01' } })
  })
  page.route('**/rest/v1/rpc/founder_analytics_overview**', async (route) => {
    await route.fulfill({ json: overviewPayload })
  })
  page.route('**/rest/v1/rpc/founder_analytics_retention**', async (route) => {
    await route.fulfill({
      json: {
        day1_rate: 0.2,
        cohorts_by_week: [{ week_start: '2026-01-06', signups: 10, day1_returns: 2, day7_returns: 4 }],
        active_users: 50,
        inactive_users: 10,
      },
    })
  })
  page.route('**/rest/v1/rpc/founder_analytics_export**', async (route) => {
    await route.fulfill({ json: { section: 'overview', rows: [overviewPayload], row_count: 1 } })
  })
  page.route('**/rest/v1/rpc/founder_analytics_*', async (route) => {
    await route.fulfill({ json: {} })
  })
}

export function installCreatorDashboardMocks(page: Page) {
  page.route('**/rest/v1/rpc/get_creator_dashboard_overview**', async (route) => {
    await route.fulfill({
      json: {
        followers_gained: 3,
        followers_lost: 1,
        views: 40,
        prev_views: 30,
        likes: 10,
        prev_likes: 8,
        saves: 2,
        comments: 4,
        unfollow_history_available: true,
        views_series: [{ day: '2026-01-01', views: 5 }],
      },
    })
  })
  page.route('**/rest/v1/rpc/get_creator_dashboard_*', async (route) => {
    await route.fulfill({ json: { posts: [], drafts: [], books: [] } })
  })
}
