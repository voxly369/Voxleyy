import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'

const AUTHOR_BOOK = '/books/bb000000-0000-0000-0000-000000000099'

test.describe('Book builder publish and TOC', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('preview lists chapter table of contents before publish', async ({ page }) => {
    await page.goto(`${AUTHOR_BOOK}/preview`)
    await expect(page.getByTestId('book-preview-page')).toBeVisible()
    await expect(page.getByRole('link', { name: /Draft chapter A/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Draft chapter B/i })).toBeVisible()
  })

  test('builder publish section reflects book status', async ({ page }) => {
    await page.goto(`${AUTHOR_BOOK}/builder`)
    await expect(page.getByRole('heading', { name: 'Publishing' })).toBeVisible()
    await expect(page.getByText(/Status: draft/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Publish book' })).toBeVisible()
  })
})
