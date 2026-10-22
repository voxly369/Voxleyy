import { test, expect } from '@playwright/test'
import {
  bumpNotificationUnread,
  installSupabaseMocks,
  seedNotificationsE2e,
  seedSignedInSession,
  setModerationIncludeBannedUserInSearch,
  setModerationIsFounder,
  setNotificationQuietManual,
  SAMPLE_CREATION_ID,
} from './fixtures.ts'

test.describe('notifications 13A', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    await seedNotificationsE2e(page)
  })

  test('bell shows unread count and opens panel', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('notification-badge-rail')).toBeVisible()
    await page.getByTestId('notification-bell-rail').click()
    await expect(page.getByRole('heading', { name: /Notifications/i })).toBeVisible()
  })

  test('row navigation marks notification read', async ({ page }) => {
    await page.goto('/notifications', { waitUntil: 'networkidle' })
    const row = page.getByTestId('notification-row').first()
    await row.click()
    await expect(page).toHaveURL(new RegExp(`/c/${SAMPLE_CREATION_ID}`))
  })

  test('mark all and clear read', async ({ page }) => {
    await page.goto('/notifications', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Mark all read' }).click()
    await page.getByRole('button', { name: 'Clear read' }).click()
    await expect(page.getByText('No notifications yet')).toBeVisible()
  })

  test('pagination loads more rows', async ({ page }) => {
    await page.goto('/notifications', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: 'Load more' })).toBeVisible()
    await page.getByRole('button', { name: 'Load more' }).click()
    await expect(page.getByTestId('notification-row').first()).toBeVisible()
  })

  test('realtime badge update via refetch simulation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    bumpNotificationUnread()
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByTestId('notification-badge-rail')).toBeVisible()
  })

  test('quiet mode suppresses toast', async ({ page }) => {
    setNotificationQuietManual(true)
    await page.goto('/settings/notifications', { waitUntil: 'networkidle' })
    await page.getByLabel('Quiet now').check()
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByLabel('Quiet now')).toBeChecked()
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.evaluate(() => {
      const hook = (
        window as unknown as {
          __voxlyE2ePushNotification?: (row: {
            id: string
            type: string
            actor: { id: string | null; username: string | null; displayName: string | null; avatarUrl: string | null }
            targetType: string | null
            targetId: string | null
            data: Record<string, unknown>
            held: boolean
            createdAt: string
            readAt: string | null
            targetTitle: string | null
            targetExcerpt: string | null
          }) => void
        }
      ).__voxlyE2ePushNotification
      hook?.({
        id: 'toast-test',
        type: 'like',
        actor: { id: 'a', username: 'writer', displayName: 'Writer', avatarUrl: null },
        targetType: 'creation',
        targetId: '00000000-0000-0000-0000-000000000001',
        data: {},
        held: false,
        createdAt: new Date().toISOString(),
        readAt: null,
        targetTitle: 'Post',
        targetExcerpt: null,
      })
    })
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('settings autosave', async ({ page }) => {
    await page.goto('/settings/notifications', { waitUntil: 'networkidle' })
    await page.getByLabel('Likes').uncheck()
    await page.waitForTimeout(900)
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByLabel('Likes')).not.toBeChecked()
  })

  test('mention row text on notifications page', async ({ page }) => {
    await page.goto('/notifications', { waitUntil: 'networkidle' })
    await expect(page.getByText(/mentioned you/i)).toBeVisible()
  })

  test('founder admin section', async ({ page }) => {
    setModerationIsFounder(true)
    await page.goto('/notifications', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('founder-admin-notifications')).toBeVisible()
    await expect(page.getByText(/report/i)).toBeVisible()
  })

  test('founder users tab unban flow', async ({ page }) => {
    setModerationIsFounder(true)
    setModerationIncludeBannedUserInSearch(true)
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Users' }).click()
    await page.getByPlaceholder('Search name, username, or email').fill('banneduser')
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByText('@banneduser')).toBeVisible()
    await page.getByRole('button', { name: 'Unban' }).first().click()
    await page.getByLabel('Reason (required)').fill('Restored after appeal review.')
    await page.getByRole('dialog').getByRole('button', { name: 'Unban' }).click()
  })
})
