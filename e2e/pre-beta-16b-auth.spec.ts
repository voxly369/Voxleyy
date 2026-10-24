import { test, expect } from '@playwright/test'
import { installSupabaseMocks, setE2ePasswordSignInError, setE2eResendRateLimitAfterFirstSuccess } from './fixtures.ts'

test.describe('pre-beta 16B auth', () => {
  test('login shows mapped auth error', async ({ page }) => {
    await installSupabaseMocks(page)
    setE2ePasswordSignInError('invalid_credentials')
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.getByLabel('Email').fill('reader@example.com')
    await page.getByLabel('Password', { exact: true }).fill('wrong-password-123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toContainText('Check your details')
  })

  test('forgot password reset cooldown after send', async ({ page }) => {
    await installSupabaseMocks(page)
    await page.goto('/forgot-password', { waitUntil: 'networkidle' })
    await page.getByLabel('Email').fill('reader@example.com')
    await page.getByRole('button', { name: 'Send instructions' }).click()
    await expect(page.getByRole('status')).toContainText('If that email is registered')
    await expect(page.getByRole('button', { name: /Wait \d+s/ })).toBeVisible()
  })
})
