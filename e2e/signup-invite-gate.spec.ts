import { test, expect } from '@playwright/test'
import { installSupabaseMocks } from './fixtures.ts'
import { resetPreBetaMocks, setE2eBetaSignupConfig } from './preBetaMocks.ts'

test.describe('sign-up invite gate', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    setE2eBetaSignupConfig({ invite_only: true, signups_open: true })
  })

  test('refuses a .test email with no invite code when invite-only', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('signup-form')).toBeVisible()
    await expect(page.getByTestId('signup-invite-code')).toBeVisible()
    await page.getByLabel('Email').fill('reader@fixture.test')
    await page.getByLabel('Display name').fill('Reader Test')
    await page.getByLabel('Username').fill('reader_fixture')
    await page.getByLabel('Password', { exact: true }).fill('Correct horse battery 1')
    await page.getByLabel('Confirm password').fill('Correct horse battery 1')
    await page.getByTestId('signup-country-search').fill('South Africa')
    await page.getByTestId('signup-country-select').selectOption({ value: 'ZA' })
    await page.getByTestId('signup-age-consent').check()
    await page.getByTestId('signup-consent').check()
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Enter your beta invite code')).toBeVisible()
  })
})
