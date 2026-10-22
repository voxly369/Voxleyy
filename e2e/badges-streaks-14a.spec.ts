import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, OTHER, READER } from './fixtures.ts'
import { setE2eAnalyticsEmpty } from './badgeMocks.ts'

test.describe('badges streaks 14A', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
  })

  test('profile shows badge shelf and streak chips', async ({ page }) => {
    await page.goto(`/u/${OTHER.username}`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('badge-shelf')).toBeVisible()
    await expect(page.getByTestId('profile-streak-chips')).toBeVisible()
    await expect(page.getByTestId('profile-tab-bar')).toBeVisible()
  })

  test('badges page lists progress', async ({ page }) => {
    await page.goto(`/u/${OTHER.username}/badges`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('profile-badges-page')).toBeVisible()
    await expect(page.getByText('Poet')).toBeVisible()
  })

  test('own writer profile analytics tab', async ({ page }) => {
    await page.goto(`/u/${READER.username}`, { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: 'Analytics' }).click()
    await expect(page.getByTestId('profile-analytics-tab')).toBeVisible()
    await expect(page.getByTestId('analytics-chart')).toBeVisible()
  })

  test('analytics empty state', async ({ page }) => {
    setE2eAnalyticsEmpty()
    await page.goto(`/u/${READER.username}`, { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: 'Analytics' }).click()
    await expect(page.getByText(/No analytics yet/i)).toBeVisible()
  })

  test('feed post shows badge icons beside author', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('badge-row-on-name').first()).toBeVisible()
  })
})
