import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'
import {
  E2E_MIXED_PUBLISH_BOOK_ID,
  E2E_MIXED_PUB_CHAPTER_ID,
  E2E_MIXED_DRAFT_CHAPTER_ID,
  setChapterStatusInMock,
} from './bookBuilderMocks.ts'

const AUTHOR_BOOK_ID = 'bb000000-0000-0000-0000-000000000099'
const AUTHOR_BUILDER = `/books/${AUTHOR_BOOK_ID}/builder`
const AUTHOR_CHAPTER_A = 'cc000000-0000-0000-0000-000000000099'

test.describe('Book builder publish and TOC', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('publishes a chapter from the builder', async ({ page }) => {
    await page.goto(AUTHOR_BUILDER)
    const row = page.getByTestId(`chapter-row-${AUTHOR_CHAPTER_A}`)
    await row.getByRole('button', { name: 'Publish' }).click()
    await expect(row.getByRole('button', { name: 'Unpublish' })).toBeVisible()
  })

  test('reader TOC shows Coming soon on draft chapters only', async ({ page }) => {
    await page.goto(`/books/${E2E_MIXED_PUBLISH_BOOK_ID}`)
    await expect(page.getByRole('button', { name: /Published part/i })).toBeVisible()
    await expect(page.getByText('Coming soon')).toBeVisible()
    await page.getByRole('button', { name: /Published part/i }).click()
    await expect(page).toHaveURL(new RegExp(E2E_MIXED_PUB_CHAPTER_ID))
    await expect(page.getByTestId('book-chapter-reader')).toBeVisible()
    await page.goto(`/read/book/${E2E_MIXED_PUBLISH_BOOK_ID}/${E2E_MIXED_DRAFT_CHAPTER_ID}`)
    await expect(page.getByTestId('book-reader-unentitled')).toBeVisible()
  })

  test('preview lists chapter table of contents before publish', async ({ page }) => {
    setChapterStatusInMock(AUTHOR_CHAPTER_A, 'published')
    await page.goto(`/books/${AUTHOR_BOOK_ID}/preview`)
    await expect(page.getByTestId('book-preview-page')).toBeVisible()
    await expect(page.getByRole('link', { name: /Draft chapter A/i })).toBeVisible()
  })
})
