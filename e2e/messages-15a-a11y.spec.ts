import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { E2E_CONVERSATION_ID, installSupabaseMocks, seedSignedInSession } from './fixtures.ts'

async function expectNoSeriousViolations(page: import('@playwright/test').Page, context: string) {
  const results = await new AxeBuilder({ page })
    .include('#main')
    .disableRules(['page-has-heading-one', 'color-contrast'])
    .analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious, `${context}: ${JSON.stringify(serious, null, 2)}`).toEqual([])
}

for (const width of [375, 768, 1280]) {
  test.describe(`messages 15A a11y ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 900 })
      await installSupabaseMocks(page)
      await seedSignedInSession(page)
    })

    test(`messages list at ${width}px`, async ({ page }) => {
      await page.goto('/messages', { waitUntil: 'networkidle' })
      await expectNoSeriousViolations(page, 'messages list')
    })

    test(`messages thread at ${width}px`, async ({ page }) => {
      await page.goto(`/messages/${E2E_CONVERSATION_ID}`, { waitUntil: 'networkidle' })
      await expectNoSeriousViolations(page, 'messages thread')
    })
  })
}
