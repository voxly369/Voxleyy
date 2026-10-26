import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'
import { resetAutoHideMocks, setAutoHideAuthorNoticePostId } from './autoHideMocks.ts'

for (const width of [375, 1280] as const) {
  test.describe(`author hidden notice layout @ ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test.beforeEach(async ({ page }) => {
      resetAutoHideMocks()
      await installSupabaseMocks(page)
      await seedSignedInSession(page)
    })

    test('notice fits viewport', async ({ page }) => {
      setAutoHideAuthorNoticePostId('00000000-0000-0000-0000-000000000001')
      await page.goto('/c/00000000-0000-0000-0000-000000000001', { waitUntil: 'networkidle' })
      const notice = page.getByTestId('author-auto-hidden-notice')
      await expect(notice).toBeVisible()
      const box = await notice.boundingBox()
      expect(box).not.toBeNull()
      if (box) {
        expect(box.width).toBeLessThanOrEqual(width)
      }
    })
  })
}
