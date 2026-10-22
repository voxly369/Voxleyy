import { test, expect } from '@playwright/test'
import { E2E_CONVERSATION_ID, installSupabaseMocks, seedSignedInSession } from './fixtures.ts'

const WIDTHS = [375, 768, 1280] as const

for (const width of WIDTHS) {
  test(`messages 15B layout ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    await page.goto('/messages', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('dm-writer-search')).toBeVisible()
    if (width >= 768) {
      await expect(page.getByTestId('messages-list-pane')).toBeVisible()
    }
    await page.goto(`/messages/${E2E_CONVERSATION_ID}`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('conversation-thread')).toBeVisible()
    await expect(page.getByTestId('share-post-picker-trigger')).toBeVisible()
    if (width < 768) {
      await expect(page.getByTestId('messages-back')).toBeVisible()
    }
  })
}
