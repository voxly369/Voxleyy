import { test, expect } from '@playwright/test'
import { installSupabaseMocks, setE2ePasswordSignInError, setE2eResendRateLimitAfterFirstSuccess } from './fixtures.ts'

test.describe('pre-beta 16B auth', () => {
  test('login shows mapped auth error', async ({ page }) => {
    await installSupabaseMocks(page)
    setE2ePasswordSignInError('invalid_credentials')
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.getByLabel('Email').fill('reader@example.com')
    await page.getByLabel('Password').fill('wrong-password-123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toContainText('Check your details')
  })

  test('check email resend cooldown', async ({ page }) => {
    await installSupabaseMocks(page)
    setE2eResendRateLimitAfterFirstSuccess(true)
    await page.addInitScript((email: string) => {
      window.history.replaceState(
        {
          usr: {
            pathname: '/check-email',
            search: '',
            hash: '',
            state: { email },
            key: 'e2e-check-email',
          },
        },
        '',
        '/check-email',
      )
    }, 'reader@example.com')
    await page.goto('/check-email', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Resend link' }).click()
    await expect(page.getByRole('status')).toContainText('We sent another link')
    await expect(page.getByRole('button', { name: /Resend in \d+s/ })).toBeVisible()
  })
})
