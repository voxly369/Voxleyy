import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'
import { E2E_FREE_BOOK_ID, E2E_FREE_CHAPTER_ID } from './bookBuilderMocks.ts'

test.describe('Book reader highlights tab', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('reader exposes highlights tab', async ({ page }) => {
    await page.goto(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`)
    await expect(page.getByTestId('book-chapter-reader')).toBeVisible()
    await page.getByRole('tab', { name: 'highlights' }).click()
    await expect(page.getByText(/No highlights/i)).toBeVisible()
  })
})
