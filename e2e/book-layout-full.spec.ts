import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks, seedBookEntitlement } from './fixtures.ts'
import { E2E_FREE_BOOK_ID, E2E_PAID_BOOK_ID } from './bookBuilderMocks.ts'

const WIDTHS = [375, 767, 768, 1024, 1279, 1280, 1440] as const

async function assertNoHorizontalScroll(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth > doc.clientWidth + 1
  })
  expect(overflow).toBe(false)
}

for (const width of WIDTHS) {
  test(`book surfaces layout at ${width}px`, async ({ page }) => {
    resetBookBuilderMocks()
    seedBookEntitlement({ bookId: E2E_FREE_BOOK_ID, kind: 'free' })
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
    await page.setViewportSize({ width, height: 900 })

    await page.goto(`/books/${E2E_FREE_BOOK_ID}`)
    await expect(page.getByTestId('book-page')).toBeVisible()
    await assertNoHorizontalScroll(page)

    await page.goto(`/books/${E2E_PAID_BOOK_ID}`)
    await expect(page.getByTestId('book-page')).toBeVisible()
    await assertNoHorizontalScroll(page)

    await page.goto('/books/bb000000-0000-0000-0000-000000000099/builder')
    await expect(page.getByRole('heading', { name: 'Book builder' })).toBeVisible()
    await expect(page.getByTestId('chapter-manager')).toBeVisible()
    await assertNoHorizontalScroll(page)

    await page.goto('/library?tab=books')
    await expect(page.getByTestId('library-books-shelf')).toBeVisible()
    await assertNoHorizontalScroll(page)
  })
}
