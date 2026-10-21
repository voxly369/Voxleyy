import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  resetBookBuilderMocks,
  READER,
} from './fixtures.ts'
import {
  E2E_FREE_BOOK_ID,
  E2E_FREE_CHAPTER_ID,
  E2E_PAID_BOOK_ID,
} from './bookBuilderMocks.ts'

test.describe('Book builder 11A', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('create type picker opens book flow', async ({ page }) => {
    await page.goto('/create')
    await page.getByRole('button', { name: 'Book' }).click()
    await expect(page).toHaveURL(/\/books\/new/)
  })

  test('claims a free book and shows it in library books tab', async ({ page }) => {
    await page.goto(`/books/${E2E_FREE_BOOK_ID}`)
    await expect(page.getByTestId('book-page')).toBeVisible()
    await page.getByRole('button', { name: 'Add to library' }).click()
    await page.goto('/library?tab=books')
    await expect(page.getByText('Free smoke book')).toBeVisible()
  })

  test('paid unlisted book shows disabled buy button', async ({ page }) => {
    await page.goto(`/books/${E2E_PAID_BOOK_ID}`)
    await expect(page.getByText(/unlisted/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Buy for/i })).toBeDisabled()
  })

  test('opens chapter reader for free book', async ({ page }) => {
    await page.goto(`/books/${E2E_FREE_BOOK_ID}`)
    await page.getByRole('button', { name: 'First chapter' }).click()
    await expect(page).toHaveURL(new RegExp(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`))
    await expect(page.getByRole('heading', { name: 'First chapter' })).toBeVisible()
  })

  test('author book builder lists chapters', async ({ page }) => {
    await page.goto('/books/bb000000-0000-0000-0000-000000000099/builder')
    await expect(page.getByRole('heading', { name: 'Book builder' })).toBeVisible()
    await expect(page.getByText('Reader draft book')).toBeVisible()
  })
})

test('book routes are in SPA shell', async ({ page }) => {
  resetBookBuilderMocks()
  await seedSignedInSession(page)
  await installSupabaseMocks(page)
  await page.goto(`/books/${E2E_FREE_BOOK_ID}`)
  await expect(page.locator('#root')).not.toBeEmpty()
  await expect(page.getByTestId('book-page')).toBeVisible()
})
