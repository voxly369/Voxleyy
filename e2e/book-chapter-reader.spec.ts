import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  resetBookBuilderMocks,
  resetLibraryReadingMocks,
  seedChapterHighlight,
  seedBookEntitlement,
  E2E_LOCKED_CHAPTER_ID,
} from './fixtures.ts'
import { E2E_FREE_BOOK_ID, E2E_FREE_CHAPTER_ID, E2E_PAID_BOOK_ID } from './bookBuilderMocks.ts'
import { selectWordInParagraph } from './reader-part-2-helpers.ts'

test.describe('Book chapter reader', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    resetLibraryReadingMocks()
    seedBookEntitlement({ bookId: E2E_FREE_BOOK_ID, kind: 'free' })
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
    await page.route('https://api.dictionaryapi.dev/api/v2/entries/en/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            word: 'Chapter',
            meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A main division of a book.' }] }],
          },
        ]),
      })
    })
  })

  test('reads a free library chapter', async ({ page }) => {
    await page.goto(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`)
    await expect(page.getByTestId('book-chapter-reader')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'First chapter' })).toBeVisible()
  })

  test('shows not available for locked paid chapter without chapter body request', async ({ page }) => {
    let chapterBodyRequests = 0
    await page.route('**/*', async (route) => {
      const url = route.request().url()
      if (url.includes('/rest/v1/chapters') && url.includes(E2E_LOCKED_CHAPTER_ID) && route.request().method() === 'GET') {
        chapterBodyRequests += 1
      }
      await route.fallback()
    })
    await page.goto(`/read/book/${E2E_PAID_BOOK_ID}/${E2E_LOCKED_CHAPTER_ID}`)
    await expect(page.getByTestId('book-reader-unentitled')).toBeVisible()
    await expect(page.getByText('Not available to read')).toBeVisible()
    expect(chapterBodyRequests).toBe(0)
  })

  test('creates scroll-mode highlight that persists after reload and text size change', async ({ page }) => {
    await page.goto(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`)
    await selectWordInParagraph(page, 0, 'Highlightable')
    const createHighlight = page.waitForResponse(
      (resp) => resp.url().includes('/rest/v1/reader_highlights') && resp.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Highlight Yellow' }).click()
    await createHighlight
    await page.reload()
    await expect(page.locator('mark')).toContainText('Highlightable')
    await page.getByRole('button', { name: 'Increase text size' }).click()
    await expect(page.locator('mark')).toContainText('Highlightable')
    await page.reload()
    await expect(page.locator('mark')).toContainText('Highlightable')
  })

  test('creates page-mode highlight that persists after reload', async ({ page }) => {
    await page.goto(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`)
    await selectWordInParagraph(page, 0, 'Highlightable')
    await page.getByRole('button', { name: 'Highlight Green' }).click()
    await page.waitForResponse(
      (resp) => resp.url().includes('/rest/v1/reader_highlights') && resp.request().method() === 'POST',
    )
    await page.reload()
    await page.getByRole('button', { name: 'Page mode' }).click()
    await expect(page.locator('[data-reader-page-viewport] mark')).toContainText('Highlightable')
    await page.getByRole('button', { name: 'Increase text size' }).click()
    await expect(page.locator('[data-reader-page-viewport] mark')).toContainText('Highlightable')
  })

  test('lists chapter highlight in Library Highlights with book and chapter titles', async ({ page }) => {
    seedChapterHighlight({
      bookId: E2E_FREE_BOOK_ID,
      chapterId: E2E_FREE_CHAPTER_ID,
      quote: 'Library chapter highlight quote',
    })
    await page.goto('/library?tab=highlights')
    await expect(page.getByText('Library chapter highlight quote')).toBeVisible()
    await expect(page.getByText(/Free smoke book · First chapter/i)).toBeVisible()
  })

  test('opens chapter highlight from Library Highlights at the reader', async ({ page }) => {
    seedChapterHighlight({
      bookId: E2E_FREE_BOOK_ID,
      chapterId: E2E_FREE_CHAPTER_ID,
      quote: 'Open from library quote',
    })
    await page.goto('/library?tab=highlights')
    await page.getByRole('link', { name: 'Open in reader' }).click()
    await expect(page).toHaveURL(new RegExp(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`))
    await expect(page.getByTestId('book-chapter-reader')).toBeVisible()
  })

  test('adds bookmark and jumps to bookmark position', async ({ page }) => {
    await page.goto(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`)
    const bookmarkPost = page.waitForResponse(
      (resp) => resp.url().includes('/rest/v1/reader_bookmarks') && resp.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Bookmark' }).click()
    await bookmarkPost
    await page.reload()
    await expect(page.getByTestId('jump-to-bookmark')).toBeVisible()
    await page.getByTestId('jump-to-bookmark').click()
    await expect(page.getByTestId('book-chapter-reader')).toBeVisible()
  })

  test('looks up a word inside a chapter', async ({ page }) => {
    await page.goto(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`)
    await selectWordInParagraph(page, 0, 'Highlightable')
    await page.getByRole('button', { name: 'Look up' }).click()
    await expect(page.getByText(/main division of a book/i)).toBeVisible()
  })

  test('queues chapter highlight offline and syncs when back online', async ({ page, context }) => {
    await page.goto(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`)
    await expect(page.getByTestId('book-chapter-reader')).toBeVisible()
    await context.setOffline(true)
    await selectWordInParagraph(page, 0, 'Highlightable')
    await page.getByRole('button', { name: 'Highlight Pink' }).click()
    await expect(page.getByTestId('book-chapter-offline-banner')).toBeVisible()
    await expect(page.locator('mark')).toContainText('Highlightable')
    const sync = page.waitForResponse(
      (resp) => resp.url().includes('/rest/v1/reader_highlights') && resp.request().method() === 'POST',
    )
    await context.setOffline(false)
    await sync
    await page.reload()
    await expect(page.locator('mark')).toContainText('Highlightable')
  })

  test('highlights tab lists saved chapter highlights', async ({ page }) => {
    seedChapterHighlight({ chapterId: E2E_FREE_CHAPTER_ID, quote: 'Saved chapter quote' })
    await page.goto(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`)
    await page.getByRole('tab', { name: 'highlights' }).click()
    await expect(page.getByText('Saved chapter quote')).toBeVisible()
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
})
