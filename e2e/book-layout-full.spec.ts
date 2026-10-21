import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'
import { E2E_FREE_BOOK_ID, E2E_PAID_BOOK_ID } from './bookBuilderMocks.ts'

for (const width of [375, 768, 1280] as const) {
  test(`book surfaces layout at ${width}px`, async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
    await page.setViewportSize({ width, height: 900 })

    await page.goto(`/books/${E2E_FREE_BOOK_ID}`)
    await expect(page.getByTestId('book-page')).toBeVisible()

    await page.goto(`/books/${E2E_PAID_BOOK_ID}`)
    await expect(page.getByTestId('book-page')).toBeVisible()

    await page.goto('/books/bb000000-0000-0000-0000-000000000099/builder')
    await expect(page.getByRole('heading', { name: 'Book builder' })).toBeVisible()
    await expect(page.getByTestId('chapter-list')).toBeVisible()
  })
}
