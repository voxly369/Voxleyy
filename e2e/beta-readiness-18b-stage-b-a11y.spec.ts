import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'
import { setE2eOnboardingComplete } from './betaReadiness18bMocks.ts'
import { setE2eConsentsCurrent } from './preBetaMocks.ts'

for (const width of [375, 1280]) {
  test.describe(`stage B a11y ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await installSupabaseMocks(page)
      setE2eOnboardingComplete()
      setE2eConsentsCurrent()
      await seedSignedInSession(page)
    })

    test(`country page axe at ${width}px`, async ({ page }) => {
      await page.goto('/country/ZA', { waitUntil: 'networkidle' })
      const results = await new AxeBuilder({ page })
        .include('[data-testid="country-page"]')
        .disableRules(['page-has-heading-one', 'color-contrast'])
        .analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious, `country-${width}`).toEqual([])
    })

    test(`browse countries axe at ${width}px`, async ({ page }) => {
      await page.goto('/discover/countries', { waitUntil: 'networkidle' })
      const results = await new AxeBuilder({ page })
        .include('[data-testid="browse-countries-page"]')
        .disableRules(['page-has-heading-one', 'color-contrast'])
        .analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious, `browse-countries-${width}`).toEqual([])
    })

    test(`feedback modal axe at ${width}px`, async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'networkidle' })
      await page.getByTestId('settings-send-feedback').click()
      const results = await new AxeBuilder({ page })
        .include('[data-testid="feedback-modal"]')
        .disableRules(['page-has-heading-one', 'color-contrast'])
        .analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious, `feedback-modal-${width}`).toEqual([])
    })
  })
}
