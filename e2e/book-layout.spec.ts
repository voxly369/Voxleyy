import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'
import { E2E_FREE_BOOK_ID } from './bookBuilderMocks.ts'

for (const width of [375, 1280] as const) {
  test(`book page layout at ${width}px`, async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/books/${E2E_FREE_BOOK_ID}`)
    await expect(page.getByTestId('book-page')).toBeVisible()
  })
}
