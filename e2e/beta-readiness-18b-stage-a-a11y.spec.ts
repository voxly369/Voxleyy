import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { installSupabaseMocks, seedSignedInSession, setModerationIsFounder } from './fixtures.ts'
import { setE2eBetaSignupConfig } from './preBetaMocks.ts'
import { setE2eOnboardingComplete } from './betaReadiness18bMocks.ts'
import { installFounderAnalyticsMocks } from './founderAnalyticsMocks.ts'

async function axeMain(page: import('@playwright/test').Page, label: string) {
  const results = await new AxeBuilder({ page })
    .include('main')
    .disableRules(['page-has-heading-one', 'color-contrast'])
    .analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious, `${label}: ${JSON.stringify(serious, null, 2)}`).toEqual([])
}

test.describe('beta readiness 18B stage A a11y', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    setE2eOnboardingComplete()
  })

  for (const width of [375, 1280]) {
    test(`settings data and delete modal axe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await seedSignedInSession(page)
      await page.goto('/settings', { waitUntil: 'networkidle' })
      await axeMain(page, `settings-${width}`)
      await page.getByTestId('settings-delete-account').click()
      await axeMain(page, `delete-modal-${width}`)
    })

    test(`feedback modal axe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await seedSignedInSession(page)
      await page.goto('/settings', { waitUntil: 'networkidle' })
      await page.getByTestId('settings-send-feedback').click()
      const results = await new AxeBuilder({ page })
        .include('[data-testid="feedback-modal"]')
        .disableRules(['page-has-heading-one', 'color-contrast'])
        .analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious, `feedback-${width}`).toEqual([])
    })
  }

  test('signup axe at 375 and 1280', async ({ page }) => {
    setE2eBetaSignupConfig({ signups_open: true, invite_only: false })
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/signup', { waitUntil: 'networkidle' })
      const results = await new AxeBuilder({ page })
        .include('[data-testid="signup-form"]')
        .disableRules(['page-has-heading-one', 'color-contrast'])
        .analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious, `signup-${width}`).toEqual([])
    }
  })

  for (const width of [375, 1280]) {
    test(`check-email axe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/check-email', { waitUntil: 'networkidle' })
      await page.evaluate(() => {
        window.history.replaceState({ usr: { email: 'pending@example.com' } }, '', '/check-email')
      })
      await page.reload({ waitUntil: 'networkidle' })
      await axeMain(page, `check-email-${width}`)
    })

    test(`auth confirm expired axe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/auth/confirm?error=access_denied&error_code=otp_expired', { waitUntil: 'networkidle' })
      await axeMain(page, `auth-confirm-expired-${width}`)
    })
  }

  test('founder Beta Errors Feedback Quotes axe at 375 and 1280', async ({ page }) => {
    installFounderAnalyticsMocks(page)
    setModerationIsFounder(true)
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await seedSignedInSession(page)
      await page.goto('/founder', { waitUntil: 'networkidle' })
      const nav = page.getByRole('navigation', { name: 'Founder sections' })
      for (const tab of ['Beta', 'Errors', 'Feedback', 'Quotes'] as const) {
        const tabButton =
          tab === 'Feedback'
            ? page.getByTestId('founder-tab-feedback')
            : nav.getByRole('button', { name: tab, exact: true })
        await tabButton.scrollIntoViewIfNeeded()
        await tabButton.click()
        const testId =
          tab === 'Beta'
            ? 'founder-beta-tab'
            : tab === 'Errors'
              ? 'founder-errors-tab'
              : tab === 'Feedback'
                ? 'founder-feedback-tab'
                : 'founder-quotes-tab'
        await expect(page.getByTestId(testId)).toBeVisible()
        const results = await new AxeBuilder({ page })
          .include(`[data-testid="${testId}"]`)
          .disableRules(['page-has-heading-one', 'color-contrast'])
          .analyze()
        const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
        expect(serious, `founder-${tab}-${width}`).toEqual([])
      }
    }
  })
})
