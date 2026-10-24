import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'

async function expectNoSeriousViolations(page: import('@playwright/test').Page, context: string) {
  const results = await new AxeBuilder({ page })
    .include('main')
    .disableRules(['page-has-heading-one', 'color-contrast'])
    .analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious, `${context}: ${JSON.stringify(serious, null, 2)}`).toEqual([])
}

test.describe('pre-beta 16A a11y', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
  })

  test('settings page', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await expectNoSeriousViolations(page, 'settings')
  })

  test('terms page', async ({ page }) => {
    await page.goto('/terms', { waitUntil: 'networkidle' })
    await expectNoSeriousViolations(page, 'terms')
  })
})
