import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'

const WIDTHS = [375, 768, 1280] as const

for (const width of WIDTHS) {
  test(`notification bell and panel layout ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    await page.goto('/', { waitUntil: 'networkidle' })
    const bell = page.getByTestId(width < 768 ? 'notification-bell-mobile' : 'notification-bell-rail')
    await expect(bell).toBeVisible()
    const box = await bell.boundingBox()
    expect(box).not.toBeNull()
    if (width < 768) {
      expect(box!.x + box!.width / 2).toBeGreaterThan(width / 2)
    }
    await bell.click()
    await expect(page.getByRole('heading', { name: /Notifications/i })).toBeVisible()
  })
}
