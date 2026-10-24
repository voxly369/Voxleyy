import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, setModerationIsFounder } from './fixtures.ts'
import { setE2eBetaSignupConfig } from './preBetaMocks.ts'

test.describe('pre-beta 16A', () => {
  test('legal pages show draft notice', async ({ page }) => {
    await installSupabaseMocks(page)
    for (const path of ['/terms', '/privacy', '/community-guidelines', '/copyright', '/contact']) {
      await page.goto(path, { waitUntil: 'networkidle' })
      await expect(page.getByTestId('legal-draft-notice')).toBeVisible()
    }
  })

  test('signup invite-only shows invite field', async ({ page }) => {
    await installSupabaseMocks(page)
    setE2eBetaSignupConfig({ signups_open: true, invite_only: true })
    await page.goto('/signup', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('signup-invite-code')).toBeVisible()
    await expect(page.getByTestId('signup-closed-beta-note')).toBeVisible()
  })

  test('closed signups show waitlist when enabled', async ({ page }) => {
    await installSupabaseMocks(page)
    setE2eBetaSignupConfig({ signups_open: false, waitlist_open: true })
    await page.goto('/signup', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('signup-closed')).toBeVisible()
    await expect(page.getByTestId('signup-waitlist-submit')).toBeVisible()
  })

  test('settings about links and data actions', async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('settings-about')).toBeVisible()
    await expect(page.getByTestId('settings-app-version')).not.toBeEmpty()
    await expect(page.getByTestId('settings-download-data')).toBeVisible()
    await page.getByTestId('settings-delete-account').click()
    await expect(page.getByTestId('delete-account-modal')).toBeVisible()
  })

  test('founder beta and errors tabs', async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    setModerationIsFounder(true)
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Beta' }).click()
    await expect(page.getByTestId('founder-beta-tab')).toBeVisible()
    await page.getByRole('button', { name: 'Errors' }).click()
    await expect(page.getByTestId('founder-errors-tab')).toBeVisible()
  })

  test('static health file', async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/health`)
    expect(response.ok()).toBeTruthy()
    const json = await response.json()
    expect(json.status).toBe('ok')
  })
})
