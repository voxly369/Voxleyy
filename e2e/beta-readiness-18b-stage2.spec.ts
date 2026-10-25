import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'
import {
  setE2eEntranceVisible,
  setE2eOnboardingComplete,
  setE2eOnboardingForEntranceE2e,
  setE2eOnboardingIncomplete,
  setE2eQuoteOfDayBroken,
} from './betaReadiness18bMocks.ts'
const SIGNATURE_QUOTE_TEXT = 'The sky is not the limit, you limit yourself to the sky.'

async function expectNoSeriousViolations(
  page: import('@playwright/test').Page,
  context: string,
  include: string,
) {
  const results = await new AxeBuilder({ page })
    .include(include)
    .disableRules(['page-has-heading-one', 'color-contrast'])
    .analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious, `${context}: ${JSON.stringify(serious, null, 2)}`).toEqual([])
}

test.describe('beta readiness 18B stage 2', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await page.addInitScript(() => {
      localStorage.removeItem('voxly-last-visit-v1')
    })
    await seedSignedInSession(page)
  })

  test('entrance screen visible on first visit', async ({ page }) => {
    setE2eOnboardingComplete()
    setE2eEntranceVisible(true)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
    await expect(page.getByTestId('entrance-step-inside')).toBeAttached()
    await expect(page.getByTestId('entrance-enter-button')).toBeVisible()
  })

  test('entrance screen step inside dismisses overlay', async ({ page }) => {
    setE2eOnboardingComplete()
    setE2eEntranceVisible(true)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
    await page.getByTestId('entrance-enter-button').click()
    await expect(page.getByTestId('entrance-screen')).toHaveCount(0)
  })

  test('entrance write now opens create flow', async ({ page }) => {
    setE2eOnboardingComplete()
    setE2eEntranceVisible(true)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('entrance-write-now')).toBeVisible()
    await page.getByTestId('entrance-write-now').click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('onboarding skip advances flow', async ({ page }) => {
    setE2eEntranceVisible(false)
    setE2eOnboardingForEntranceE2e()
    setE2eOnboardingIncomplete(0)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('onboarding-flow')).toBeVisible()
    await page.getByTestId('onboarding-skip').click()
    await expect(page.getByTestId('onboarding-step-label')).toContainText('Step 2 of 8')
  })

  test('onboarding complete via finish on last step', async ({ page }) => {
    setE2eEntranceVisible(false)
    setE2eOnboardingIncomplete(7)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('onboarding-flow')).toBeVisible()
    await expect(page.getByTestId('onboarding-step-label')).toContainText('Step 8 of 8')
    await page.getByTestId('onboarding-finish').click()
    await expect(page.getByTestId('onboarding-flow')).toHaveCount(0)
    await expect(page.getByTestId('home-greeting')).toBeVisible()
  })

  test('onboarding resume at saved step after reload', async ({ page }) => {
    setE2eEntranceVisible(false)
    setE2eOnboardingIncomplete(3)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('onboarding-step-label')).toContainText('Step 4 of 8')
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByTestId('onboarding-step-label')).toContainText('Step 4 of 8')
  })

  test('settings show entrance toggle', async ({ page }) => {
    setE2eOnboardingComplete()
    setE2eEntranceVisible(false)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('settings-app-version')).toBeVisible()
    const toggle = page.getByTestId('settings-show-entrance')
    await expect(toggle).toBeVisible()
    await toggle.uncheck()
    await expect(toggle).not.toBeChecked()
  })

  test('entrance and home use built-in quote when quote_of_the_day fails', async ({ page }) => {
    setE2eOnboardingComplete()
    setE2eEntranceVisible(false)
    setE2eQuoteOfDayBroken(true)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('home-greeting')).toBeVisible()
    await expect(page.getByTestId('home-daily-quote')).toContainText(SIGNATURE_QUOTE_TEXT)
    setE2eEntranceVisible(true)
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByTestId('entrance-quote')).toContainText(SIGNATURE_QUOTE_TEXT)
  })

  test('home greeting shows country', async ({ page }) => {
    setE2eOnboardingComplete()
    setE2eEntranceVisible(false)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('home-greeting-country')).toBeVisible()
  })

  test('feedback modal submits from settings', async ({ page }) => {
    setE2eOnboardingComplete()
    setE2eEntranceVisible(false)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.getByTestId('settings-send-feedback').click()
    await expect(page.getByTestId('feedback-modal')).toBeVisible()
    await page.getByTestId('feedback-message').fill('This is helpful feedback for the Founder team.')
    await page.getByTestId('feedback-submit').click()
    await expect(page.getByText('Thank you, the Founder will read this.')).toBeVisible()
  })

  test('axe entrance overlay 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    setE2eOnboardingComplete()
    setE2eEntranceVisible(true)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
    await expectNoSeriousViolations(
      page,
      'entrance-375',
      '[data-testid="entrance-screen"]',
    )
  })

  test('axe home greeting 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    setE2eOnboardingComplete()
    setE2eEntranceVisible(false)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('home-greeting')).toBeVisible()
    await expectNoSeriousViolations(page, 'home-1280', '[data-testid="home-greeting"]')
  })
})
