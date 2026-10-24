import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'
import {
  setE2eEntranceVisible,
  setE2eOnboardingComplete,
  setE2eOnboardingForEntranceE2e,
  setE2eOnboardingIncomplete,
} from './betaReadiness18bMocks.ts'

async function expectNoSeriousViolations(page: import('@playwright/test').Page, context: string) {
  const results = await new AxeBuilder({ page })
    .include('[data-testid="entrance-screen"], [data-testid="home-greeting"], main')
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

  test('entrance screen step inside dismisses overlay', async ({ page }) => {
    setE2eOnboardingComplete()
    setE2eEntranceVisible(true)
    const prefs = page.waitForResponse((r) => r.url().includes('get_my_profile_preferences'))
    await page.goto('/', { waitUntil: 'networkidle' })
    await prefs
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
    await page.getByTestId('entrance-step-inside').click()
    await expect(page.getByTestId('entrance-screen')).toHaveCount(0)
  })

  test('entrance write now opens create flow', async ({ page }) => {
    setE2eOnboardingComplete()
    setE2eEntranceVisible(true)
    const prefsWrite = page.waitForResponse((r) => r.url().includes('get_my_profile_preferences'))
    await page.goto('/', { waitUntil: 'networkidle' })
    await prefsWrite
    await expect(page.getByTestId('entrance-write-now')).toBeVisible()
    await page.getByTestId('entrance-write-now').click()
    await expect(page.getByRole('dialog')).toBeVisible()
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
    const prefsHome = page.waitForResponse((r) => r.url().includes('get_my_profile_preferences'))
    await page.goto('/', { waitUntil: 'networkidle' })
    await prefsHome
    await expect(page.getByTestId('home-greeting-country')).toBeVisible()
  })

  test('onboarding can complete from step flow', async ({ page }) => {
    setE2eEntranceVisible(false)
    setE2eOnboardingForEntranceE2e()
    setE2eOnboardingIncomplete(0)
    const prefsOnb = page.waitForResponse((r) => r.url().includes('get_my_profile_preferences'))
    await page.goto('/', { waitUntil: 'networkidle' })
    await prefsOnb
    await expect(page.getByTestId('onboarding-flow')).toBeVisible()
    await page.getByTestId('onboarding-skip').click()
    await expect(page.getByTestId('onboarding-flow')).toHaveCount(0)
  })

  test('axe entrance overlay 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    setE2eOnboardingComplete()
    setE2eEntranceVisible(true)
    const prefs = page.waitForResponse((r) => r.url().includes('get_my_profile_preferences'))
    await page.goto('/', { waitUntil: 'networkidle' })
    await prefs
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
    await expectNoSeriousViolations(page, 'entrance-375')
  })

  test('axe home greeting 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    setE2eOnboardingComplete()
    setE2eEntranceVisible(false)
    const prefsAxe = page.waitForResponse((r) => r.url().includes('get_my_profile_preferences'))
    await page.goto('/', { waitUntil: 'networkidle' })
    await prefsAxe
    await expect(page.getByTestId('home-greeting')).toBeVisible()
    await expectNoSeriousViolations(page, 'home-1280')
  })
})
