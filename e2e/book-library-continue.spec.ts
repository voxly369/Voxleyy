import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  resetBookBuilderMocks,
  resetLibraryReadingMocks,
  seedReadingProgress,
  seedBookReadingProgress,
  SAMPLE_CREATION_ID,
} from './fixtures.ts'
import { E2E_FREE_BOOK_ID, E2E_FREE_CHAPTER_ID } from './bookBuilderMocks.ts'

test.describe('Library continue reading', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    resetLibraryReadingMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('shows post and book continue rows', async ({ page }) => {
    seedReadingProgress({ creationId: SAMPLE_CREATION_ID, percent: 40, position: 1 })
    seedBookReadingProgress({ bookId: E2E_FREE_BOOK_ID, chapterId: E2E_FREE_CHAPTER_ID, percent: 55, position: 2 })
    await page.goto('/library?tab=continue')
    await expect(page.getByTestId('continue-reading-row')).toBeVisible()
    const row = page.getByTestId('continue-reading-row')
    await expect(row.locator('article')).toHaveCount(2)
    await expect(row.getByRole('link', { name: /Long story/i })).toBeVisible()
    await expect(row.getByRole('link', { name: /Free smoke book/i })).toBeVisible()
    await expect(row.locator('article').nth(1)).toContainText('55% read')
  })

  test('opens book continue link at chapter reader', async ({ page }) => {
    seedBookReadingProgress({ bookId: E2E_FREE_BOOK_ID, chapterId: E2E_FREE_CHAPTER_ID, percent: 30 })
    await page.goto('/library?tab=continue')
    await page.getByRole('link', { name: /Free smoke book/i }).click()
    await expect(page).toHaveURL(new RegExp(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`))
  })
})
