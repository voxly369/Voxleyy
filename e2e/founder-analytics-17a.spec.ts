import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, setE2eOwnProfileRole, setModerationIsFounder } from './fixtures.ts'
import { installFounderAnalyticsMocks, installCreatorDashboardMocks } from './founderAnalyticsMocks.ts'

test.describe('founder analytics 17A', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    installFounderAnalyticsMocks(page)
    setModerationIsFounder(true)
  })

  test('founder opens overview retention and exports CSV', async ({ page }) => {
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('founder-analytics-overview')).toBeVisible()
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('analytics-export').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/voxly-founder-overview/)
    await page.getByRole('button', { name: 'Retention' }).click()
    await expect(page.getByTestId('founder-analytics-retention')).toBeVisible()
    await page.getByTestId('analytics-refresh').click()
  })

  test('non-founder cannot load founder analytics RPC', async ({ page }) => {
    setModerationIsFounder(false)
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\//)
  })
})

test.describe('creator dashboard 17A', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    setE2eOwnProfileRole('writer')
    installCreatorDashboardMocks(page)
  })

  test('writer opens creator dashboard', async ({ page }) => {
    await page.goto('/creator', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/creator/)
    await expect(page.getByRole('heading', { name: 'Creator dashboard' })).toBeVisible()
    await expect(page.getByTestId('creator-dashboard')).toBeVisible()
    await expect(page.getByTestId('creator-subscriptions-placeholder')).toBeVisible()
  })

  test('reader redirected from creator dashboard', async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    setE2eOwnProfileRole('reader')
    await page.goto('/creator', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\//)
  })
})
