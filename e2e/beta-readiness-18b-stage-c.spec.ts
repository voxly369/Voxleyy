import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'
import { setE2eOnboardingComplete } from './betaReadiness18bMocks.ts'
import { setE2eConsentsCurrent } from './preBetaMocks.ts'

const DRAFT_ID = '00000000-0000-0000-0000-0000000000d1'

test.describe('beta readiness 18B stage C', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    setE2eOnboardingComplete()
    setE2eConsentsCurrent()
    await seedSignedInSession(page)
  })

  test('browse filters by language chips', async ({ page }) => {
    await page.goto('/discover/browse?sort=trending', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('discover-language-filters')).toBeVisible()
    await page.getByRole('tab', { name: /Afrikaans/i }).click()
    await expect(page).toHaveURL(/languages=af/)
  })

  test('publish sheet includes language picker', async ({ page }) => {
    await page.goto(`/create/${DRAFT_ID}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByTestId('publish-language-picker')).toBeVisible()
  })

  test('profile shows post languages when RPC returns codes', async ({ page }) => {
    await page.goto('/u/readerone', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('profile-post-languages')).toBeVisible()
  })

  test('country local time hidden when show local time is off', async ({ page }) => {
    await page.goto('/country/ZA', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('country-page')).toBeVisible()
    await expect(page.getByTestId('country-local-time')).toHaveCount(0)
  })

  test('country with no writers shows honest empty state', async ({ page }) => {
    await page.goto('/country/AQ', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('country-no-writers')).toBeVisible()
  })

  test('discover rising writer card links country via CountryLink', async ({ page }) => {
    await page.goto('/discover', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('discover-rising-writer-country-link').first()).toBeVisible()
    await page.getByTestId('discover-rising-writer-country-link').first().click()
    await expect(page).toHaveURL(/\/country\/ZA/)
  })

  test('search writer row links country via CountryLink', async ({ page }) => {
    await page.goto('/discover/search?q=writer', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('search-writer-country-link').first()).toBeVisible()
  })

  test('follow list entry links country via CountryLink', async ({ page }) => {
    await page.goto('/u/readerone/following', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('follow-list-country-link').first()).toBeVisible()
  })
})
