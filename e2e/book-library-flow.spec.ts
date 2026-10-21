import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'
import { E2E_FREE_BOOK_ID } from './bookBuilderMocks.ts'

test.describe('Book library flow', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('books shelf shows filter chips', async ({ page }) => {
    await page.goto(`/books/${E2E_FREE_BOOK_ID}`)
    await page.getByRole('button', { name: 'Add to library' }).click()
    await page.goto('/library?tab=books')
    await expect(page.getByTestId('library-books-shelf')).toBeVisible()
    await expect(page.getByRole('tab', { name: 'All' })).toBeVisible()
  })
})
