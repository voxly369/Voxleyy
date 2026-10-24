import { test, expect } from '@playwright/test'
import {
  E2E_CONVERSATION_ID,
  installSupabaseMocks,
  messageReportQueueRow,
  prependFounderQueueRow,
  gotoFounderReportQueue,
  seedSignedInSession,
  setMessageSendFails,
  setModerationIsFounder,
} from './fixtures.ts'

test.describe('messages 15B', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
  })

  test('writer search opens a conversation', async ({ page }) => {
    await page.goto('/messages', { waitUntil: 'networkidle' })
    await page.getByTestId('dm-writer-search-input').fill('writer')
    await page.getByTestId('dm-writer-option').first().click()
    await expect(page).toHaveURL(`/messages/${E2E_CONVERSATION_ID}`)
  })

  test('share post picker attaches a post to composer', async ({ page }) => {
    await page.goto(`/messages/${E2E_CONVERSATION_ID}`, { waitUntil: 'networkidle' })
    await page.getByTestId('share-post-picker-trigger').click()
    await expect(page.getByTestId('share-post-search')).toBeVisible()
    await page.getByTestId('share-post-option').first().click()
    await expect(page.getByTestId('composer-shared-post')).toBeVisible()
  })

  test('cancel scheduled message', async ({ page }) => {
    await page.goto(`/messages/${E2E_CONVERSATION_ID}`, { waitUntil: 'networkidle' })
    const scheduled = page.getByTestId('message-bubble').filter({ hasText: 'Scheduled hello' })
    await scheduled.getByTestId('cancel-scheduled-message').click()
    await page.getByRole('button', { name: 'Cancel schedule' }).click()
    await expect(page.getByText('Scheduled hello')).toHaveCount(0)
  })

  test('optimistic send retry after failure', async ({ page }) => {
    setMessageSendFails(1)
    await page.goto(`/messages/${E2E_CONVERSATION_ID}`, { waitUntil: 'networkidle' })
    await page.getByPlaceholder('Write a message…').fill('Retry me')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByTestId('message-failed-label')).toBeVisible()
    await page.getByTestId('retry-failed-message').click()
    await expect(page.getByTestId('message-failed-label')).toHaveCount(0)
  })

  test('report message from bubble', async ({ page }) => {
    await page.goto(`/messages/${E2E_CONVERSATION_ID}`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="message-bubble"][data-own="false"]').first().getByTestId('report-message').click()
    await expect(page.getByTestId('report-sheet-form')).toBeVisible()
    await page.getByRole('button', { name: 'Submit report' }).click()
    await expect(page.getByTestId('report-sheet-success')).toBeVisible()
  })

  test('founder views reported message context', async ({ page }) => {
    setModerationIsFounder(true)
    prependFounderQueueRow(messageReportQueueRow())
    await gotoFounderReportQueue(page)
    await page.getByTestId('view-reported-message').click()
    await expect(page.getByTestId('reported-message-preview')).toContainText('Hello from Writer Two')
  })
})
