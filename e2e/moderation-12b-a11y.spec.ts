import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  installSupabaseMocks,
  seedSignedInSession,
  setE2eOwnRemovedCreation,
  setModerationIsFounder,
  setModerationUnseenWarnings,
  SAMPLE_CREATION_ID,
  gotoFounderReportQueue,
} from './fixtures.ts'

async function expectNoSeriousViolations(page: import('@playwright/test').Page, context: string) {
  const results = await new AxeBuilder({ page })
    .disableRules(['page-has-heading-one', 'color-contrast'])
    .analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious, `${context}: ${JSON.stringify(serious, null, 2)}`).toEqual([])
}

for (const width of [375, 1280]) {
  test.describe(`moderation 12B a11y ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 900 })
      await installSupabaseMocks(page)
      await seedSignedInSession(page)
    })

    test(`warning modal at ${width}px`, async ({ page }) => {
      setModerationUnseenWarnings([{ id: 'w1', message: 'Warning text' }])
      await page.goto('/', { waitUntil: 'networkidle' })
      await expectNoSeriousViolations(page, 'warning modal')
    })

    test(`removed notice at ${width}px`, async ({ page }) => {
      setE2eOwnRemovedCreation()
      await page.goto(`/c/${SAMPLE_CREATION_ID}`, { waitUntil: 'networkidle' })
      await expectNoSeriousViolations(page, 'removed notice')
    })

    test(`my reports at ${width}px`, async ({ page }) => {
      await page.goto('/settings/reports', { waitUntil: 'networkidle' })
      await expectNoSeriousViolations(page, 'my reports')
    })

    test(`founder queue modal at ${width}px`, async ({ page }) => {
      setModerationIsFounder(true)
      await gotoFounderReportQueue(page)
      await page.getByRole('button', { name: 'Dismiss' }).first().click()
      await expectNoSeriousViolations(page, 'founder reason modal')
    })

    test(`founder tabs at ${width}px`, async ({ page }) => {
      setModerationIsFounder(true)
      await page.goto('/founder', { waitUntil: 'networkidle' })
      for (const tab of ['Users', 'Content', 'Appeals', 'Audit log']) {
        await page.getByRole('button', { name: tab, exact: true }).click()
        await expectNoSeriousViolations(page, `founder ${tab}`)
      }
    })
  })
}
