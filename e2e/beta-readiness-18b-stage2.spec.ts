import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'
import {
  setE2eEntranceVisible,
  setE2eOnboardingComplete,
  setE2eOnboardingForEntranceE2e,
  setE2eOnboardingIncomplete,
} from './betaReadiness18bMocks.ts'

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
    await expect(page.getByTestId('entrance-step-inside')).toBeVisible()
  })

  test('entrance screen step inside dismisses overlay', async ({ page }) => {
    setE2eOnboardingComplete()
    setE2eEntranceVisible(true)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
    await page.getByTestId('entrance-step-inside').click()
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
    await expect(page.getByTestId('onboarding-step-label')).toContainText('Step 2 of 7')
  })

  test('onboarding complete via finish on last step', async ({ page }) => {
    setE2eEntranceVisible(false)
    setE2eOnboardingIncomplete(6)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('onboarding-flow')).toBeVisible()
    await expect(page.getByTestId('onboarding-step-label')).toContainText('Step 7 of 7')
    await page.getByTestId('onboarding-finish').click()
    await expect(page.getByTestId('onboarding-flow')).toHaveCount(0)
    await expect(page.getByTestId('home-greeting')).toBeVisible()
  })

  test('onboarding resume at saved step after reload', async ({ page }) => {
    setE2eEntranceVisible(false)
    setE2eOnboardingIncomplete(3)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('onboarding-step-label')).toContainText('Step 4 of 7')
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByTestId('onboarding-step-label')).toContainText('Step 4 of 7')
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
