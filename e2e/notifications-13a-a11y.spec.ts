import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { installSupabaseMocks, seedSignedInSession, setModerationIsFounder } from './fixtures.ts'

async function expectNoSeriousViolations(page: import('@playwright/test').Page, context: string) {
  const results = await new AxeBuilder({ page })
    .include('#main')
    .disableRules(['page-has-heading-one', 'color-contrast'])
    .analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious, `${context}: ${JSON.stringify(serious, null, 2)}`).toEqual([])
}

for (const width of [375, 768, 1280]) {
  test.describe(`notifications 13A a11y ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 900 })
      await installSupabaseMocks(page)
      await seedSignedInSession(page)
    })

    test(`notifications page at ${width}px`, async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'networkidle' })
      await expectNoSeriousViolations(page, 'notifications page')
    })

    test(`notification settings at ${width}px`, async ({ page }) => {
      await page.goto('/settings/notifications', { waitUntil: 'networkidle' })
      await expectNoSeriousViolations(page, 'notification settings')
    })

    test(`notification panel at ${width}px`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.getByTestId(width < 768 ? 'notification-bell-mobile' : 'notification-bell-rail').click()
      await expect(page.getByRole('heading', { name: /Notifications/i })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Mark all read' })).toBeVisible()
    })

    test(`founder admin notifications at ${width}px`, async ({ page }) => {
      setModerationIsFounder(true)
      await page.goto('/notifications', { waitUntil: 'networkidle' })
      await expectNoSeriousViolations(page, 'founder admin notifications')
    })
  })
}
