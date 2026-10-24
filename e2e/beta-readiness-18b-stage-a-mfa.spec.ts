import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  installSupabaseMocks,
  seedSignedInSession,
  setE2eMfaEnrolled,
  setE2eMfaWrongCode,
} from './fixtures.ts'

async function axeInclude(page: import('@playwright/test').Page, include: string, label: string) {
  const results = await new AxeBuilder({ page })
    .include(include)
    .disableRules(['page-has-heading-one', 'color-contrast'])
    .analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious, `${label}: ${JSON.stringify(serious, null, 2)}`).toEqual([])
}

test.describe('beta readiness 18B stage A MFA', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
  })

  test('sign-in sends enrolled users to MFA challenge', async ({ page }) => {
    setE2eMfaEnrolled(true)
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.getByLabel('Email').fill('reader@example.com')
    await page.getByLabel('Password', { exact: true }).fill('Str0ngPass!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/auth\/mfa-challenge/)
    await expect(page.getByTestId('mfa-challenge-screen')).toBeVisible()
  })

  test('wrong MFA code shows friendly error', async ({ page }) => {
    setE2eMfaEnrolled(true)
    setE2eMfaWrongCode(true)
    await page.goto('/auth/mfa-challenge', { waitUntil: 'networkidle' })
    await seedSignedInSession(page)
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByTestId('mfa-challenge-code').fill('000000')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('alert')).toContainText('That code did not work')
  })

  test('enrol and remove MFA in settings', async ({ page }) => {
    await seedSignedInSession(page)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.getByTestId('mfa-enroll-open').click()
    await expect(page.getByTestId('mfa-enroll-modal')).toBeVisible()
    await expect(page.getByTestId('mfa-enroll-secret')).toBeVisible()
    await page.getByTestId('mfa-enroll-code').fill('123456')
    setE2eMfaWrongCode(false)
    await page.getByTestId('mfa-enroll-confirm').click()
    await expect(page.getByTestId('mfa-remove-open')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('mfa-remove-open').click()
    const removeModal = page.getByTestId('mfa-remove-modal')
    await removeModal.locator('#mfa-remove-password').fill('Str0ngPass!')
    await removeModal.getByTestId('mfa-remove-confirm').click()
    await expect(page.getByTestId('mfa-enroll-open')).toBeVisible()
  })

  test('axe on MFA challenge at 375px and 1280px', async ({ page }) => {
    setE2eMfaEnrolled(true)
    await seedSignedInSession(page)
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/auth/mfa-challenge', { waitUntil: 'networkidle' })
      await axeInclude(page, 'main', `mfa-challenge-${width}`)
    }
  })
})
