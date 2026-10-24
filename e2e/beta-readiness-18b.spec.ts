import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, READER } from './fixtures.ts'
import { setE2eOnboardingComplete, setE2eOnboardingIncomplete } from './betaReadiness18bMocks.ts'

test.describe('beta readiness 18B', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    setE2eOnboardingComplete()
  })

  test('home greeting and checklist', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('home-greeting')).toBeVisible()
    await expect(page.getByTestId('home-daily-prompt')).toBeVisible()
  })

  test('feedback modal submits', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.getByTestId('settings-send-feedback').click()
    await expect(page.getByTestId('feedback-modal')).toBeVisible()
    await page.getByTestId('feedback-message').fill('This is helpful feedback for the Founder team.')
    await page.getByTestId('feedback-submit').click()
    await expect(page.getByText('Thank you, the Founder will read this.')).toBeVisible()
  })

  test('founder badge beside name on feed', async ({ page }) => {
    await page.goto(`/u/${READER.username}`, { waitUntil: 'networkidle' })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('badge-row-on-name').first()).toBeVisible()
  })
})
