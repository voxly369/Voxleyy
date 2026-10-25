import { test, expect } from '@playwright/test'
import {
  E2E_CONVERSATION_ID,
  installSupabaseMocks,
  seedSignedInSession,
  setE2eDeletedAccountPeerMessage,
} from './fixtures.ts'
import { setE2eOnboardingComplete } from './betaReadiness18bMocks.ts'

test.describe('account deletion messages tombstone', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    setE2eOnboardingComplete()
    setE2eDeletedAccountPeerMessage()
    await seedSignedInSession(page)
  })

  test('peer sees thread text and Deleted account sender without profile link', async ({ page }) => {
    await page.goto(`/messages/${E2E_CONVERSATION_ID}`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('conversation-thread')).toBeVisible()
    await expect(page.getByTestId('thread-header-name')).toHaveText('Deleted account')
    await expect(page.getByTestId('message-bubble')).toContainText('Goodbye from deleted user')
    await expect(page.getByTestId('message-sender-deleted-account')).toHaveText('Deleted account')
    await expect(page.getByTestId('conversation-thread').locator('a[href*="/u/"]')).toHaveCount(0)
  })
})
