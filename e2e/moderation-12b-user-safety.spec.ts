import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  SAMPLE_CREATION_ID,
  setE2eOwnRemovedCreation,
  setE2eOtherUserRemovedCreationHidden,
  setModerationReportsEmpty,
  setModerationUnseenWarnings,
} from './fixtures.ts'

test.describe('moderation 12B user safety', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
  })

  test('warning modal shows once and does not return after reload', async ({ page }) => {
    setModerationUnseenWarnings([{ id: '00000000-0000-0000-0000-0000000000w1', message: 'One-time warning' }])
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('warning-modal')).toBeVisible()
    await page.getByRole('button', { name: 'I understand' }).click()
    await expect(page.getByTestId('warning-modal')).toHaveCount(0)
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByTestId('warning-modal')).toHaveCount(0)
  })

  test('author sees Removed by Voxly notice with Appeal', async ({ page }) => {
    setE2eOwnRemovedCreation('Spam policy')
    await page.goto(`/c/${SAMPLE_CREATION_ID}`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('removed-content-notice')).toBeVisible()
    await expect(page.getByText('Removed by Voxly')).toBeVisible()
    await expect(page.getByText('Appeal')).toBeVisible()
  })

  test('other users do not see removed post', async ({ page }) => {
    setE2eOtherUserRemovedCreationHidden()
    await page.goto(`/c/${SAMPLE_CREATION_ID}`, { waitUntil: 'networkidle' })
    await expect(page.getByText('Work did not load')).toBeVisible()
  })

  test('My reports shows Sent, Reviewed and empty state', async ({ page }) => {
    await page.goto('/settings/reports', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('my-report-status-00000000-0000-0000-0000-0000000000r1')).toHaveText('Sent')
    await expect(page.getByTestId('my-report-status-00000000-0000-0000-0000-0000000000r2')).toHaveText('Reviewed')
    setModerationReportsEmpty()
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByTestId('my-reports-empty')).toBeVisible()
  })

  test('Appeals settings lists statuses', async ({ page }) => {
    await page.goto('/settings/appeals', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('appeal-status-00000000-0000-0000-0000-0000000000a1')).toHaveText('Pending review')
    await expect(page.getByTestId('appeal-status-00000000-0000-0000-0000-0000000000a3')).toHaveText('Decided')
  })
})
