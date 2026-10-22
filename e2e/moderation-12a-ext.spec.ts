import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  OTHER,
  SAMPLE_CREATION_ID,
  setModerationIsFounder,
  setModerationOwnProfileStatus,
} from './fixtures.ts'

test.describe('moderation 12A extended', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
  })

  test('non-Founder visiting /founder redirects to Home', async ({ page }) => {
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL('/')
  })

  test('settings hides Founder section for non-Founder', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('settings-founder-section')).toHaveCount(0)
  })

  test('banned user sees banned screen with appeal form', async ({ page }) => {
    setModerationOwnProfileStatus('banned')
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Account banned' })).toBeVisible()
    await expect(page.getByText('Repeated harassment')).toBeVisible()
    await expect(page.getByTestId('appeal-form')).toBeVisible()
  })

  test('block user from profile safety menu hides their posts from feed', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Post 1', exact: true })).toBeVisible()
    await page.goto(`/u/${OTHER.username}`, { waitUntil: 'networkidle' })
    await page.getByTestId('safety-overflow-menu-trigger').click()
    await page.getByRole('menuitem', { name: 'Block' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Block' }).click()
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Post 1', exact: true })).toHaveCount(0)
  })

  test('mute user hides their posts from feed', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Post 1', exact: true })).toBeVisible()
    await page.getByTestId('safety-overflow-menu-trigger').first().click()
    await page.getByRole('menuitem', { name: 'Mute' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Mute' }).click()
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Post 1', exact: true })).toHaveCount(0)
  })

  test('hidden word collapses matching comment', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.getByPlaceholder('Add a word').fill('badword')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.goto(`/c/${SAMPLE_CREATION_ID}`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Comments' }).click()
    await expect(page.getByRole('button', { name: 'Hidden comment, show' }).first()).toBeVisible({ timeout: 10000 })
  })

  test('suspended user sees banner and disabled comment composer', async ({ page }) => {
    setModerationOwnProfileStatus('suspended')
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('suspended-banner')).toBeVisible()
    await page.goto(`/c/${SAMPLE_CREATION_ID}`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Comments' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByTestId('comments-composer-disabled')).toContainText('suspended', { timeout: 10000 })
  })

  test('Founder dismisses report with required reason', async ({ page }) => {
    setModerationIsFounder(true)
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('founder-report-queue')).toBeVisible()
    await page.getByRole('button', { name: 'Dismiss' }).first().click()
    await page.getByLabel('Reason (required)').fill('Not a policy violation after review.')
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page.getByLabel('Reason (required)')).toHaveCount(0, { timeout: 8000 })
    await page.getByRole('button', { name: 'Audit log' }).click()
    await expect(
      page.getByTestId('founder-audit-log').locator('div.rounded-xl').filter({ has: page.locator('span.font-semibold', { hasText: 'dismiss' }) }).first(),
    ).toBeVisible()
  })
})
