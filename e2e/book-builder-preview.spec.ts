import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'

test.describe('Book builder preview', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('author preview shows banner and toc', async ({ page }) => {
    await page.goto('/books/bb000000-0000-0000-0000-000000000099/preview')
    await expect(page.getByTestId('preview-banner')).toBeVisible()
    await expect(page.getByTestId('book-preview-page')).toBeVisible()
  })
})
