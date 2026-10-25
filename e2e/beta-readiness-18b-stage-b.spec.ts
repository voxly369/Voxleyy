import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, setModerationIsFounder } from './fixtures.ts'
import { setE2eOnboardingComplete } from './betaReadiness18bMocks.ts'
import { setE2eConsentsCurrent } from './preBetaMocks.ts'

test.describe('beta readiness 18B stage B', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    setE2eOnboardingComplete()
    setE2eConsentsCurrent()
    await seedSignedInSession(page)
  })

  test('opens country page from profile country link', async ({ page }) => {
    await page.goto('/u/readerone', { waitUntil: 'networkidle' })
    await page.getByTestId('profile-country-link').click()
    await expect(page).toHaveURL(/\/country\/ZA/)
    await expect(page.getByTestId('country-page')).toBeVisible()
    await expect(page.getByTestId('country-trending')).toBeVisible()
  })

  test('opens country page from Discover browse countries', async ({ page }) => {
    await page.goto('/discover', { waitUntil: 'networkidle' })
    await page.getByTestId('discover-browse-countries-link').click()
    await expect(page.getByTestId('browse-countries-page')).toBeVisible()
    await page.getByTestId('browse-countries-row').first().click()
    await expect(page).toHaveURL(/\/country\//)
  })

  test('feedback rate limit shows friendly message', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    for (let i = 0; i < 11; i += 1) {
      if (i > 0) {
        await page.getByTestId('settings-send-feedback').click()
        await expect(page.getByTestId('feedback-modal')).toBeVisible()
      } else {
        await page.getByTestId('settings-send-feedback').click()
      }
      await page.getByTestId('feedback-message').fill(
        i === 0
          ? 'Rate limit check message with enough characters.'
          : `Feedback attempt number ${i + 1} with enough text.`,
      )
      await page.getByTestId('feedback-submit').click()
    }
    await expect(page.getByText('You can send up to 10 pieces of feedback per day.')).toBeVisible()
  })

  test('founder marks feedback done', async ({ page }) => {
    setModerationIsFounder(true)
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await page.getByTestId('founder-tab-feedback').click()
    await expect(page.getByTestId('founder-feedback-tab')).toBeVisible()
    await expect(page.getByTestId('founder-feedback-row')).toHaveCount(1)
    await page.getByTestId('founder-feedback-mark-done').click()
    await expect(page.getByTestId('founder-feedback-mark-done')).toHaveCount(0)
  })
})
