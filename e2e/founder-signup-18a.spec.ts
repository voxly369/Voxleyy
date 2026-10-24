import { test, expect } from '@playwright/test'
import { installSupabaseMocks } from './fixtures.ts'
import { setE2eBetaSignupConfig } from './preBetaMocks.ts'
import { FOUNDER_SIGNUP_EMAIL } from '../src/lib/beta/founderSignup.ts'

test.describe('founder signup 18A', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    setE2eBetaSignupConfig({ signups_open: false, invite_only: true, waitlist_open: true })
  })

  test('founder email shows signup form without invite while signups closed', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('signup-closed')).toBeVisible()
    await page.getByLabel('Email for waitlist').fill(FOUNDER_SIGNUP_EMAIL)
    await expect(page.getByTestId('signup-form')).toBeVisible()
    await expect(page.getByTestId('signup-invite-code')).toHaveCount(0)
  })

  test('founder can submit signup without invite code', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'networkidle' })
    await page.getByLabel('Email for waitlist').fill(FOUNDER_SIGNUP_EMAIL)
    await page.getByLabel('Email', { exact: true }).fill(FOUNDER_SIGNUP_EMAIL)
    await page.getByLabel('Display name').fill('Founder E2E')
    await page.getByTestId('signup-country-search').fill('South Africa')
    await page.getByTestId('signup-country-select').selectOption({ value: 'ZA' })
    await page.getByLabel('Username').fill('foundere2e')
    await page.getByLabel('Password', { exact: true }).fill('ValidPass123!')
    await page.getByLabel('Confirm password').fill('ValidPass123!')
    await page.getByTestId('signup-age-consent').check()
    await page.getByTestId('signup-consent').check()
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).not.toHaveURL(/\/signup$/, { timeout: 20_000 })
  })

  test('normal email without invite stays on signup with generic closed state', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('signup-closed')).toBeVisible()
    await page.getByLabel('Email for waitlist').fill('reader@test.example')
    await expect(page.getByTestId('signup-form')).toHaveCount(0)
    await expect(page.getByTestId('signup-waitlist-submit')).toBeVisible()
  })

  test('normal email with signups open requires invite code', async ({ page }) => {
    setE2eBetaSignupConfig({ signups_open: true, invite_only: true })
    await page.goto('/signup', { waitUntil: 'networkidle' })
    await page.getByLabel('Email').fill('reader@test.example')
    await page.getByLabel('Display name').fill('Reader Test')
    await page.getByTestId('signup-country-search').fill('South Africa')
    await page.getByTestId('signup-country-select').selectOption({ value: 'ZA' })
    await page.getByLabel('Username').fill('readerabc')
    await page.getByLabel('Password', { exact: true }).fill('ValidPass123!')
    await page.getByLabel('Confirm password').fill('ValidPass123!')
    await page.getByTestId('signup-age-consent').check()
    await page.getByTestId('signup-consent').check()
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Enter your beta invite code.')).toBeVisible()
  })
})
