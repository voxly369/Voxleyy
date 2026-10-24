import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'

for (const width of [375, 768, 1280]) {
  test.describe(`pre-beta 16A layout ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 900 })
      await installSupabaseMocks(page)
      await seedSignedInSession(page)
    })

    test(`settings about section at ${width}px`, async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'networkidle' })
      await expect(page.getByTestId('settings-about')).toBeVisible()
      await expect(page.getByTestId('settings-data-section')).toBeVisible()
    })

    test(`community guidelines at ${width}px`, async ({ page }) => {
      await page.goto('/community-guidelines', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: /Community Guidelines/i })).toBeVisible()
    })
  })
}
