import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'

const WIDTHS = [375, 767, 768, 1024, 1279, 1280, 1440] as const

for (const width of WIDTHS) {
  test(`notifications layout ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await installSupabaseMocks(page)
    await seedSignedInSession(page)

    await page.goto('/', { waitUntil: 'networkidle' })
    const mobile = width < 768
    const bell = page.getByTestId(mobile ? 'notification-bell-mobile' : 'notification-bell-rail')
    await expect(bell).toBeVisible()

    const bellBox = await bell.boundingBox()
    expect(bellBox).not.toBeNull()
    if (mobile) {
      const bottomNav = page.getByTestId('bottom-nav')
      const navBox = await bottomNav.boundingBox()
      expect(navBox).not.toBeNull()
      expect(bellBox!.y + bellBox!.height).toBeLessThan(navBox!.y)
    } else {
      const rail = page.getByTestId('nav-rail')
      const railBox = await rail.boundingBox()
      expect(railBox).not.toBeNull()
      expect(bellBox!.x).toBeGreaterThanOrEqual(railBox!.x)
      expect(bellBox!.x + bellBox!.width).toBeLessThanOrEqual(railBox!.x + railBox!.width + 2)
    }

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(width + 1)

    await bell.click()
    await expect(page.getByRole('heading', { name: /Notifications/i })).toBeVisible()
    if (mobile) {
      await expect(page.locator('[role="dialog"]')).toBeVisible()
    } else {
      await expect(page.getByTestId('notification-panel')).toBeVisible()
    }

    await page.goto('/notifications', { waitUntil: 'networkidle' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1)

    await page.goto('/settings/notifications', { waitUntil: 'networkidle' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1)
  })
}
