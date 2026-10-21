import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'

test.describe('Book builder publish', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('publish book button visible on builder', async ({ page }) => {
    await page.goto('/books/bb000000-0000-0000-0000-000000000099/builder')
    await expect(page.getByRole('button', { name: 'Publish book' })).toBeVisible()
  })
})
