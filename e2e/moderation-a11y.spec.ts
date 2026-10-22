import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'

async function expectNoSeriousViolations(page: import('@playwright/test').Page, context: string) {
  const results = await new AxeBuilder({ page })
    .disableRules(['page-has-heading-one', 'color-contrast'])
    .analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious, `${context}: ${JSON.stringify(serious, null, 2)}`).toEqual([])
}

for (const width of [375, 1280]) {
  test.describe(`moderation accessibility ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 900 })
      await installSupabaseMocks(page)
      await seedSignedInSession(page)
    })

    test(`settings safety section at ${width}px`, async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'networkidle' })
      await expectNoSeriousViolations(page, 'settings safety')
    })

    test(`report sheet at ${width}px`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.getByTestId('safety-overflow-menu-trigger').first().click()
      await page.getByRole('menuitem', { name: 'Report' }).click()
      await expectNoSeriousViolations(page, 'report sheet')
    })
  })
}
