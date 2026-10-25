import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'
import { setE2eOnboardingComplete } from './betaReadiness18bMocks.ts'
import { setE2eConsentsCurrent } from './preBetaMocks.ts'

const DRAFT_ID = '00000000-0000-0000-0000-0000000000d1'

for (const width of [375, 1280]) {
  test.describe(`stage C a11y ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await installSupabaseMocks(page)
      setE2eOnboardingComplete()
      setE2eConsentsCurrent()
      await seedSignedInSession(page)
    })

    test(`language picker axe at ${width}px`, async ({ page }) => {
      await page.goto(`/create/${DRAFT_ID}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled({ timeout: 15_000 })
      await page.getByRole('button', { name: 'Publish' }).click()
      await expect(page.getByTestId('publish-language-picker')).toBeVisible()
      const results = await new AxeBuilder({ page })
        .include('[data-testid="publish-language-picker-search"]')
        .disableRules(['page-has-heading-one', 'color-contrast'])
        .analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious, `language-picker-${width}`).toEqual([])
    })

    test(`discover language filter chips axe at ${width}px`, async ({ page }) => {
      await page.goto('/discover/browse?sort=trending', { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('discover-language-filters')).toBeVisible()
      const results = await new AxeBuilder({ page })
        .include('[data-testid="discover-language-filters"]')
        .disableRules(['page-has-heading-one', 'color-contrast'])
        .analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious, `language-filters-${width}`).toEqual([])
    })
  })
}
