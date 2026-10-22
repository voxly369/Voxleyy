import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { installSupabaseMocks, seedSignedInSession, OTHER } from './fixtures.ts'

test.describe('badges streaks 14A a11y', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
  })

  test('badge shelf and badges page pass axe', async ({ page }) => {
    await page.goto(`/u/${OTHER.username}`, { waitUntil: 'networkidle' })
    let results = await new AxeBuilder({ page }).include('[data-testid="badge-shelf"]').analyze()
    expect(results.violations).toEqual([])

    await page.goto(`/u/${OTHER.username}/badges`, { waitUntil: 'networkidle' })
    results = await new AxeBuilder({ page }).include('[data-testid="profile-badges-page"]').analyze()
    expect(results.violations).toEqual([])
  })
})
