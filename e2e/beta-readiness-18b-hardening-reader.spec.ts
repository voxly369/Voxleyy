import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  resetBookBuilderMocks,
  resetLibraryReadingMocks,
  seedBookEntitlement,
  seedChapterHighlight,
} from './fixtures.ts'
import {
  E2E_FREE_BOOK_ID,
  E2E_FREE_CHAPTER_ID,
  setE2eBookCreationLanguage,
} from './bookBuilderMocks.ts'
test.describe('18B hardening reader language', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    resetLibraryReadingMocks()
    seedBookEntitlement({ bookId: E2E_FREE_BOOK_ID, kind: 'free' })
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('Arabic book chapter exposes rtl lang on body and highlight snippet', async ({ page }) => {
    setE2eBookCreationLanguage(E2E_FREE_BOOK_ID, 'ar')
    seedChapterHighlight({ chapterId: E2E_FREE_CHAPTER_ID, quote: 'نص مميز' })
    await page.goto(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`, { waitUntil: 'domcontentloaded' })
    const body = page.getByTestId('book-chapter-body')
    await expect(body).toHaveAttribute('lang', 'ar')
    await expect(body).toHaveAttribute('dir', 'rtl')
    await page.getByRole('tab', { name: 'highlights' }).click()
    const snippet = page.getByTestId('book-chapter-highlight-snippet').first()
    await expect(snippet).toHaveAttribute('lang', 'ar')
    await expect(snippet).toHaveAttribute('dir', 'rtl')
    await expect(snippet).toContainText('نص مميز')
  })

  test('chapter reflects updated book language after reload', async ({ page }) => {
    setE2eBookCreationLanguage(E2E_FREE_BOOK_ID, 'en')
    await page.goto(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('book-chapter-body')).toHaveAttribute('lang', 'en')
    setE2eBookCreationLanguage(E2E_FREE_BOOK_ID, 'he')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('book-chapter-body')).toHaveAttribute('lang', 'he')
    await expect(page.getByTestId('book-chapter-body')).toHaveAttribute('dir', 'rtl')
  })
})
