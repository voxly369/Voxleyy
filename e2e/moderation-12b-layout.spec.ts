import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, setModerationIsFounder } from './fixtures.ts'

const WIDTHS = [375, 767, 768, 1024, 1279, 1280, 1440]

for (const width of WIDTHS) {
  test(`safety settings layout ${width}px`, async ({ page }) => {
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

  test(`founder dashboard layout ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    setModerationIsFounder(true)
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('founder-report-queue')).toBeVisible()
    const nav = page.getByRole('navigation', { name: 'Founder sections' })
    const box = await nav.boundingBox()
    expect(box).toBeTruthy()
    if (box) expect(box.width).toBeLessThanOrEqual(width)
  })
}
