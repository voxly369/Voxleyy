import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'

test.describe('Book drafts on profile', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('profile drafts panel shows books group', async ({ page }) => {
    await page.goto('/u/readerone?tab=drafts')
    await expect(page.getByTestId('drafts-books-group')).toBeVisible()
  })
})
