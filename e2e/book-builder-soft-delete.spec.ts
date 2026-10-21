import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  resetBookBuilderMocks,
  resetAuthorDraftBookRemoved,
} from './fixtures.ts'

const AUTHOR_BOOK = '/books/bb000000-0000-0000-0000-000000000099/builder'
const AUTHOR_BOOK_PUBLIC = '/books/bb000000-0000-0000-0000-000000000099'

test.describe('Book builder soft delete', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    resetAuthorDraftBookRemoved()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('soft-deletes book from confirm modal and hides drafts and public page', async ({ page }) => {
    await page.goto(AUTHOR_BOOK)
    await page.getByRole('button', { name: 'Delete book' }).click()
    await expect(page.getByText('Delete this book?')).toBeVisible()
    await page.getByRole('button', { name: 'Delete book' }).last().click()
    await expect(page).toHaveURL(/\/profile/)
    await page.goto('/u/readerone?tab=drafts')
    await expect(page.getByText('Reader draft book')).toBeHidden()
    await page.goto(AUTHOR_BOOK_PUBLIC)
    await expect(page.getByTestId('book-page')).toBeHidden()
  })
})
