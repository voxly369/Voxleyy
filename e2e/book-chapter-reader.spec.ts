import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  resetBookBuilderMocks,
  resetLibraryReadingMocks,
  seedChapterHighlight,
  E2E_LOCKED_CHAPTER_ID,
} from './fixtures.ts'
import { E2E_FREE_BOOK_ID, E2E_FREE_CHAPTER_ID, E2E_PAID_BOOK_ID } from './bookBuilderMocks.ts'

test.describe('Book chapter reader', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    resetLibraryReadingMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('reads a free library chapter', async ({ page }) => {
    await page.goto(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`)
    await expect(page.getByTestId('book-chapter-reader')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'First chapter' })).toBeVisible()
  })

  test('shows not available for locked paid chapter', async ({ page }) => {
    await page.goto(`/read/book/${E2E_PAID_BOOK_ID}/${E2E_LOCKED_CHAPTER_ID}`)
    await expect(page.getByTestId('book-reader-unentitled')).toBeVisible()
    await expect(page.getByText('Not available to read')).toBeVisible()
  })

  test('page mode toggles paged viewport', async ({ page }) => {
    await page.goto(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`)
    await page.getByRole('button', { name: 'Page mode' }).click()
    await expect(page.locator('[data-reader-page-viewport]')).toBeVisible()
    await expect(page.locator('[data-reader-page-body]')).toHaveCount(1)
    await expect(page.getByTestId('book-reader-page-indicator')).toContainText(/Page 1 of/i)
    await page.getByRole('button', { name: 'Scroll mode' }).click()
    await expect(page.locator('[data-reader-page-viewport]')).toHaveCount(0)
  })

  test('highlights tab lists saved chapter highlights', async ({ page }) => {
    seedChapterHighlight({ chapterId: E2E_FREE_CHAPTER_ID, quote: 'Saved chapter quote' })
    await page.goto(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`)
    await page.getByRole('tab', { name: 'highlights' }).click()
    await expect(page.getByText('Saved chapter quote')).toBeVisible()
  })
})
