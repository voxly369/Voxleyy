import { test, expect } from '@playwright/test'
import {
  E2E_CONVERSATION_ID,
  OTHER,
  clearMessageConversations,
  installSupabaseMocks,
  seedSignedInSession,
  setMessageListError,
  setMessageQuietStatus,
  setModerationOwnProfileStatus,
} from './fixtures.ts'

test.describe('messages 16B', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
  })

  test('block confirm from thread safety menu', async ({ page }) => {
    await page.goto(`/messages/${E2E_CONVERSATION_ID}`, { waitUntil: 'networkidle' })
    await page.getByTestId('thread-safety-menu-trigger').click()
    await page.getByRole('menuitem', { name: 'Block' }).click()
    await expect(page.getByRole('alertdialog', { name: 'Block this account?' })).toBeVisible()
    await page.getByRole('button', { name: 'Block' }).click()
  })

  test('mute and unmute conversation', async ({ page }) => {
    await page.goto(`/messages/${E2E_CONVERSATION_ID}`, { waitUntil: 'networkidle' })
    const toggle = page.getByTestId('conversation-mute-toggle')
    await expect(toggle).toHaveText('Mute')
    await toggle.click()
    await expect(toggle).toHaveText('Unmute')
    await toggle.click()
    await expect(toggle).toHaveText('Mute')
  })

  test('delete message shows tombstone', async ({ page }) => {
    await page.goto(`/messages/${E2E_CONVERSATION_ID}`, { waitUntil: 'networkidle' })
    const ownBubble = page.locator('[data-testid="message-bubble"][data-own="true"]').first()
    await ownBubble.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByTestId('message-tombstone').first()).toBeVisible()
  })

  test('suspended account shows disabled composer', async ({ page }) => {
    setModerationOwnProfileStatus('suspended')
    await page.goto(`/messages/${E2E_CONVERSATION_ID}`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('message-composer-disabled')).toContainText('suspended')
  })

  test('quiet mode considerate sending modal', async ({ page }) => {
    setMessageQuietStatus({ on: true, label: 'Quiet mode is on', ends_at: null })
    await page.goto(`/messages/${E2E_CONVERSATION_ID}`, { waitUntil: 'networkidle' })
    await page.getByPlaceholder('Write a message…').fill('Hello gently')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByRole('alertdialog', { name: 'Send anyway?' })).toBeVisible()
    await page.getByTestId('considerate-send-confirm').click()
    await expect(page.getByText('Hello gently')).toBeVisible()
  })

  test('unknown conversation URL shows not found', async ({ page }) => {
    await page.goto('/messages/00000000-0000-0000-0000-000000000099', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('messages-conversation-not-found')).toBeVisible()
  })

  test('list error vs empty states', async ({ page }) => {
    setMessageListError('Could not load conversations.')
    await page.goto('/messages', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('conversation-list-error')).toContainText('Could not load')

    setMessageListError(null)
    clearMessageConversations()
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByTestId('conversation-list-empty')).toContainText('No messages yet')
  })

  test('share post from feed post menu', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('post-share-to-message').first().click()
    await expect(page).toHaveURL(/\/messages\//)
    await expect(page.getByTestId('composer-shared-post')).toBeVisible()
  })

  test('profile message button opens thread', async ({ page }) => {
    await page.goto(`/u/${OTHER.username}`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="profile-message-button"]:visible').click()
    await expect(page).toHaveURL(/\/messages\//)
  })

  test('conversation list search filters rows', async ({ page }) => {
    await page.goto('/messages', { waitUntil: 'networkidle' })
    await page.getByTestId('conversation-search').fill('writer')
    await expect(page.getByTestId('conversation-row')).toHaveCount(1)
    await page.getByTestId('conversation-search').fill('zzzzempty')
    await expect(page.getByTestId('conversation-list-empty')).toContainText('No conversations match')
  })

  test('unread badges on list and nav', async ({ page }) => {
    await page.goto('/messages', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('conversation-unread-badge').first()).toHaveText('2')
    await expect(page.getByTestId('messages-badge-rail')).toHaveText('2')
  })
})
