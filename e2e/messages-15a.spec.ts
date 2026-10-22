import { test, expect } from '@playwright/test'
import {
  bumpMessageUnread,
  E2E_CONVERSATION_ID,
  installSupabaseMocks,
  seedSignedInSession,
  setMessageQuietStatus,
} from './fixtures.ts'

test.describe('messages 15A', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
  })

  test('nav badge and conversation list', async ({ page }) => {
    await page.goto('/messages', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('conversation-row').first()).toBeVisible()
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('messages-badge-rail')).toBeVisible()
  })

  test('open thread and send message', async ({ page }) => {
    await page.goto(`/messages/${E2E_CONVERSATION_ID}`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('conversation-thread')).toBeVisible()
    await page.getByPlaceholder('Write a message…').fill('Playwright hello')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByTestId('message-bubble').last()).toBeVisible()
  })

  test('considerate sending when recipient quiet', async ({ page }) => {
    setMessageQuietStatus({ on: true, label: 'later', ends_at: null })
    await page.goto(`/messages/${E2E_CONVERSATION_ID}`, { waitUntil: 'networkidle' })
    await page.getByPlaceholder('Write a message…').fill('Quiet check')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByTestId('considerate-send-confirm')).toBeVisible()
  })

  test('unread bump via reload', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    bumpMessageUnread()
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByTestId('messages-badge-rail')).toBeVisible()
  })

  test('privacy setting in settings safety', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('message-privacy-settings')).toBeVisible()
    await page.getByLabel('Followers only').check()
    await expect(page.getByText('Privacy saved.')).toBeVisible()
  })
})
