import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  resetBookBuilderMocks,
  resetLibraryReadingMocks,
  seedReadingProgress,
  seedBookReadingProgress,
  seedBookEntitlement,
  SAMPLE_CREATION_ID,
} from './fixtures.ts'
import { E2E_FREE_BOOK_ID, E2E_FREE_CHAPTER_ID } from './bookBuilderMocks.ts'

test.describe('Library continue reading', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    resetLibraryReadingMocks()
    seedBookEntitlement({ bookId: E2E_FREE_BOOK_ID, kind: 'free' })
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('orders post and book continue rows by last read time', async ({ page }) => {
    seedReadingProgress({
      creationId: SAMPLE_CREATION_ID,
      percent: 40,
      position: 1,
      updatedAt: '2026-01-01T12:00:00Z',
    })
    seedBookReadingProgress({
      bookId: E2E_FREE_BOOK_ID,
      chapterId: E2E_FREE_CHAPTER_ID,
      percent: 55,
      position: 2,
      updatedAt: '2026-01-02T12:00:00Z',
    })
    await page.goto('/library?tab=continue')
    await expect(page.getByTestId('continue-reading-row')).toBeVisible()
    const row = page.getByTestId('continue-reading-row')
    await expect(row.locator('article')).toHaveCount(2)
    await expect(row.locator('article').first()).toContainText('Free smoke book')
    await expect(row.locator('article').nth(1)).toContainText('Long story')
  })

  test('opens post continue link at saved position', async ({ page }) => {
    seedReadingProgress({ creationId: SAMPLE_CREATION_ID, percent: 40, position: 1, positionOffset: 0.25 })
    await page.goto('/library?tab=continue')
    await page.getByRole('link', { name: /Long story/i }).click()
    await expect(page).toHaveURL(new RegExp(`/read/${SAMPLE_CREATION_ID}`))
  })

  test('opens book continue link at chapter reader', async ({ page }) => {
    seedBookReadingProgress({ bookId: E2E_FREE_BOOK_ID, chapterId: E2E_FREE_CHAPTER_ID, percent: 30 })
    await page.goto('/library?tab=continue')
    await page.getByRole('link', { name: /Free smoke book/i }).click()
    await expect(page).toHaveURL(new RegExp(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`))
  })

  test('shows finished book under Finished filter', async ({ page }) => {
    seedBookReadingProgress({
      bookId: E2E_FREE_BOOK_ID,
      chapterId: E2E_FREE_CHAPTER_ID,
      percent: 100,
      completed: true,
    })
    await page.goto('/library?tab=books')
    await page.getByRole('tab', { name: 'Finished' }).click()
    await expect(page.getByText('Free smoke book')).toBeVisible()
    await expect(page.getByRole('link', { name: /Free smoke book.*Finished/i })).toBeVisible()
  })
})
