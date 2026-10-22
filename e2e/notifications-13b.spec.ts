import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  setNotificationQuietManual,
  setNotificationQuietReach,
  seedHeldNotification,
} from './fixtures.ts'

test.describe('notifications 13B quiet reach', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
  })

  test('quiet reach options and Pen Pals note', async ({ page }) => {
    await page.goto('/settings/notifications', { waitUntil: 'networkidle' })
    await page.getByLabel(/Who can reach you during quiet/i).selectOption('pen_pals')
    await expect(page.getByTestId('quiet-reach-pen-pals-note')).toContainText('Available when Pen Pals launch')
    await page.getByLabel(/Who can reach you during quiet/i).selectOption('close_contacts')
    await expect(page.getByLabel(/Who can reach you during quiet/i)).toHaveValue('close_contacts')
  })

  test('held notification visible in inbox while quiet', async ({ page }) => {
    seedHeldNotification()
    setNotificationQuietManual(true)
    await page.goto('/notifications', { waitUntil: 'networkidle' })
    await expect(page.locator('[data-testid="notification-row"][data-held="true"]')).toBeVisible()
  })

  test('summary row after quiet mode ends', async ({ page }) => {
    setNotificationQuietManual(true)
    setNotificationQuietReach('nobody')
    seedHeldNotification()
    await page.goto('/notifications', { waitUntil: 'networkidle' })
    setNotificationQuietManual(false)
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByText(/While you were in quiet mode/i)).toBeVisible()
  })
})
