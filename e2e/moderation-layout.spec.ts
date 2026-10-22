import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'

for (const width of [375, 768, 1280]) {
  test(`moderation settings layout ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    const section = page.getByTestId('safety-settings')
    await expect(section).toBeVisible()
    const box = await section.boundingBox()
    expect(box).toBeTruthy()
    if (box) expect(box.width).toBeLessThanOrEqual(width)
  })
}
