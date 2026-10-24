import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  installSupabaseMocks,
  seedSignedInSession,
  setE2eResendRateLimitAfterFirstSuccess,
  setE2ePasswordSignInError,
  AUTH_STORAGE_KEY,
} from './fixtures.ts'
import { setE2eBetaSignupConfig } from './preBetaMocks.ts'
import { setE2eEntranceVisible, setE2eOnboardingComplete } from './betaReadiness18bMocks.ts'
async function axeInclude(page: import('@playwright/test').Page, include: string, label: string) {
  const results = await new AxeBuilder({ page })
    .include(include)
    .disableRules(['page-has-heading-one', 'color-contrast'])
    .analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious, `${label}: ${JSON.stringify(serious, null, 2)}`).toEqual([])
}

test.describe('beta readiness 18B stage 1', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
  })

  test('join link prefills invite code on signup', async ({ page }) => {
    setE2eBetaSignupConfig({ signups_open: true, invite_only: true })
    await page.goto('/join?code=abcdefghjk', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/signup\?code=/)
    await expect(page.getByTestId('signup-invite-code')).toHaveValue('ABCDEFGHJK')
  })

  test('used-up invite code is rejected on submit', async ({ page }) => {
    setE2eBetaSignupConfig({ signups_open: true, invite_only: true })
    await page.goto('/signup', { waitUntil: 'networkidle' })
    await page.getByLabel('Email').fill('newuser@example.com')
    await page.getByLabel('Display name').fill('New User')
    await page.getByTestId('signup-invite-code').fill('USEDCODE11')
    await page.getByTestId('signup-country-search').fill('South Africa')
    await page.getByTestId('signup-country-select').selectOption({ value: 'ZA' })
    await page.getByLabel('Username').fill('newuserone')
    await page.getByLabel('Password', { exact: true }).fill('Str0ngPass!')
    await page.getByLabel('Confirm password').fill('Str0ngPass!')
    await page.getByTestId('signup-age-consent').check()
    await page.getByTestId('signup-consent').check()
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText("That invite code isn't valid.")).toBeVisible()
  })

  test('expired invite code is rejected on submit', async ({ page }) => {
    setE2eBetaSignupConfig({ signups_open: true, invite_only: true })
    await page.goto('/signup', { waitUntil: 'networkidle' })
    await page.getByTestId('signup-invite-code').fill('EXPIRED111')
    await page.getByLabel('Email').fill('expired@example.com')
    await page.getByLabel('Display name').fill('Expired User')
    await page.getByTestId('signup-country-search').fill('South Africa')
    await page.getByTestId('signup-country-select').selectOption({ value: 'ZA' })
    await page.getByLabel('Username').fill('expireduser')
    await page.getByLabel('Password', { exact: true }).fill('Str0ngPass!')
    await page.getByLabel('Confirm password').fill('Str0ngPass!')
    await page.getByTestId('signup-age-consent').check()
    await page.getByTestId('signup-consent').check()
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText("That invite code isn't valid.")).toBeVisible()
  })

  test('sign-up without invite code is refused when invite-only', async ({ page }) => {
    setE2eBetaSignupConfig({ signups_open: true, invite_only: true })
    await page.goto('/signup', { waitUntil: 'networkidle' })
    await page.getByLabel('Email').fill('reader@example.com')
    await page.getByLabel('Display name').fill('Reader')
    await page.getByTestId('signup-country-search').fill('South Africa')
    await page.getByTestId('signup-country-select').selectOption({ value: 'ZA' })
    await page.getByLabel('Username').fill('readerone')
    await page.getByLabel('Password', { exact: true }).fill('Str0ngPass!')
    await page.getByLabel('Confirm password').fill('Str0ngPass!')
    await page.getByTestId('signup-age-consent').check()
    await page.getByTestId('signup-consent').check()
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Enter your beta invite code.')).toBeVisible()
  })

  test('check-email page resend cooldown', async ({ page }) => {
    setE2eResendRateLimitAfterFirstSuccess(true)
    await page.addInitScript(() => {
      window.history.replaceState({ usr: { email: 'pending@example.com' } }, '', '/check-email')
    })
    await page.goto('/check-email', { waitUntil: 'networkidle' })
    await page.getByTestId('check-email-resend').click()
    await expect(page.getByText('We sent another link.')).toBeVisible()
    await expect(page.getByTestId('check-email-resend')).toContainText('Resend in')
  })

  test('confirm link success state', async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    await page.goto('/auth/confirm', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeVisible({ timeout: 10_000 })
  })

  test('confirm link expired state', async ({ page }) => {
    await page.goto('/auth/confirm?error=access_denied&error_code=otp_expired', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Link expired' })).toBeVisible()
  })

  test('sign-in before confirming shows resend path', async ({ page }) => {
    setE2ePasswordSignInError('email_not_confirmed', 'Email not confirmed')
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.getByLabel('Email').fill('pending@example.com')
    await page.getByLabel('Password', { exact: true }).fill('Str0ngPass!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByTestId('login-resend-confirmation')).toBeVisible()
  })

  test('axe signup at 375px and 1280px', async ({ page }) => {
    setE2eBetaSignupConfig({ signups_open: true, invite_only: true })
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/signup', { waitUntil: 'networkidle' })
      await expect(page.getByTestId('signup-form')).toBeVisible()
      await axeInclude(page, '[data-testid="signup-form"]', `signup-${width}`)
    }
  })

  test('axe check-email at 375px and 1280px', async ({ page }) => {
    await page.addInitScript(() => {
      window.history.replaceState({ usr: { email: 'pending@example.com' } }, '', '/check-email')
    })
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/check-email', { waitUntil: 'networkidle' })
      await expect(page.getByTestId('check-email-resend')).toBeVisible()
      await axeInclude(page, 'main', `check-email-${width}`)
    }
  })

  test('axe confirm and entrance at 375px and 1280px', async ({ page }) => {
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/auth/confirm?error=access_denied', { waitUntil: 'networkidle' })
      await axeInclude(page, 'main', `confirm-${width}`)
    }
    await seedSignedInSession(page)
    setE2eOnboardingComplete()
    setE2eEntranceVisible(true)
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/', { waitUntil: 'networkidle' })
      await expect(page.getByTestId('entrance-screen')).toBeVisible()
      await axeInclude(page, '[data-testid="entrance-screen"]', `entrance-${width}`)
    }
  })
})
