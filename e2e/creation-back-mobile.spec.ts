import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, SAMPLE_CREATION_ID } from './fixtures.ts'

test('post page shows mobile back control', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seedSignedInSession(page)
  await installSupabaseMocks(page)
  await page.goto(`/c/${SAMPLE_CREATION_ID}`)
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
})
