import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  installSupabaseMocks,
  seedSignedInSession,
  setE2eOwnProfileRole,
  setModerationIsFounder,
} from './fixtures.ts'
import { installFounderAnalyticsMocks, installCreatorDashboardMocks } from './founderAnalyticsMocks.ts'

const FOUNDER_TABS = [
  'Overview',
  'Retention',
  'Top content',
  'Top creators',
  'Platform health',
  'Audience',
  'Following',
  'Engagement',
  'Revenue',
  'Curation',
  'Beta',
  'Errors',
  'Report queue',
  'Users',
  'Content',
  'Appeals',
  'Audit log',
] as const

const LAYOUT_WIDTHS = [375, 767, 768, 1024, 1279, 1280, 1440] as const

async function assertNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement
    return el.scrollWidth - el.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(1)
}

async function axeSerious(page: Page, include?: string) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  if (include) builder = builder.include(include)
  const results = await builder.analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious).toEqual([])
}

test.describe('founder analytics 17B', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    installFounderAnalyticsMocks(page)
    setModerationIsFounder(true)
  })

  for (const width of LAYOUT_WIDTHS) {
    test(`founder layout at ${width}px has no horizontal scroll on overview`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/founder', { waitUntil: 'networkidle' })
      await assertNoHorizontalScroll(page)
      await expect(page.getByTestId('founder-analytics-overview')).toBeVisible()
    })
  }

  for (const width of [375, 1280] as const) {
    test(`founder axe at ${width}px on overview`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/founder', { waitUntil: 'networkidle' })
      await axeSerious(page, '[data-testid="founder-analytics-overview"]')
    })
  }

  for (const tab of FOUNDER_TABS) {
    test(`founder tab ${tab} loads without horizontal scroll at 375px`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 900 })
      await page.goto('/founder', { waitUntil: 'networkidle' })
      await page
        .getByRole('navigation', { name: 'Founder sections' })
        .getByRole('button', { name: tab, exact: true })
        .click()
      await assertNoHorizontalScroll(page)
    })
  }

  test('founder country filter changes overview total users', async ({ page }) => {
    await page.route('**/rest/v1/rpc/founder_analytics_overview**', async (route) => {
      let country: string | null = null
      try {
        const body = route.request().postDataJSON() as { p_country?: string | null }
        country = body?.p_country ?? null
      } catch {
        country = null
      }
      await route.fulfill({
        json: {
          total_users: country === 'ZA' ? 7 : 100,
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
          signups_series: [],
          dau_series: [],
        },
      })
    })
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('metric-total-users')).toContainText('100')
    await page.getByLabel('Country (optional)').fill('ZA')
    await expect(page.getByTestId('metric-total-users')).toContainText('7', { timeout: 20_000 })
  })

  test('founder export retention CSV has header row', async ({ page }) => {
    await page.route('**/rest/v1/rpc/founder_analytics_export**', async (route) => {
      await route.fulfill({
        json: {
          section: 'retention',
          rows: [{ day1_rate: 0.2, day7_rate: 0.3, cohort_signups: 10 }],
          row_count: 1,
        },
      })
    })
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Retention' }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('analytics-export').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/retention/)
    const text = await download.createReadStream().then(async (stream) => {
      const chunks: Buffer[] = []
      for await (const chunk of stream) chunks.push(Buffer.from(chunk))
      return Buffer.concat(chunks).toString('utf8')
    })
    expect(text.split('\n')[0]).toContain('day1_rate')
  })
})

test.describe('creator dashboard 17B', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    setE2eOwnProfileRole('writer')
    installCreatorDashboardMocks(page)
  })

  for (const width of LAYOUT_WIDTHS) {
    test(`creator layout at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/creator', { waitUntil: 'networkidle' })
      await assertNoHorizontalScroll(page)
    })
  }

  test('creator axe at 375 and 1280 on overview', async ({ page }) => {
    for (const width of [375, 1280] as const) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/creator', { waitUntil: 'networkidle' })
      await axeSerious(page, '[data-testid="creator-dashboard"]')
    }
  })

  test('creator top posts time filter refetches', async ({ page }) => {
    let lastWindow = ''
    await page.route('**/rest/v1/rpc/get_creator_dashboard_top_posts**', async (route) => {
      try {
        const body = route.request().postDataJSON() as { p_window?: string }
        lastWindow = body?.p_window ?? ''
      } catch {
        lastWindow = ''
      }
      await route.fulfill({ json: { posts: [{ id: '1', title: `Window ${lastWindow}`, views: 1 }] } })
    })
    await page.goto('/creator', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Top posts' }).click()
    await page.getByRole('button', { name: '7 days' }).click()
    await expect(page.getByText('Window 7')).toBeVisible()
    await page.getByRole('button', { name: 'All time' }).click()
    await expect(page.getByText('Window all')).toBeVisible()
  })

  test('creator WIP shows publish button', async ({ page }) => {
    await page.route('**/rest/v1/rpc/get_creator_dashboard_wip**', async (route) => {
      await route.fulfill({
        json: {
          drafts: [{ id: 'd1', title: 'Draft one', type: 'poem', updated_at: '2026-01-01' }],
          unpublished_books: [],
        },
      })
    })
    await page.goto('/creator', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Work in progress' }).click()
    await expect(page.getByRole('link', { name: 'Publish' })).toBeVisible()
  })

  test('creator audience list renders', async ({ page }) => {
    await page.route('**/rest/v1/rpc/get_creator_dashboard_audience**', async (route) => {
      await route.fulfill({
        json: {
          returning_readers: 4,
          returning_readers_note: 'Readers with repeat views',
          top_engaged_followers: [
            { user_id: '1', username: 'fanone', display_name: 'Fan One', engagement: 12 },
          ],
        },
      })
    })
    await page.goto('/creator', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Audience' }).click()
    await expect(page.getByText('Fan One')).toBeVisible()
  })

  test('reader redirected from creator dashboard', async ({ page }) => {
    setE2eOwnProfileRole('reader')
    await page.goto('/creator', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\//)
  })
})
