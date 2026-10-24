import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  setE2eBetaAccessGranted,
  setE2eInviteOnlyPlatform,
} from './fixtures.ts'

const WIDTHS = [375, 767, 768, 1024, 1279, 1280, 1440]

for (const width of WIDTHS) {
  test.describe(`pre-beta 16B invite gate layout ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: width <= 767 ? 812 : 900 })
      await installSupabaseMocks(page)
      await seedSignedInSession(page)
      setE2eInviteOnlyPlatform(true)
      setE2eBetaAccessGranted(false)
    })

    test(`invite gate at ${width}px`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' })
      await expect(page.getByTestId('invite-gate')).toBeVisible()
      await expect(page.getByTestId('invite-gate-code')).toBeVisible()
    })

    test(`terms legal page at ${width}px`, async ({ page }) => {
      await page.goto('/terms', { waitUntil: 'networkidle' })
      await expect(page.getByTestId('legal-draft-notice')).toBeVisible()
      await expect(page.getByRole('heading', { name: /Terms/i })).toBeVisible()
    })

    test(`privacy legal page at ${width}px`, async ({ page }) => {
      await page.goto('/privacy', { waitUntil: 'networkidle' })
      await expect(page.getByTestId('legal-draft-notice')).toBeVisible()
    })
  })
}
