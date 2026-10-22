import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, OTHER } from './fixtures.ts'

test.describe('badges streaks 14A layout', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
  })

  test('profile tab bar scrolls horizontally without visible scrollbar class', async ({ page }) => {
    await page.goto(`/u/${OTHER.username}`, { waitUntil: 'networkidle' })
    const tablist = page.getByTestId('profile-tab-bar')
    await expect(tablist).toHaveClass(/scrollbar-hide/)
  })
})
